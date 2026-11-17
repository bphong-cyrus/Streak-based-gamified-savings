// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IMockYieldSource} from "./interfaces/IMockYieldSource.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title MockYieldSource
/// @notice Nhận token tài trợ theo kỳ, giải ngân đúng một lần cho distributor khi chốt kỳ.
contract MockYieldSource is IMockYieldSource, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    IStreakVault public immutable vault;
    address public immutable initializer;
    address public distributor;

    mapping(uint256 => uint256) public override budgetOf;
    mapping(uint256 => bool) public override released;

    constructor(IERC20 token_, IStreakVault vault_) {
        if (address(token_) == address(0) || address(vault_) == address(0)) revert ZeroAddress();
        token = token_;
        vault = vault_;
        initializer = msg.sender;
    }

    function setDistributor(address distributor_) external {
        if (msg.sender != initializer) revert NotInitializer();
        if (distributor != address(0)) revert DistributorAlreadySet();
        if (distributor_ == address(0)) revert ZeroAddress();
        distributor = distributor_;
        emit DistributorSet(distributor_);
    }

    /// @notice Nạp ngân sách cho `epoch`. Phải gọi trước khi kỳ kết thúc. Cần approve trước.
    function fundEpoch(uint256 epoch, uint256 amount) external override nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 end = vault.epochEnd(epoch);
        if (block.timestamp >= end || released[epoch]) revert FundingClosed(epoch, end);
        budgetOf[epoch] += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit EpochFunded(epoch, msg.sender, amount, budgetOf[epoch]);
    }

    /// @notice Chỉ distributor. Chuyển toàn bộ ngân sách kỳ sang distributor, một lần duy nhất.
    function release(uint256 epoch) external override nonReentrant returns (uint256 amount) {
        if (msg.sender != distributor) revert NotDistributor();
        if (released[epoch]) revert AlreadyReleased(epoch);
        released[epoch] = true;
        amount = budgetOf[epoch];
        if (amount > 0) token.safeTransfer(msg.sender, amount);
        emit EpochReleased(epoch, amount);
    }
}
