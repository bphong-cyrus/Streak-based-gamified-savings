// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title GasSponsor (Tính năng 34 — sponsor gas)
/// @notice Pool hoàn phí cho relayer/bot: owner nạp mUSDC; relayer gọi
///         `subsidize` để nhận khoản cố định mỗi lượt giúp ngườ dùng.
/// @dev Số tiền nhỏ (demo), chống drain bằng giới hạn mỗi relayer mỗi kỳ thờ gian.
contract GasSponsor is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public subsidyPerTx = 0.02 * 1e6; // 0.02 mUSDC/lượt
    uint256 public cooldown = 30 seconds;

    uint256 public pool;
    mapping(address => uint256) public lastClaim;

    event Subsidized(address indexed relayer, uint256 amount);
    error CooldownActive();
    error PoolEmpty();

    constructor(IERC20 token_) Ownable(msg.sender) {
        token = token_;
    }

    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        pool += amount;
    }

    function setSubsidy(uint256 amount, uint256 cooldown_) external onlyOwner {
        subsidyPerTx = amount;
        cooldown = cooldown_;
    }

    /// @notice Relayer gọi sau khi giúp ngườ dùng thực hiện tx (demo: không xác minh).
    function subsidize() external {
        if (block.timestamp - lastClaim[msg.sender] < cooldown) revert CooldownActive();
        if (pool < subsidyPerTx) revert PoolEmpty();
        lastClaim[msg.sender] = block.timestamp;
        pool -= subsidyPerTx;
        token.safeTransfer(msg.sender, subsidyPerTx);
        emit Subsidized(msg.sender, subsidyPerTx);
    }
}
