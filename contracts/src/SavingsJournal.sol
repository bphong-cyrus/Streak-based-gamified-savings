// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title SavingsJournal (Tính năng 120 + 121 + 122)
/// @notice 120. Nhật ký cảm xúc theo kỳ: ghi lại cảm giác lúc gửi/rút tiền.
///         121. Công khai hoặc riêng tư: entry private chỉ chủ đọc được nội dung.
///         122. Lờ nhắn từ quá khứ: khi sang kỳ mới, UI đọc entry cũ để "nhắc lại lờ hứa".
/// @dev Nội dung lưu on-chain (demo); private chỉ mang tính gợi ý (chuỗi public, không mã hoá).
contract SavingsJournal is ReentrancyGuard, Ownable {
    uint256 public constant MAX_LEN = 400;

    enum Mood {
        HAPPY,
        PROUD,
        TEMPTED,
        STRUGGLING,
        RELIEVED
    }

    struct Entry {
        address owner;
        uint256 epoch;
        Mood mood;
        string text;
        bool isPublic;
        uint256 at;
    }

    IStreakVault public immutable vault;

    uint256 public entryCount;
    mapping(uint256 => Entry) public entries;
    mapping(address => mapping(uint256 => uint256)) public entryIdOf; // owner -> epoch -> entryId

    event EntryWritten(address indexed owner, uint256 indexed epoch, uint256 entryId, Mood mood, bool isPublic);
    error BadEntry();
    error NotOwner();

    constructor(IStreakVault vault_) Ownable(msg.sender) {
        vault = vault_;
    }

    /// @notice Tính năng 120 + 121: viết nhật ký cho kỳ hiện tại (ghi đè nếu viết lại trong kỳ).
    function write(Mood mood, string memory text, bool isPublic) external returns (uint256 entryId) {
        require(vault.hasStarted(), "not started");
        uint256 epoch = vault.currentEpoch();
        if (bytes(text).length == 0 || bytes(text).length > MAX_LEN) revert BadEntry();

        uint256 existing = entryIdOf[msg.sender][epoch];
        if (existing != 0) {
            Entry storage e = entries[existing];
            e.mood = mood;
            e.text = text;
            e.isPublic = isPublic;
            e.at = block.timestamp;
            emit EntryWritten(msg.sender, epoch, existing, mood, isPublic);
            return existing;
        }

        entryId = ++entryCount;
        entries[entryId] = Entry({owner: msg.sender, epoch: epoch, mood: mood, text: text, isPublic: isPublic, at: block.timestamp});
        entryIdOf[msg.sender][epoch] = entryId;
        emit EntryWritten(msg.sender, epoch, entryId, mood, isPublic);
    }

    /// @notice Tính năng 122: entry của một ví ở một kỳ (0 nếu chưa viết).
    function entryOf(address owner, uint256 epoch) external view returns (Entry memory e) {
        uint256 id = entryIdOf[owner][epoch];
        if (id == 0) return e;
        return entries[id];
    }

    /// @notice Tính năng 121: chỉ chủ được đọc entry private.
    function readEntry(uint256 entryId) external view returns (Entry memory e) {
        e = entries[entryId];
        if (!e.isPublic && e.owner != msg.sender) revert NotOwner();
    }
}
