// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Treasury
/// @notice Hợp đồng thu phí (yield fee, withdraw fee, penalty, freeze/revive/insurance fee).
///         Owner rút token về ví điều hành.
contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    constructor() Ownable(msg.sender) {}

    /// @notice Rút toàn bộ token chỉ định về ví owner.
    function withdraw(IERC20 token, uint256 amount) external onlyOwner {
        token.safeTransfer(owner(), amount);
    }

    function balanceOf(IERC20 token) external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
