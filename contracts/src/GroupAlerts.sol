// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {StreakGroups} from "./StreakGroups.sol";

/// @title GroupAlerts (Tính năng 19)
/// @notice Bot cảnh báo nhóm: phát sự kiện khi có thành viên sắp miss
///         (chưa đạt target giữa/cuối kỳ). UI/bot Telegram đọc event để nhắc nhở.
contract GroupAlerts {
    IStreakVault public immutable vault;
    StreakGroups public immutable groups;

    event MemberOffTrack(uint256 indexed groupId, address indexed member, uint256 epoch, uint256 progress, uint256 target);

    constructor(IStreakVault vault_, StreakGroups groups_) {
        vault = vault_;
        groups = groups_;
    }

    /// @notice Bot gọi cho từng nhóm; phát event cho thành viên chưa đủ target.
    /// @return offTrack số thành viên chưa đạt target (0 = nhóm ổn).
    function checkGroup(uint256 groupId) external returns (uint256 offTrack) {
        (, , , , address[] memory members) = groups.getGroup(groupId);
        uint256 epoch = vault.hasStarted() ? vault.currentEpoch() : 0;
        for (uint256 i; i < members.length; ++i) {
            address m = members[i];
            IStreakVault.AccountView memory a = vault.getAccount(m);
            IStreakVault.EpochStatus memory s = vault.getEpochStatus(m, epoch);
            if (s.target > 0 && a.currentProgress < s.target) {
                ++offTrack;
                emit MemberOffTrack(groupId, m, epoch, a.currentProgress, s.target);
            }
        }
    }
}
