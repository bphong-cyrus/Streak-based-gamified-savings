// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title ReminderCenter
/// @notice Nhắc nhở gửi qua bot (Telegram): ví opt-in, bot subscribe sự kiện EpochOpened
///         để gửi tin nhắn nhắc trước khi kỳ kết thúc.
/// @dev `poke` phát sự kiện mỗi khi sang kỳ mới; phí gas do bot/relayer trả.
contract ReminderCenter {
    IStreakVault public immutable vault;

    mapping(address => bool) public optedIn;
    /// @dev epoch đã phát sự kiện + 1 (0 = chưa).
    uint256 internal _announcedEpoch;

    event OptedIn(address indexed wallet);
    event OptedOut(address indexed wallet);
    event EpochOpened(
        uint256 indexed epoch,
        uint256 epochEnd,
        address[] participants,
        address[] optedIn
    );

    constructor(IStreakVault vault_) {
        vault = vault_;
    }

    function optIn() external {
        optedIn[msg.sender] = true;
        emit OptedIn(msg.sender);
    }

    function optOut() external {
        optedIn[msg.sender] = false;
        emit OptedOut(msg.sender);
    }

    /// @notice Bot gọi sau mỗi kỳ; phát sự kiện duy nhất mỗi kỳ.
    function poke() external {
        require(vault.hasStarted(), "not started");
        uint256 epoch = vault.currentEpoch();
        require(_announcedEpoch != epoch + 1, "announced");
        _announcedEpoch = epoch + 1;

        address[] memory participants = vault.getParticipants();
        uint256 n = participants.length;
        uint256 m;
        for (uint256 i; i < n; ++i) {
            if (optedIn[participants[i]]) ++m;
        }
        address[] memory ins = new address[](m);
        uint256 j;
        for (uint256 i; i < n; ++i) {
            if (optedIn[participants[i]]) ins[j++] = participants[i];
        }
        emit EpochOpened(epoch, vault.epochEnd(epoch), participants, ins);
    }

    function announcedEpoch() external view returns (uint256) {
        uint256 raw = _announcedEpoch;
        return raw == 0 ? 0 : raw - 1;
    }
}
