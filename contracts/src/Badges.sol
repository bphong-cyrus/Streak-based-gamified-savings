// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {Challenges} from "./Challenges.sol";
import {StreakGroups} from "./StreakGroups.sol";

/// @title Badges (Tính năng 25)
/// @notice Thư viện huy hiệu ERC-1155 soulbound: nhiều loại huy hiệu theo hành vi
///         (gửi lần đầu, streak, thử thách, nhóm...). Owner có thể phát huy hiệu thủ công.
contract Badges is ERC1155, Ownable {
    IStreakVault public immutable vault;
    Challenges public immutable challenges;
    StreakGroups public immutable groups;

    uint256 public constant BADGE_FIRST_DEPOSIT = 1; // đã gửi lần đầu
    uint256 public constant BADGE_STREAK_5 = 2;
    uint256 public constant BADGE_STREAK_10 = 3;
    uint256 public constant BADGE_CHALLENGER = 4; // đã thắng challenge
    uint256 public constant BADGE_GROUP_MEMBER = 5; // đã tham gia nhóm
    uint256 public constant BADGE_BIG_SAVER = 6; // gốc >= 100 mUSDC

    error ConditionNotMet();
    error AlreadyMinted();
    error TransfersDisabled();

    constructor(IStreakVault vault_, Challenges challenges_, StreakGroups groups_, string memory uri_)
        ERC1155(uri_)
        Ownable(msg.sender)
    {
        vault = vault_;
        challenges = challenges_;
        groups = groups_;
    }

    /// @notice Mint huy hiệu nếu đủ điều kiện (tự kiểm tra on-chain).
    function claim(uint256 badgeId) external {
        if (balanceOf(msg.sender, badgeId) > 0) revert AlreadyMinted();
        bool ok;
        if (badgeId == BADGE_FIRST_DEPOSIT) {
            ok = vault.getAccount(msg.sender).depositCount >= 1;
        } else if (badgeId == BADGE_STREAK_5) {
            ok = vault.getAccount(msg.sender).streak >= 5;
        } else if (badgeId == BADGE_STREAK_10) {
            ok = vault.getAccount(msg.sender).streak >= 10;
        } else if (badgeId == BADGE_CHALLENGER) {
            ok = challenges.totalWon(msg.sender) > 0;
        } else if (badgeId == BADGE_BIG_SAVER) {
            ok = vault.getAccount(msg.sender).principal >= 100 * 1e6;
        } else if (badgeId == BADGE_GROUP_MEMBER) {
            ok = _inAnyGroup(msg.sender);
        } else {
            revert ConditionNotMet();
        }
        if (!ok) revert ConditionNotMet();
        _mint(msg.sender, badgeId, 1, "");
    }

    function _inAnyGroup(address wallet) internal view returns (bool) {
        uint256 n = groups.groupCount();
        for (uint256 g; g < n; ++g) {
            if (groups.isMember(g, wallet)) return true;
        }
        return false;
    }

    /// @notice Owner phát huy hiệu sự kiện (huy hiệu id >= 1000).
    function award(address wallet, uint256 badgeId, uint256 amount) external onlyOwner {
        require(badgeId >= 1000, "use claim for rule badges");
        _mint(wallet, badgeId, amount, "");
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0) && to != address(0)) revert TransfersDisabled();
        super._update(from, to, ids, values);
    }
}
