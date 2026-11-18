// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {YieldDistributor} from "./YieldDistributor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title AuditExporter (Tính năng 48 — kiểm toán)
/// @notice Xuất snapshot đầy đủ trạng thái tại một kỳ (event cho indexer,
///         struct view cho backend kiểm toán đối chiếu).
contract AuditExporter {
    struct Snapshot {
        uint256 epoch;
        uint256 totalPrincipal;
        uint256 vaultBalance;
        uint256 distributorBalance;
        uint256 totalClaimable;
        uint256 rollover;
        uint256 nextEpochToFinalize;
        uint256 participantCount;
    }

    IStreakVault public immutable vault;
    YieldDistributor public immutable distributor;
    IERC20 public immutable token;

    event SnapshotExported(Snapshot snap);

    constructor(IStreakVault vault_, YieldDistributor distributor_) {
        vault = vault_;
        distributor = distributor_;
        token = IERC20(vault.token());
    }

    function capture() public view returns (Snapshot memory s) {
        s.epoch = vault.hasStarted() ? vault.currentEpoch() : 0;
        s.totalPrincipal = vault.totalPrincipal();
        s.vaultBalance = token.balanceOf(address(vault));
        s.distributorBalance = token.balanceOf(address(distributor));
        s.totalClaimable = distributor.totalClaimable();
        s.rollover = distributor.rollover();
        s.nextEpochToFinalize = distributor.nextEpochToFinalize();
        s.participantCount = vault.getParticipants().length;
    }

    /// @notice Emit snapshot — bot gọi mỗi kỳ để lưu lịch sử off-chain.
    function export() external returns (Snapshot memory s) {
        s = capture();
        emit SnapshotExported(s);
    }

    /// @notice Kiểm tra đối chiếu: snapshot hiện tại có hợp lệ không.
    function verify() external view returns (bool ok, string memory reason) {
        Snapshot memory s = capture();
        if (s.vaultBalance < s.totalPrincipal) return (false, "vault insolvent");
        if (s.distributorBalance < s.totalClaimable + s.rollover) return (false, "distributor insolvent");
        return (true, "ok");
    }
}
