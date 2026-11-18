// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ReserveFund (Tính năng 44)
/// @notice Quỹ dự phòng: owner nạp mUSDC; khi yield source thiếu ngân sách kỳ,
///         bổ sung từ quỹ để ngườ chơi vẫn nhận thưởng đều.
contract ReserveFund is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public balance;

    event Funded(uint256 amount);
    event TopUp(uint256 indexed epoch, uint256 amount);
    error InsufficientReserve();

    constructor(IERC20 token_) Ownable(msg.sender) {
        token = token_;
    }

    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        balance += amount;
        emit Funded(amount);
    }

    /// @notice Bổ sung ngân sách cho một kỳ (trước khi kỳ kết thúc).
    function topUpEpoch(address yieldSource, uint256 epoch, uint256 amount) external onlyOwner {
        if (amount > balance) revert InsufficientReserve();
        balance -= amount;
        token.approve(yieldSource, amount);
        (bool ok,) = yieldSource.call(abi.encodeWithSignature("fundEpoch(uint256,uint256)", epoch, amount));
        require(ok, "fundEpoch failed");
        emit TopUp(epoch, amount);
    }
}
