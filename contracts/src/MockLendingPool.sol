// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockLendingPool (Tính năng 41)
/// @notice Adapter lending mô phỏng (giống Aave/BENQI): gửi mUSDC nhận aToken,
///         lãi tích lũy theo thờ gian với APY cố định do owner đặt.
/// @dev Cân bằng theo thờ gian: balance = principal * (1 + rate * elapsed / year).
contract MockLendingPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant BPS = 10_000;

    IERC20 public immutable token;

    uint256 public apyBps = 500; // 5% APY mặc định
    uint256 public totalDeposits;
    mapping(address => uint256) public principalOf;
    mapping(address => uint256) public depositTime;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 interest);

    error ZeroAmount();
    error InsufficientBalance();

    constructor(IERC20 token_) Ownable(msg.sender) {
        token = token_;
    }

    function setApyBps(uint256 bps) external onlyOwner {
        apyBps = bps;
    }

    function _interestOf(address user) internal view returns (uint256) {
        uint256 principal = principalOf[user];
        if (principal == 0) return 0;
        uint256 elapsed = block.timestamp - depositTime[user];
        return (principal * apyBps * elapsed) / (BPS * SECONDS_PER_YEAR);
    }

    /// @notice Lãi hiện tại của ví.
    function interestOf(address user) external view returns (uint256) {
        return _interestOf(user);
    }

    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        // Trả lãi cũ trước khi cập nhật principal
        _accrue(msg.sender);
        token.safeTransferFrom(msg.sender, address(this), amount);
        principalOf[msg.sender] += amount;
        totalDeposits += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Rút toàn bộ principal + lãi.
    function withdraw() external nonReentrant {
        uint256 principal = principalOf[msg.sender];
        if (principal == 0) revert InsufficientBalance();
        uint256 interest = _interestOf(msg.sender);
        principalOf[msg.sender] = 0;
        totalDeposits -= principal;
        token.safeTransfer(msg.sender, principal + interest);
        emit Withdrawn(msg.sender, principal, interest);
    }

    function _accrue(address user) internal {
        uint256 interest = _interestOf(user);
        if (interest > 0) {
            // Cộng lãi vào principal (lãi kép đơn giản)
            principalOf[user] += interest;
            totalDeposits += interest;
        }
        depositTime[user] = block.timestamp;
    }
}
