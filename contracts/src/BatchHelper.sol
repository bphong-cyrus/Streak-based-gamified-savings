// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {YieldDistributor} from "./YieldDistributor.sol";
import {LuckyWheel} from "./LuckyWheel.sol";
import {BattlePass} from "./BattlePass.sol";

/// @title BatchHelper (Tính năng 36 + 37 + 38)
/// @notice 36. Batch giao dịch: nhiều thao tác trong một tx (rẻ gas, UX gọn).
///         37. Rate limit: giới hạn số lệnh batch mỗi kỳ chống spam.
///         38. Allowlist: chế độ chỉ ví đăng ký mới dùng được (demo kiểm soát).
contract BatchHelper is ReentrancyGuard {
    using SafeERC20 for IERC20;
    IStreakVault public immutable vault;
    YieldDistributor public immutable distributor;

    uint256 public maxBatchesPerEpoch = 5;
    bool public allowlistEnabled;
    mapping(address => bool) public allowed;

    /// @dev wallet -> epoch đã dùng bao nhiêu lần batch (+1).
    mapping(address => uint256) internal _batchUsedEpoch;
    mapping(address => uint256) internal _batchCount;

    event AllowlistEnabled(bool enabled);
    event AllowedSet(address indexed wallet, bool allowed);

    error NotAllowed();
    error BatchLimitReached();

    constructor(IStreakVault vault_, YieldDistributor distributor_) {
        vault = vault_;
        distributor = distributor_;
    }

    // --- Tính năng 38: allowlist ---
    function setAllowlistEnabled(bool on) external {
        allowlistEnabled = on;
        emit AllowlistEnabled(on);
    }

    function setAllowed(address wallet, bool on) external {
        allowed[wallet] = on;
        emit AllowedSet(wallet, on);
    }

    modifier gated() {
        if (allowlistEnabled && !allowed[msg.sender]) revert NotAllowed();
        _;
    }

    // --- Tính năng 37: rate limit ---
    function _consumeBatch() internal {
        uint256 epoch = vault.hasStarted() ? vault.currentEpoch() : 0;
        if (_batchUsedEpoch[msg.sender] != epoch + 1) {
            _batchUsedEpoch[msg.sender] = epoch + 1;
            _batchCount[msg.sender] = 0;
        }
        _batchCount[msg.sender] += 1;
        if (_batchCount[msg.sender] > maxBatchesPerEpoch) revert BatchLimitReached();
    }

    /// @notice Tính năng 36: gửi tiền + đặt mục tiêu cho chính msg.sender trong một tx batch.
    /// @dev Ví cần approve token cho BatchHelper (batch kéo token rồi gửi hộ).
    ///      Vault phải cấp quyền operator cho BatchHelper để đặt mục tiêu hộ.
    function batchDepositWithTarget(uint256 depositAmount, uint256 target) external gated nonReentrant {
        _consumeBatch();
        IERC20 token = IERC20(vault.token());
        token.safeTransferFrom(msg.sender, address(this), depositAmount);
        if (target > 0) vault.setWeeklyTargetFor(msg.sender, target);
        token.approve(address(vault), depositAmount);
        vault.depositFor(msg.sender, depositAmount);
    }

    /// @notice Claim thưởng + tự quay vòng quay trong một tx.
    function batchClaimAndSpin(LuckyWheel wheel, uint256 epoch) external gated nonReentrant {
        _consumeBatch();
        distributor.claimYield();
        wheel.spin(epoch);
    }

    /// @notice Claim + check-in battle pass.
    function batchClaimAndCheckIn(BattlePass pass) external gated nonReentrant {
        _consumeBatch();
        distributor.claimYield();
        pass.checkIn();
    }
}
