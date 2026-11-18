// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Gems} from "./Gems.sol";

/// @title TreasuryDividend (Tính năng 102 + 103 + 104)
/// @notice 102. Chia doanh thu (phí thu về treasury) cho ngườ stake Gems.
///         103. Cổ tức claim theo kỳ: mỗi epoch phân bổ một pool, claim sau không mất.
///         104. Tỷ lệ theo snapshot stake tại đầu kỳ (checkpoint khi distribute).
/// @dev Độc lập với GemStaking: stake Gems tại đây để nhận quyền cổ tức mUSDC.
contract TreasuryDividend is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    Gems public immutable gems;
    IERC20 public immutable token; // mUSDC cổ tức

    uint256 public epochDuration = 7 days;

    mapping(address => uint256) public stakeOf;
    uint256 public totalStake;

    uint256 public currentEpoch; // epoch cổ tức (không gắn vault)
    mapping(uint256 => uint256) public epochPool;
    mapping(uint256 => uint256) public epochTotalStake; // snapshot (Tính năng 104)
    mapping(uint256 => mapping(address => uint256)) public claimedOf;

    event Staked(address indexed wallet, uint256 amount);
    event Unstaked(address indexed wallet, uint256 amount);
    event Distributed(uint256 indexed epoch, uint256 amount, uint256 totalStake);
    event DividendClaimed(address indexed wallet, uint256 epoch, uint256 amount);

    error BadAmount();
    error NothingToClaim();
    error AlreadyClaimed();

    constructor(Gems gems_, IERC20 token_) Ownable(msg.sender) {
        gems = gems_;
        token = token_;
    }

    function setEpochDuration(uint256 d) external onlyOwner {
        epochDuration = d;
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert BadAmount();
        gems.transferFrom(msg.sender, address(this), amount);
        stakeOf[msg.sender] += amount;
        totalStake += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0 || stakeOf[msg.sender] < amount) revert BadAmount();
        stakeOf[msg.sender] -= amount;
        totalStake -= amount;
        gems.transfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    /// @notice Tính năng 102 + 104: nạp cổ tức kỳ mới, chụp snapshot tổng stake.
    /// @dev Chuyển kỳ: mỗi lần gọi là một kỳ mới; pool kỳ trước chưa claim vẫn giữ nguyên.
    function distribute(uint256 amount) external onlyOwner {
        require(amount > 0, "zero");
        token.safeTransferFrom(msg.sender, address(this), amount);
        epochPool[currentEpoch] += amount;
        epochTotalStake[currentEpoch] = totalStake;
        emit Distributed(currentEpoch, amount, totalStake);
        currentEpoch += 1; // kỳ kế tiếp bắt đầu
    }

    /// @notice Tính năng 103: claim cổ tức kỳ `epoch` theo snapshot tại đầu kỳ.
    function claim(uint256 epoch) external nonReentrant {
        if (claimedOf[epoch][msg.sender] != 0) revert AlreadyClaimed();
        uint256 snapshot = epochTotalStake[epoch];
        if (snapshot == 0) revert NothingToClaim();
        uint256 share = Math.mulDiv(epochPool[epoch], stakeOf[msg.sender], snapshot);
        if (share == 0) revert NothingToClaim();
        claimedOf[epoch][msg.sender] = share;
        token.safeTransfer(msg.sender, share);
        emit DividendClaimed(msg.sender, epoch, share);
    }
}
