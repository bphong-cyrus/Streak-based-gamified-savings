// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Gems} from "./Gems.sol";

/// @title GemShop
/// @notice Cửa hàng tiêu Gems: mở khóa theme tòa nhà và đồ trang trí.
/// @dev Catalog do owner quản lý (setTheme/setDecor). Tiền mua chuyển về treasury.
///      Sở hữu ghi on-chain để frontend render theme/decor riêng cho từng ví.
contract GemShop is AccessControl, ReentrancyGuard {
    Gems public immutable gems;
    address public immutable treasury;

    mapping(uint256 => uint256) public themePrice; // 0 = chưa bán
    mapping(uint256 => uint256) public decorPrice;
    mapping(address => mapping(uint256 => bool)) public ownedThemes;
    mapping(address => mapping(uint256 => bool)) public ownedDecors;

    event ThemeAdded(uint256 indexed themeId, uint256 price);
    event DecorAdded(uint256 indexed decorId, uint256 price);
    event ThemeBought(address indexed wallet, uint256 indexed themeId, uint256 price);
    event DecorBought(address indexed wallet, uint256 indexed decorId, uint256 price);

    error ItemNotForSale();
    error AlreadyOwned();
    error ZeroAddress();

    constructor(Gems gems_, address admin, address treasury_) {
        if (treasury_ == address(0)) revert ZeroAddress();
        gems = gems_;
        treasury = treasury_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setTheme(uint256 themeId, uint256 price) external onlyRole(DEFAULT_ADMIN_ROLE) {
        themePrice[themeId] = price;
        emit ThemeAdded(themeId, price);
    }

    function setDecor(uint256 decorId, uint256 price) external onlyRole(DEFAULT_ADMIN_ROLE) {
        decorPrice[decorId] = price;
        emit DecorAdded(decorId, price);
    }

    /// @notice Mua theme bằng Gems. Cần approve Gems cho shop trước.
    function buyTheme(uint256 themeId) external nonReentrant {
        uint256 price = themePrice[themeId];
        if (price == 0) revert ItemNotForSale();
        if (ownedThemes[msg.sender][themeId]) revert AlreadyOwned();
        gems.transferFrom(msg.sender, treasury, price);
        ownedThemes[msg.sender][themeId] = true;
        emit ThemeBought(msg.sender, themeId, price);
    }

    /// @notice Mua đồ trang trí bằng Gems. Cần approve Gems cho shop trước.
    function buyDecor(uint256 decorId) external nonReentrant {
        uint256 price = decorPrice[decorId];
        if (price == 0) revert ItemNotForSale();
        if (ownedDecors[msg.sender][decorId]) revert AlreadyOwned();
        gems.transferFrom(msg.sender, treasury, price);
        ownedDecors[msg.sender][decorId] = true;
        emit DecorBought(msg.sender, decorId, price);
    }
}
