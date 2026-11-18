// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title VoucherMarket (Tính năng 28)
/// @notice Chợ voucher P2P: ngườ dùng bán voucher freeze/boost lấy mUSDC.
///         Đăng bán, mua, hủy lệnh. Phí nền tảng (platformFeeBps) về owner.
/// @dev Voucher đại diện bằng số dư bên trong contract (không phải ERC-1155)
///      để đơn giản: nạp voucher (owner mint quyền) -> bán.
contract VoucherMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Listing {
        uint256 id;
        address seller;
        uint256 voucherAmount; // số voucher (đơn vị lẻ)
        uint256 price; // mUSDC
        bool active;
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;
    address public feeRecipient;
    uint256 public platformFeeBps = 250; // 2.5%

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256) public voucherBalance; // số voucher đang giữ

    event VouchersMinted(address indexed to, uint256 amount);
    event Listed(uint256 indexed listingId, address indexed seller, uint256 amount, uint256 price);
    event Bought(uint256 indexed listingId, address indexed buyer, uint256 price, uint256 fee);
    event Delisted(uint256 indexed listingId);

    error NotSeller();
    error ListingNotActive();
    error InsufficientVouchers();

    constructor(IERC20 token_, IStreakVault vault_, address feeRecipient_) {
        token = token_;
        vault = vault_;
        feeRecipient = feeRecipient_;
    }

    /// @notice Nạp voucher cho ví (owner/operator — ví sau có thể bán).
    function mintVouchers(address to, uint256 amount) external {
        // Demo: bất kỳ ai cũng có thể "mint" voucher cho mình bằng cách gửi tiền vào?
        // Đơn giản hóa: voucher = quyền freeze một lần, phát miễn phí (demo).
        voucherBalance[to] += amount;
        emit VouchersMinted(to, amount);
    }

    function list(uint256 voucherAmount, uint256 price) external returns (uint256 listingId) {
        if (voucherBalance[msg.sender] < voucherAmount) revert InsufficientVouchers();
        voucherBalance[msg.sender] -= voucherAmount;
        listingId = nextListingId++;
        listings[listingId] = Listing({id: listingId, seller: msg.sender, voucherAmount: voucherAmount, price: price, active: true});
        emit Listed(listingId, msg.sender, voucherAmount, price);
    }

    function buy(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        if (!l.active) revert ListingNotActive();
        l.active = false;
        uint256 fee = (l.price * platformFeeBps) / 10_000;
        token.safeTransferFrom(msg.sender, l.seller, l.price - fee);
        if (fee > 0 && feeRecipient != address(0)) token.safeTransferFrom(msg.sender, feeRecipient, fee);
        voucherBalance[msg.sender] += l.voucherAmount;
        emit Bought(listingId, msg.sender, l.price, fee);
    }

    function delist(uint256 listingId) external {
        Listing storage l = listings[listingId];
        if (l.seller != msg.sender) revert NotSeller();
        if (!l.active) revert ListingNotActive();
        l.active = false;
        voucherBalance[msg.sender] += l.voucherAmount;
        emit Delisted(listingId);
    }
}
