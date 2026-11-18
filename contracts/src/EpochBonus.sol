// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title EpochBonus
/// @notice Tính năng 38 + 39: thưởng thức điểm danh thờ gửi trong kỳ.
///   38. Early bird: gửi trong khoảng đầu kỳ (0, earlyBirdSeconds] -> thưởng.
///   39. Last call: gửi trong khoảng cuối kỳ [epochDuration - lastCallSeconds, epochDuration) -> thưởng.
/// @dev Ngân sách thưởng do owner nạp; mỗi ví một lần mỗi loại mỗi kỳ.
contract EpochBonus is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public earlyBirdSeconds = 6 hours;
    uint256 public lastCallSeconds = 6 hours;
    uint256 public earlyBirdPrize = 0.5 * 1e6; // 0.5 mUSDC
    uint256 public lastCallPrize = 0.2 * 1e6; // 0.2 mUSDC

    /// @dev wallet -> epoch đã nhận earlyBird (+1).
    mapping(address => uint256) internal _earlyClaimed;
    /// @dev wallet -> epoch đã nhận lastCall (+1).
    mapping(address => uint256) internal _lastClaimed;

    event EarlyBirdPaid(address indexed wallet, uint256 indexed epoch, uint256 prize);
    event LastCallPaid(address indexed wallet, uint256 indexed epoch, uint256 prize);

    error NotInWindow();
    error AlreadyPaid();
    error NoBudget();
    error NoDepositThisEpoch();

    constructor(IERC20 token_, IStreakVault vault_) Ownable(msg.sender) {
        token = token_;
        vault = vault_;
    }

    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function setParams(uint256 earlySecs, uint256 lastSecs, uint256 earlyPrize, uint256 lastPrize)
        external
        onlyOwner
    {
        earlyBirdSeconds = earlySecs;
        lastCallSeconds = lastSecs;
        earlyBirdPrize = earlyPrize;
        lastCallPrize = lastPrize;
    }

    modifier requiresDepositThisEpoch(address wallet) {
        if (vault.getAccount(wallet).currentDeposited == 0) revert NoDepositThisEpoch();
        _;
    }

    /// @notice Tính năng 38: nhận thưởng early bird (phải đã gửi trong khoảng đầu kỳ).
    function claimEarlyBird() external nonReentrant requiresDepositThisEpoch(msg.sender) {
        require(vault.hasStarted(), "not started");
        uint256 epoch = vault.currentEpoch();
        if (_earlyClaimed[msg.sender] == epoch + 1) revert AlreadyPaid();
        uint256 elapsed = block.timestamp - vault.epochStart(epoch);
        if (elapsed > earlyBirdSeconds) revert NotInWindow();
        if (earlyBirdPrize > 0 && token.balanceOf(address(this)) < earlyBirdPrize) revert NoBudget();

        _earlyClaimed[msg.sender] = epoch + 1;
        if (earlyBirdPrize > 0) token.safeTransfer(msg.sender, earlyBirdPrize);
        emit EarlyBirdPaid(msg.sender, epoch, earlyBirdPrize);
    }

    /// @notice Tính năng 39: nhận thưởng last call (phải đã gửi trong khoảng cuối kỳ).
    function claimLastCall() external nonReentrant requiresDepositThisEpoch(msg.sender) {
        require(vault.hasStarted(), "not started");
        uint256 epoch = vault.currentEpoch();
        if (_lastClaimed[msg.sender] == epoch + 1) revert AlreadyPaid();
        uint256 remaining = vault.epochEnd(epoch) - block.timestamp;
        if (remaining > lastCallSeconds) revert NotInWindow();
        if (lastCallPrize > 0 && token.balanceOf(address(this)) < lastCallPrize) revert NoBudget();

        _lastClaimed[msg.sender] = epoch + 1;
        if (lastCallPrize > 0) token.safeTransfer(msg.sender, lastCallPrize);
        emit LastCallPaid(msg.sender, epoch, lastCallPrize);
    }

    function earlyClaimedEpoch(address wallet) external view returns (uint256) {
        uint256 raw = _earlyClaimed[wallet];
        return raw == 0 ? type(uint256).max : raw - 1;
    }

    function lastClaimedEpoch(address wallet) external view returns (uint256) {
        uint256 raw = _lastClaimed[wallet];
        return raw == 0 ? type(uint256).max : raw - 1;
    }
}
