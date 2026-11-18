// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title SavingsGoal
/// @notice Mục tiêu tiết kiệm dài hạn: ví đặt target + deadline (theo epoch),
///         gốc trong vault >= target trước deadline thì đạt (ghi nhận sự kiện).
/// @dev Không khóa tiền — ví vẫn rút được bình thường (đặc tả cho phép rút gốc bất kỳ lúc nào).
contract SavingsGoal {
    struct Goal {
        uint256 targetAmount;
        uint256 deadlineEpoch; // phải đạt trước khi kỳ này bắt đầu
        bool reached;
        bool active;
    }

    IStreakVault public immutable vault;

    mapping(address => Goal) public goals;

    event GoalSet(address indexed wallet, uint256 targetAmount, uint256 deadlineEpoch);
    event GoalReached(address indexed wallet, uint256 principalAtReach);

    error GoalNotActive();
    error GoalAlreadySet();
    error ZeroAmount();

    constructor(IStreakVault vault_) {
        vault = vault_;
    }

    function setGoal(uint256 targetAmount, uint256 deadlineEpoch) external {
        if (targetAmount == 0) revert ZeroAmount();
        Goal storage g = goals[msg.sender];
        if (g.active && !g.reached) revert GoalAlreadySet();
        g.targetAmount = targetAmount;
        g.deadlineEpoch = deadlineEpoch;
        g.reached = false;
        g.active = true;
        emit GoalSet(msg.sender, targetAmount, deadlineEpoch);
    }

    function cancelGoal() external {
        Goal storage g = goals[msg.sender];
        if (!g.active) revert GoalNotActive();
        g.active = false;
    }

    /// @notice Kiểm tra và ghi nhận đạt mục tiêu (ai cũng gọi được — thường là chính chủ/bot).
    function checkReached() external returns (bool) {
        Goal storage g = goals[msg.sender];
        if (!g.active || g.reached) revert GoalNotActive();
        uint256 epoch = vault.hasStarted() ? vault.currentEpoch() : 0;
        if (epoch >= g.deadlineEpoch) revert GoalNotActive(); // hết hạn
        uint256 principal = vault.getAccount(msg.sender).principal;
        if (principal < g.targetAmount) revert GoalNotActive();
        g.reached = true;
        emit GoalReached(msg.sender, principal);
        return true;
    }

    function statusOf(address wallet)
        external
        view
        returns (uint256 targetAmount, uint256 deadlineEpoch, uint256 progress, bool reached, bool active)
    {
        Goal storage g = goals[wallet];
        return (
            g.targetAmount,
            g.deadlineEpoch,
            vault.getAccount(wallet).principal,
            g.reached,
            g.active
        );
    }
}
