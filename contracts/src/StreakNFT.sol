// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title StreakNFT
/// @notice Huy hiệu NFT mốc streak (3/7/30 kỳ). Ai đủ streak cũng có thể tự mint.
/// @dev Soulbound-lite: chặn chuyển, chỉ cho mint/burn. URI mặc định theo id.
contract StreakNFT is ERC1155, Ownable {
    IStreakVault public immutable vault;

    uint256 public constant STREAK_3 = 3;
    uint256 public constant STREAK_7 = 7;
    uint256 public constant STREAK_30 = 30;

    mapping(uint256 => bool) public minted;

    event MilestoneMinted(address indexed wallet, uint256 indexed streakTier);

    error StreakNotReached();
    error AlreadyMinted();
    error TransfersDisabled();

    constructor(IStreakVault vault_, string memory uri_) ERC1155(uri_) Ownable(msg.sender) {
        vault = vault_;
    }

    function _tierOf(uint256 streak) internal pure returns (uint256) {
        if (streak >= STREAK_30) return STREAK_30;
        if (streak >= STREAK_7) return STREAK_7;
        if (streak >= STREAK_3) return STREAK_3;
        return 0;
    }

    /// @notice Mint huy hiệu cao nhất mà ví đang đủ điều kiện.
    function mint() external returns (uint256 tier) {
        uint256 streak = vault.getAccount(msg.sender).streak;
        tier = _tierOf(streak);
        if (tier == 0) revert StreakNotReached();
        uint256 id = tier; // tokenId = mốc streak
        if (balanceOf(msg.sender, id) > 0) revert AlreadyMinted();
        _mint(msg.sender, id, 1, "");
        emit MilestoneMinted(msg.sender, tier);
    }

    /// @notice Kiểm tra ví đủ điều kiện mint tier nào (0 = chưa đủ).
    function eligibleTier(address wallet) external view returns (uint256) {
        return _tierOf(vault.getAccount(wallet).streak);
    }

    /// @dev Chặn mọi chuyển (soulbound); chỉ mint (from==0) và burn (to==0) được phép.
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        if (from != address(0) && to != address(0)) revert TransfersDisabled();
        super._update(from, to, ids, values);
    }
}
