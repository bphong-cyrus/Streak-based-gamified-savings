// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title GroupVault (Tính năng 11)
/// @notice Quỹ nhóm chung: thành viên gửi mUSDC chung; rút theo tỷ lệ đóng góp.
/// @dev Đơn giản cho demo: gắn với StreakGroups bằng groupId, nhưng không bắt buộc.
contract GroupVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct GroupFund {
        uint256 totalDeposited;
        mapping(address => uint256) deposited;
        address[] members;
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;

    mapping(uint256 => GroupFund) internal _funds; // groupId -> fund

    event GroupFunded(uint256 indexed groupId, address indexed member, uint256 amount);
    event GroupWithdrawn(uint256 indexed groupId, address indexed member, uint256 amount);

    error ZeroAmount();
    error NothingToWithdraw();

    constructor(IERC20 token_, IStreakVault vault_) {
        token = token_;
        vault = vault_;
    }

    function fundGroup(uint256 groupId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        GroupFund storage f = _funds[groupId];
        if (f.deposited[msg.sender] == 0) f.members.push(msg.sender);
        f.deposited[msg.sender] += amount;
        f.totalDeposited += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit GroupFunded(groupId, msg.sender, amount);
    }

    /// @notice Rút theo tỷ lệ đóng góp trên số dư hiện có của nhóm.
    function withdrawShare(uint256 groupId) external nonReentrant {
        GroupFund storage f = _funds[groupId];
        uint256 deposited = f.deposited[msg.sender];
        if (deposited == 0) revert NothingToWithdraw();
        uint256 balance = token.balanceOf(address(this));
        uint256 share = (balance * deposited) / f.totalDeposited;
        f.deposited[msg.sender] = 0;
        f.totalDeposited -= deposited;
        token.safeTransfer(msg.sender, share);
        emit GroupWithdrawn(groupId, msg.sender, share);
    }

    function shareOf(uint256 groupId, address member) external view returns (uint256) {
        GroupFund storage f = _funds[groupId];
        if (f.totalDeposited == 0) return 0;
        return (token.balanceOf(address(this)) * f.deposited[member]) / f.totalDeposited;
    }

    function depositedOf(uint256 groupId, address member) external view returns (uint256) {
        return _funds[groupId].deposited[member];
    }
}
