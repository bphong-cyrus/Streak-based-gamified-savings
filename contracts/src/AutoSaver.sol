// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title AutoSaver
/// @notice Auto-saving: ví đăng ký mức gửi định kỳ (tùy chọn round-up),
///         bot/gas-relayer gọi `execute` mỗi kỳ để gửi hộ qua vault.depositFor.
/// @dev Ngườ dùng approve AutoSaver một lần; execute ai cũng gọi được.
contract AutoSaver is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct AutoPlan {
        uint256 amount; // mức gửi cơ bản mỗi kỳ (đơn vị nhỏ nhất)
        uint256 roundUpTo; // 0 = tắt; >0 = làm tròn amount lên bội số này
        uint256 lastExecutedEpoch; // kỳ đã chạy gần nhất
        bool active;
    }

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    mapping(address => AutoPlan) public plans;

    event PlanRegistered(address indexed wallet, uint256 amount, uint256 roundUpTo);
    event PlanUpdated(address indexed wallet, uint256 amount, uint256 roundUpTo);
    event PlanDeactivated(address indexed wallet);
    event AutoSaved(address indexed wallet, uint256 indexed epoch, uint256 amount);

    error ZeroAmount();
    error PlanNotActive();
    error AlreadyExecuted(uint256 epoch);
    error RoundUpTooLarge();

    constructor(IStreakVault vault_, IERC20 token_) {
        vault = vault_;
        token = token_;
    }

    /// @notice Đăng ký/chỉnh gói auto-save. Ví cần approve token cho AutoSaver.
    function register(uint256 amount, uint256 roundUpTo) external {
        if (amount == 0) revert ZeroAmount();
        if (roundUpTo > 0 && roundUpTo < 1e4) revert RoundUpTooLarge(); // tránh dust spam
        AutoPlan storage p = plans[msg.sender];
        bool isNew = !p.active;
        p.amount = amount;
        p.roundUpTo = roundUpTo;
        p.active = true;
        if (isNew) {
            p.lastExecutedEpoch = type(uint256).max; // chưa chạy kỳ nào
            emit PlanRegistered(msg.sender, amount, roundUpTo);
        } else {
            emit PlanUpdated(msg.sender, amount, roundUpTo);
        }
    }

    function deactivate() external {
        plans[msg.sender].active = false;
        emit PlanDeactivated(msg.sender);
    }

    /// @notice Thực thi auto-save cho `wallet` trong kỳ hiện tại. Gọi bởi bot hoặc chính chủ.
    function execute(address wallet) external nonReentrant {
        AutoPlan storage p = plans[wallet];
        if (!p.active) revert PlanNotActive();
        uint256 epoch = vault.currentEpoch();
        if (!vault.hasStarted()) revert ZeroAmount();
        if (p.lastExecutedEpoch == epoch) revert AlreadyExecuted(epoch);

        uint256 amount = _rounded(p.amount, p.roundUpTo);
        p.lastExecutedEpoch = epoch;

        token.safeTransferFrom(wallet, address(this), amount);
        token.approve(address(vault), amount);
        vault.depositFor(wallet, amount);
        emit AutoSaved(wallet, epoch, amount);
    }

    /// @dev Làm tròn lên bội số roundUpTo (round-up savings).
    function _rounded(uint256 amount, uint256 unit) internal pure returns (uint256) {
        if (unit == 0) return amount;
        return ((amount + unit - 1) / unit) * unit;
    }

    function previewAmount(address wallet) external view returns (uint256) {
        AutoPlan storage p = plans[wallet];
        return _rounded(p.amount, p.roundUpTo);
    }

    function executable(address wallet) external view returns (bool) {
        AutoPlan storage p = plans[wallet];
        return p.active && vault.hasStarted() && p.lastExecutedEpoch != vault.currentEpoch();
    }
}
