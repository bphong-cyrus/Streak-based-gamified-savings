// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title FaucetDrip (Tính năng 117 + 118 + 119)
/// @notice 117. Vòi nước mUSDC cho ngườ mới: ví chưa kích hoạt vault nhận một ít để bắt đầu.
///         118. Giới hạn 1 lần duy nhất mỗi ví (không thể nhận lại).
///         119. Giới hạn tốc độ toàn cục: tổng drip mỗi kỳ không quá cap (chống cày airdrop).
/// @dev Pool do owner nạp; drip kích hoạt vault luôn (đặt mục tiêu mặc định) để onboarding trơn.
contract FaucetDrip is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public dripAmount = 5 * 1e6; // 5 mUSDC
    uint256 public dripEpochCap = 100 * 1e6; // tối đa 100 mUSDC/kỳ
    uint256 public defaultTarget = 2 * 1e6; // mục tiêu gợi ý kỳ đầu

    mapping(address => bool) public hasDripped; // Tính năng 118
    mapping(uint256 => uint256) public drippedInEpoch; // Tính năng 119
    uint256 public totalDripped;

    event Dripped(address indexed wallet, uint256 amount, uint256 epoch);

    error AlreadyDripped();
    error EpochCapReached();
    error NotActivatedAlready();

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    function setParams(uint256 amount, uint256 cap, uint256 target) external onlyOwner {
        dripAmount = amount;
        dripEpochCap = cap;
        defaultTarget = target;
    }

    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Tính năng 117 + 118 + 119: nhận drip một lần duy nhất, kèm kích hoạt mục tiêu đầu.
    /// @dev Ví phải chưa từng kích hoạt vault; drip trả đủ đủ để gửi mục tiêu kỳ đầu.
    function drip() external nonReentrant {
        if (hasDripped[msg.sender]) revert AlreadyDripped();
        if (!vault.hasStarted()) revert NotActivatedAlready();
        uint256 epoch = vault.currentEpoch();
        if (drippedInEpoch[epoch] + dripAmount > dripEpochCap) revert EpochCapReached();

        hasDripped[msg.sender] = true;
        drippedInEpoch[epoch] += dripAmount;
        totalDripped += dripAmount;

        uint256 amount = dripAmount;
        token.approve(address(vault), amount);
        vault.setWeeklyTargetFor(msg.sender, defaultTarget);
        vault.depositFor(msg.sender, amount);
        emit Dripped(msg.sender, amount, epoch);
    }
}
