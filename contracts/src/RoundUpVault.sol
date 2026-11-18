// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title RoundUpVault (Tính năng 50 — round-up từ chi tiêu)
/// @notice Gắn với "chi tiêu": khi ví ghi một khoản chi (spend),
///         hệ thống tự làm tròn phần gửi lên bội số roundUpTo và gửi phần chênh vào vault.
/// @dev Ví approve RoundUpVault; ai cũng có thể trigger roundupFor (bot).
contract RoundUpVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public roundUpTo = 1 * 1e6; // làm tròn lên 1 mUSDC
    bool public enabled = true;

    mapping(address => uint256) public totalRounded;

    event RoundedUp(address indexed wallet, uint256 indexed epoch, uint256 spend, uint256 roundedAmount);

    error ZeroSpend();
    error Disabled();

    constructor(IERC20 token_, IStreakVault vault_) {
        token = token_;
        vault = vault_;
    }

    function setRoundUpTo(uint256 unit) external {
        roundUpTo = unit;
    }

    function setEnabled(bool on) external {
        enabled = on;
    }

    /// @notice Bot/app gọi sau khi ví thực hiện chi tiêu `spend` (mUSDC).
    /// @dev Kéo phần chênh từ ví (đã approve) gửi hộ vào vault.
    function roundupFor(address wallet, uint256 spend) external nonReentrant {
        if (!enabled) revert Disabled();
        if (spend == 0) revert ZeroSpend();
        uint256 remainder = spend % roundUpTo;
        if (remainder == 0) return;
        uint256 extra = roundUpTo - remainder;

        totalRounded[wallet] += extra;
        token.safeTransferFrom(wallet, address(this), extra);
        token.approve(address(vault), extra);
        vault.depositFor(wallet, extra);
        emit RoundedUp(wallet, vault.hasStarted() ? vault.currentEpoch() : 0, spend, extra);
    }

    function previewRoundUp(uint256 spend) external view returns (uint256 extra) {
        uint256 remainder = spend % roundUpTo;
        extra = remainder == 0 ? 0 : roundUpTo - remainder;
    }
}
