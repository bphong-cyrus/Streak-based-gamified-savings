// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Gems} from "./Gems.sol";

/// @title GemStaking (Tính năng 99 + 100 + 101)
/// @notice 99. Stake Gems nhận quyền biểu quyết (sGems nội bộ, trọng số = số Gems stake).
///         100. Bỏ phiếu đề xuất thay đổi tham số (text key + uint value) đa số đơn giản.
///         101. Staking nhận thưởng: mỗi epoch dài `rewardEpochDuration` giây trả rate trên tổng stake.
/// @dev Thưởng là Gems mới mint qua MINTER_ROLE owner cấp cho contract.
contract GemStaking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    Gems public immutable gems;

    uint256 public rewardEpochDuration = 7 days;
    uint256 public rewardPerEpoch = 100 * 1e18; // 100 Gems/epoch chia cho staker

    mapping(address => uint256) public staked;
    uint256 public totalStaked;
    mapping(address => uint256) internal _rewardDebtEpoch; // epoch đã tính thưởng tới
    mapping(address => uint256) public pendingReward;

    // ---------------- Governance (Tính năng 100) ----------------
    struct Proposal {
        uint256 id;
        string key; // vd "withdrawFeeBps", "epochSeconds"...
        uint256 value;
        uint256 yes;
        uint256 no;
        uint256 deadline;
        bool executed;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public voted;

    event Staked(address indexed wallet, uint256 amount);
    event Unstaked(address indexed wallet, uint256 amount);
    event RewardPaid(address indexed wallet, uint256 amount);
    event ProposalCreated(uint256 indexed id, string key, uint256 value, uint256 deadline);
    event Voted(uint256 indexed id, address indexed wallet, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id, bool passed);

    error BadAmount();
    error NoStake();
    error BadProposal();
    error AlreadyVoted();
    error VotingClosed();

    constructor(Gems gems_) Ownable(msg.sender) {
        gems = gems_;
    }

    function setRewards(uint256 duration, uint256 perEpoch) external onlyOwner {
        rewardEpochDuration = duration;
        rewardPerEpoch = perEpoch;
    }

    /// @notice Tính năng 99: stake Gems, bắt đầu tích thưởng.
    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert BadAmount();
        _settleReward(msg.sender);
        gems.transferFrom(msg.sender, address(this), amount);
        staked[msg.sender] += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0 || staked[msg.sender] < amount) revert BadAmount();
        _settleReward(msg.sender);
        staked[msg.sender] -= amount;
        totalStaked -= amount;
        gems.transfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    /// @notice Tính năng 101: cập nhật thưởng staking theo epoch thờ gian.
    function _settleReward(address wallet) internal {
        uint256 epoch = block.timestamp / rewardEpochDuration;
        uint256 from = _rewardDebtEpoch[wallet];
        if (from == 0) {
            _rewardDebtEpoch[wallet] = epoch; // bắt đầu tính từ lần đầu tương tác
            return;
        }
        if (from == epoch) return;
        _rewardDebtEpoch[wallet] = epoch;
        if (totalStaked == 0) return;
        uint256 missed = epoch - from;
        uint256 reward = (rewardPerEpoch * staked[wallet] * missed) / totalStaked;
        pendingReward[wallet] += reward;
    }

    function claimReward() external nonReentrant {
        _settleReward(msg.sender);
        uint256 reward = pendingReward[msg.sender];
        if (reward == 0) revert NoStake();
        pendingReward[msg.sender] = 0;
        gems.mint(msg.sender, reward); // Tính năng 101: mint thưởng staking
        emit RewardPaid(msg.sender, reward);
    }

    // ---------------- Governance ----------------

    /// @notice Tính năng 100: tạo đề xuất (chỉ ngườ stake).
    function propose(string memory key, uint256 value, uint256 votingDuration) external returns (uint256 id) {
        if (staked[msg.sender] == 0) revert NoStake();
        if (votingDuration == 0) revert BadProposal();
        id = ++proposalCount;
        proposals[id] = Proposal({
            id: id,
            key: key,
            value: value,
            yes: 0,
            no: 0,
            deadline: block.timestamp + votingDuration,
            executed: false
        });
        emit ProposalCreated(id, key, value, block.timestamp + votingDuration);
    }

    /// @notice Bỏ phiếu theo trọng số Gems đang stake.
    function vote(uint256 id, bool support) external {
        Proposal storage p = proposals[id];
        if (p.id == 0 || p.executed) revert BadProposal();
        if (block.timestamp >= p.deadline) revert VotingClosed();
        if (voted[id][msg.sender]) revert AlreadyVoted();
        if (staked[msg.sender] == 0) revert NoStake();
        voted[id][msg.sender] = true;
        if (support) p.yes += staked[msg.sender];
        else p.no += staked[msg.sender];
        emit Voted(id, msg.sender, support, staked[msg.sender]);
    }

    /// @notice Đóng đề xuất, trả kết quả đa số (gắn cờ on-chain cho owner áp dụng).
    function executeProposal(uint256 id) external {
        Proposal storage p = proposals[id];
        if (p.id == 0 || p.executed) revert BadProposal();
        if (block.timestamp < p.deadline) revert VotingClosed();
        p.executed = true;
        emit ProposalExecuted(id, p.yes > p.no);
    }
}
