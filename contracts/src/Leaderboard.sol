// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title Leaderboard
/// @notice Điểm thành tựu & bảng xếp hạng (off-chain sort từ view này).
/// @dev Điểm = streak*1000 + depositCount*10 + principal/1e6 (quy về "điểm" gọn).
contract Leaderboard {
    IStreakVault public immutable vault;

    constructor(IStreakVault vault_) {
        vault = vault_;
    }

    function scoreOf(address wallet) public view returns (uint256) {
        IStreakVault.AccountView memory a = vault.getAccount(wallet);
        uint256 score = a.streak * 1000;
        score += a.depositCount * 10;
        score += a.principal / 1e6; // 1 mUSDC gốc = 1 điểm
        return score;
    }

    /// @notice Trả về điểm cho danh sách ví (UI tự sort hiển thị).
    function scoresOf(address[] calldata wallets) external view returns (address[] memory, uint256[] memory) {
        uint256 n = wallets.length;
        uint256[] memory scores = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            scores[i] = scoreOf(wallets[i]);
        }
        return (wallets, scores);
    }

    /// @notice Điểm toàn bộ participants (nguồn cho leaderboard app).
    function leaderboard() external view returns (address[] memory, uint256[] memory) {
        address[] memory participants = vault.getParticipants();
        uint256 n = participants.length;
        uint256[] memory scores = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            scores[i] = scoreOf(participants[i]);
        }
        return (participants, scores);
    }
}
