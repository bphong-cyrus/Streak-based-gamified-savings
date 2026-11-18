// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title SpendingLimit (Tính năng 129 + 130)
/// @notice 129. Tự giới hạn rút mỗi kỳ: khi cần rút nhiều hơn hạn mức phải chờ thêm kỳ.
///         130. Nới hạn mức có trễ: đổi limit mới có hiệu lực sau `changeDelayEpochs` kỳ.
/// @dev Ví định khoản vào contract; rút trong hạn mức về ngay, vượt hạn mức báo lỗi.
///      Đây là công cụ chống chi tiêu bốc đồng (self-custody có kỷ luật).
contract SpendingLimit is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public changeDelayEpochs = 2; // Tính năng 130

    struct Limit {
        uint256 perEpoch; // 0 = không giới hạn
        uint256 pendingPerEpoch; // limit chờ áp dụng
        uint256 pendingEffectiveEpoch;
        uint256 withdrawnThisEpoch;
        uint256 trackedEpoch; // kỳ đang theo dõi (+1)
    }

    mapping(address => Limit) public limits;
    mapping(address => uint256) public balanceOf;

    event Deposited(address indexed wallet, uint256 amount);
    event Withdrawn(address indexed wallet, uint256 amount, uint256 epoch);
    event LimitSet(address indexed wallet, uint256 perEpoch, uint256 effectiveEpoch);

    error LimitExceeded(uint256 limit, uint256 used, uint256 requested);

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    function setChangeDelay(uint256 delayEpochs) external onlyOwner {
        changeDelayEpochs = delayEpochs;
    }

    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert LimitExceeded(0, 0, amount);
        token.safeTransferFrom(msg.sender, address(this), amount);
        balanceOf[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Tính năng 129 + 130: đặt hạn mức mới, áp dụng sau `changeDelayEpochs` kỳ.
    function setLimit(uint256 perEpoch) external {
        require(vault.hasStarted(), "not started");
        uint256 effective = vault.currentEpoch() + changeDelayEpochs;
        Limit storage l = limits[msg.sender];
        l.pendingPerEpoch = perEpoch;
        l.pendingEffectiveEpoch = effective;
        emit LimitSet(msg.sender, perEpoch, effective);
    }

    /// @notice Rút về ví trong hạn mức kỳ hiện tại.
    function withdraw(uint256 amount) external nonReentrant {
        require(vault.hasStarted(), "not started");
        if (amount == 0 || balanceOf[msg.sender] < amount) revert LimitExceeded(0, 0, amount);

        uint256 epoch = vault.currentEpoch();
        Limit storage l = limits[msg.sender];

        // Áp dụng limit chờ đến hạn (Tính năng 130)
        if (l.pendingEffectiveEpoch != 0 && epoch >= l.pendingEffectiveEpoch) {
            l.perEpoch = l.pendingPerEpoch;
            l.pendingEffectiveEpoch = 0;
        }
        if (l.trackedEpoch != epoch + 1) {
            l.trackedEpoch = epoch + 1;
            l.withdrawnThisEpoch = 0;
        }

        // Tính năng 129: chặn rút vượt hạn mức kỳ
        if (l.perEpoch > 0 && l.withdrawnThisEpoch + amount > l.perEpoch) {
            revert LimitExceeded(l.perEpoch, l.withdrawnThisEpoch, amount);
        }
        l.withdrawnThisEpoch += amount;
        balanceOf[msg.sender] -= amount;
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, epoch);
    }
}
