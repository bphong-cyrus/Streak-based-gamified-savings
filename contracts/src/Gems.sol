// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Gems
/// @notice Tiền tệ trong game của Cozy Save (kiểu Duolingo Gems).
/// @dev Mint chỉ qua MINTER_ROLE (MissionHub, shop, owner nạp seed).
///      Tiêu tại GemShop: chuyển về treasury hoặc đốt — không tự mint lung tung.
contract Gems is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address admin) ERC20("Cozy Gems", "GEM") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
