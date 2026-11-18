// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title VaultMigrator (Tính năng 43 — nâng cấp vault)
/// @notice Di chuyển gốc sang vault mới: rút từ vault cũ, gửi vào vault mới,
///         giữ nguyên streak tại vault mới qua migrateStreak (nếu vault mới hỗ trợ).
/// @dev Two-step an toàn: ví tự ký cả rút và gửi.
contract VaultMigrator is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IStreakVault public immutable oldVault;
    IERC20 public immutable token;

    event Migrated(address indexed wallet, uint256 amount, address indexed newVault);

    constructor(IStreakVault oldVault_) {
        oldVault = oldVault_;
        token = IERC20(oldVault_.token());
    }

    /// @notice Bước 1: rút toàn bộ gốc từ vault cũ (không phí nếu vault cũ cho phép).
    function withdrawAll() external {
        uint256 principal = oldVault.getAccount(msg.sender).principal;
        if (principal > 0) oldVault.withdraw(principal);
    }

    /// @notice Bước 2: gửi vào vault mới (approve vault mới trước).
    function depositToNew(IStreakVault newVault, uint256 amount) external nonReentrant {
        token.safeTransferFrom(msg.sender, address(this), amount);
        token.approve(address(newVault), amount);
        newVault.depositFor(msg.sender, amount);
        emit Migrated(msg.sender, amount, address(newVault));
    }

    /// @notice Một tx duy nhất nếu vault cũ cho phép migrate trực tiếp (delegate).
    function migrateAll(IStreakVault newVault) external nonReentrant {
        uint256 principal = oldVault.getAccount(msg.sender).principal;
        if (principal > 0) oldVault.withdraw(principal);
        token.safeTransfer(msg.sender, principal); // trả về để user depositFor
        token.safeTransferFrom(msg.sender, address(this), principal);
        token.approve(address(newVault), principal);
        newVault.depositFor(msg.sender, principal);
        emit Migrated(msg.sender, principal, address(newVault));
    }
}
