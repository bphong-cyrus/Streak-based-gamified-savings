// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title FreezeGift (Tính năng 51 + 52 + 53)
/// @notice 51. Tặng Streak Freeze cho bạn bè: ngườ tặng trả phí, bạn nhận freeze kỳ hiện tại.
///         52. Tặng bảo hiểm kỳ (insurance) cho bạn bè theo cùng cơ chế.
///         53. Lịch sử quà tặng on-chain: giftId tăng dần, ai cũng đọc được.
/// @dev Là operator của vault (owner vault cấp quyền), phí kéo từ ngườ tặng trả thay ngườ nhận.
contract FreezeGift is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Gift {
        address from;
        address to;
        uint256 epoch;
        bool isInsurance;
        uint256 feePaid;
    }

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public giftCount;
    mapping(uint256 => Gift) public gifts;

    event FreezeGifted(uint256 indexed giftId, address indexed from, address indexed to, uint256 epoch, uint256 fee);
    event InsuranceGifted(uint256 indexed giftId, address indexed from, address indexed to, uint256 epoch, uint256 fee);

    error CannotGiftSelf();
    error NotActivated();

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    /// @notice Tính năng 51: tặng freeze kỳ hiện tại cho `to` (trả phí thay họ).
    function giftFreeze(address to) external nonReentrant {
        if (to == msg.sender) revert CannotGiftSelf();
        if (!vault.getAccount(to).activated) revert NotActivated();
        uint256 fee = vault.freezeFee();
        token.safeTransferFrom(msg.sender, address(this), fee);
        token.approve(address(vault), fee);
        vault.freezeFor(to);
        _record(msg.sender, to, false, fee);
        emit FreezeGifted(giftCount, msg.sender, to, vault.hasStarted() ? vault.currentEpoch() : 0, fee);
    }

    /// @notice Tính năng 52: tặng insurance kỳ hiện tại cho `to`.
    function giftInsurance(address to) external nonReentrant {
        if (to == msg.sender) revert CannotGiftSelf();
        if (!vault.getAccount(to).activated) revert NotActivated();
        uint256 fee = vault.insurancePremium();
        token.safeTransferFrom(msg.sender, address(this), fee);
        token.approve(address(vault), fee);
        vault.insureFor(to);
        _record(msg.sender, to, true, fee);
        emit InsuranceGifted(giftCount, msg.sender, to, vault.hasStarted() ? vault.currentEpoch() : 0, fee);
    }

    /// @notice Tính năng 53: lịch sử quà, page từ mới nhất.
    function giftHistory(uint256 offset, uint256 limit) external view returns (Gift[] memory out) {
        uint256 total = giftCount;
        if (offset >= total) return new Gift[](0);
        uint256 end = total - offset;
        uint256 start = end > limit ? end - limit : 0;
        out = new Gift[](end - start);
        for (uint256 i = start; i < end; ++i) {
            out[i - start] = gifts[i + 1]; // giftId bắt đầu từ 1
        }
    }

    function _record(address from, address to, bool isInsurance, uint256 fee) internal {
        giftCount += 1;
        gifts[giftCount] = Gift({from: from, to: to, epoch: vault.hasStarted() ? vault.currentEpoch() : 0, isInsurance: isInsurance, feePaid: fee});
    }
}
