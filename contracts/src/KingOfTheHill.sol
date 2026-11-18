// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title KingOfTheHill (Tính năng 90 + 91 + 92)
/// @notice 90. Ngôi vị "Vua tiết kiệm": ai stake nhiều hơn ngườ đưng đầu + margin sẽ soán ngôi.
///         91. Vua kỳ được chia phần từ pool giải: settle mỗi kỳ trả cho vua của kỳ vừa kết thúc.
///         92. Lật đổ thành công nhận ngay một phần thưởng "cờ đổ" từ pool.
/// @dev Stake của vua bị trừ (khóa) cho tới khi bị lật đổ hoặc tự xuống ngôi.
contract KingOfTheHill is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    address public king;
    uint256 public kingStake;
    uint256 public overthrowMarginBps = 1_000; // phải stake hơn 10%
    uint256 public usurpRewardBps = 500; // 5% pool cho kẻ lật đổ (Tính năng 92)
    uint256 public kingEpochRewardBps = 2_000; // 20% pool mỗi kỳ cho vua (Tính năng 91)

    uint256 public prizePool;
    mapping(address => uint256) public totalUsurped; // thống kê

    event Crowned(address indexed newKing, uint256 stake, address indexed oldKing, uint256 refund);
    event KingRewarded(address indexed king, uint256 epoch, uint256 reward);
    event Usurped(address indexed usurper, uint256 reward);
    event Abdicated(address indexed exKing, uint256 refund);
    event PoolFunded(address indexed funder, uint256 amount);

    error NotStarted();
    error StakeTooSmall(uint256 needed);

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    function fundPool(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        prizePool += amount;
        emit PoolFunded(msg.sender, amount);
    }

    function setRules(uint256 marginBps, uint256 usurpBps, uint256 kingRewardBps) external onlyOwner {
        overthrowMarginBps = marginBps;
        usurpRewardBps = usurpBps;
        kingEpochRewardBps = kingRewardBps;
    }

    /// @notice Tính năng 90: soán ngôi bằng cách stake vượt ngườ đưng đầu.
    /// @dev Tính năng 92: kẻ lật đổ nhận ngay usurpRewardBps% pool (tối đa stake cũ).
    function claimThrone(uint256 stake) external nonReentrant {
        require(vault.hasStarted(), "not started");
        uint256 needed = king == address(0) ? 1 : Math.mulDiv(kingStake, BPS + overthrowMarginBps, BPS);
        if (stake < needed) revert StakeTooSmall(needed);

        token.safeTransferFrom(msg.sender, address(this), stake);
        address oldKing = king;
        uint256 oldStake = kingStake;
        king = msg.sender;
        kingStake = stake;
        if (oldKing != address(0)) token.safeTransfer(oldKing, oldStake);

        // Tính năng 92: chỉ kẻ LẬT ĐỔ mới nhận thưởng (lên ngôi lần đầu không có phần thưởng này).
        if (oldKing != address(0) && prizePool > 0 && usurpRewardBps > 0) {
            uint256 reward = Math.mulDiv(prizePool, usurpRewardBps, BPS);
            if (reward > prizePool) reward = prizePool;
            prizePool -= reward;
            totalUsurped[msg.sender] += reward;
            token.safeTransfer(msg.sender, reward);
            emit Usurped(msg.sender, reward);
        }
        emit Crowned(msg.sender, stake, oldKing, oldStake);
    }

    /// @notice Tính năng 91: trả thưởng cho vua của kỳ vừa kết thúc (ai cũng gọi được, 1 lần/kỳ).
    /// @dev Đơn giản: chỉ kiểm tra kỳ đã kết thúc; mỗi kỳ trả tối đa một lần bằng epoch hiện tại - 1.
    uint256 public lastRewardedEpoch;

    function settleKingReward() external nonReentrant {
        require(vault.hasStarted(), "not started");
        uint256 epoch = vault.currentEpoch();
        if (epoch == 0 || epoch - 1 <= lastRewardedEpoch) revert NotStarted();
        if (king == address(0)) revert NotStarted();
        lastRewardedEpoch = epoch - 1;

        uint256 reward = Math.mulDiv(prizePool, kingEpochRewardBps, BPS);
        if (reward > prizePool) reward = prizePool;
        prizePool -= reward;
        token.safeTransfer(king, reward);
        emit KingRewarded(king, lastRewardedEpoch, reward);
    }

    /// @notice Tự xuống ngôi, nhận lại stake.
    function abdicate() external nonReentrant {
        if (msg.sender != king) revert NotStarted();
        uint256 refund = kingStake;
        king = address(0);
        kingStake = 0;
        token.safeTransfer(msg.sender, refund);
        emit Abdicated(msg.sender, refund);
    }
}
