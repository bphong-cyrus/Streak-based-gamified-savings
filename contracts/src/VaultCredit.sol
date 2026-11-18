// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title VaultCredit (Tính năng 111 + 112 + 113)
/// @notice 111. Điểm tín dụng nội bộ: streak dài -> được vay tạm mUSDC không cần thế chấp ngoài.
///         112. Hạn mức tín dụng = streak * perStreakLimit, giảm khi streak mất.
///         113. Trừ nợ tự động: yield sắp claim của ví bị khấu trừ trước khi giải ngân.
/// @dev Nguồn vay là pool owner nạp (tín dụng nội bộ, demo). Kỳ hạn trả = 1 kỳ vault.
contract VaultCredit is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public perStreakLimit = 1 * 1e6; // 1 mUSDC mỗi streak
    uint256 public lendingPool;
    uint256 public totalBorrowed;

    struct Loan {
        uint256 amount;
        uint256 borrowEpoch;
        bool repaid;
    }

    mapping(address => Loan) public loans; // 1 khoản vay tại một thờ điểm
    mapping(address => uint256) public totalRepaid;

    event Borrowed(address indexed wallet, uint256 amount, uint256 streak);
    event Repaid(address indexed wallet, uint256 amount);
    event YieldAttached(address indexed wallet, uint256 amount, uint256 remainingDebt);
    event PoolFunded(address indexed funder, uint256 amount);

    error NoStreak();
    error LimitExceeded();
    error ActiveLoan();
    error NoLoan();
    error NotDue();
    error BadAmount();

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    function fundPool(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        lendingPool += amount;
        emit PoolFunded(msg.sender, amount);
    }

    function setPerStreakLimit(uint256 limit) external onlyOwner {
        perStreakLimit = limit;
    }

    function creditLimit(address wallet) public view returns (uint256) {
        uint256 streak = vault.getAccount(wallet).streak;
        return streak * perStreakLimit;
    }

    /// @notice Tính năng 111 + 112: vay tới hạn mức theo streak, kỳ hạn 1 kỳ vault.
    function borrow(uint256 amount) external nonReentrant {
        require(vault.hasStarted(), "not started");
        uint256 streak = vault.getAccount(msg.sender).streak;
        if (streak == 0) revert NoStreak();
        uint256 limit = creditLimit(msg.sender);
        if (amount > limit) revert LimitExceeded();
        if (amount > lendingPool) revert LimitExceeded();
        if (loans[msg.sender].amount > 0) revert ActiveLoan();
        lendingPool -= amount;
        totalBorrowed += amount;
        loans[msg.sender] = Loan({amount: amount, borrowEpoch: vault.currentEpoch(), repaid: false});
        token.safeTransfer(msg.sender, amount);
        emit Borrowed(msg.sender, amount, streak);
    }

    /// @notice Trả nợ bằng tay.
    function repay() external nonReentrant {
        Loan storage l = loans[msg.sender];
        if (l.amount == 0) revert NoLoan();
        token.safeTransferFrom(msg.sender, address(this), l.amount);
        _clearLoan(msg.sender);
        emit Repaid(msg.sender, l.amount);
    }

    /// @notice Tính năng 113: dùng yield sắp claim để trừ nợ (gọi sau khi vault chốt, trước claim).
    /// @dev Kéo thưởng từ ngườ chơi đã claim về tay mình rồi khấu trừ — flow hợp lệ nhất là
    ///      ngườ chơi approve cho contract và tự gọi attachYield sau khi claimYield.
    ///      Ở đây đơn giản: ngườ chơi approve `amount`, contract kéo tiền trả nợ.
    function repayFromWallet(uint256 amount) external nonReentrant {
        Loan storage l = loans[msg.sender];
        if (l.amount == 0) revert NoLoan();
        if (amount == 0 || amount > l.amount) revert BadAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        lendingPool += amount;
        totalBorrowed -= amount;
        totalRepaid[msg.sender] += amount;
        l.amount -= amount;
        if (l.amount == 0) l.repaid = true;
        emit YieldAttached(msg.sender, amount, l.amount);
    }

    function _clearLoan(address wallet) internal {
        Loan storage l = loans[wallet];
        lendingPool += l.amount;
        totalBorrowed -= l.amount;
        totalRepaid[wallet] += l.amount;
        l.amount = 0;
        l.repaid = true;
    }
}
