// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title Duel (Tính năng 13)
/// @notice Đấu streak 1v1: hai bên cược mUSDC; ai có streak cao hơn tại kỳ chốt
///         (không thấp hơn minStreak) thì thắng toàn bộ pot. Hòa -> hoàn tiền.
contract Duel is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State {
        OPEN,
        ACTIVE,
        RESOLVED

    }

    struct DuelInfo {
        uint256 id;
        address challenger;
        address opponent;
        uint256 stake;
        uint256 epoch; // kỳ so streak
        uint256 minStreak;
        State state;
        address winner;
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;

    uint256 public nextDuelId = 1;
    mapping(uint256 => DuelInfo) public duels;

    event DuelCreated(uint256 indexed duelId, address indexed challenger, uint256 stake, uint256 epoch);
    event DuelAccepted(uint256 indexed duelId, address indexed opponent);
    event DuelResolved(uint256 indexed duelId, address indexed winner, uint256 pot);

    error NotOpponent();
    error BadState();
    error EpochNotSettled();
    error ZeroStake();

    constructor(IERC20 token_, IStreakVault vault_) {
        token = token_;
        vault = vault_;
    }

    function createDuel(uint256 stake, uint256 epoch, uint256 minStreak) external returns (uint256 duelId) {
        if (stake == 0) revert ZeroStake();
        token.safeTransferFrom(msg.sender, address(this), stake);
        duelId = nextDuelId++;
        duels[duelId] = DuelInfo({
            id: duelId,
            challenger: msg.sender,
            opponent: address(0),
            stake: stake,
            epoch: epoch,
            minStreak: minStreak,
            state: State.OPEN,
            winner: address(0)
        });
        emit DuelCreated(duelId, msg.sender, stake, epoch);
    }

    function acceptDuel(uint256 duelId) external nonReentrant {
        DuelInfo storage d = duels[duelId];
        if (d.state != State.OPEN) revert BadState();
        if (d.challenger == msg.sender) revert NotOpponent();
        token.safeTransferFrom(msg.sender, address(this), d.stake);
        d.opponent = msg.sender;
        d.state = State.ACTIVE;
        emit DuelAccepted(duelId, msg.sender);
    }

    /// @notice Ai cũng có thể resolve sau khi kỳ đã chốt.
    function resolveDuel(uint256 duelId) external nonReentrant {
        DuelInfo storage d = duels[duelId];
        if (d.state != State.ACTIVE) revert BadState();
        if (vault.nextEpochToSettle() <= d.epoch) revert EpochNotSettled();

        uint256 cs = vault.getEpochStatus(d.challenger, d.epoch).streakAtSettle;
        uint256 os = vault.getEpochStatus(d.opponent, d.epoch).streakAtSettle;
        uint256 pot = d.stake * 2;

        d.state = State.RESOLVED;
        if (cs >= d.minStreak && cs > os) {
            d.winner = d.challenger;
        } else if (os >= d.minStreak && os > cs) {
            d.winner = d.opponent;
        } else {
            // Hòa hoặc cả hai dưới minStreak -> hoàn tiền
            token.safeTransfer(d.challenger, d.stake);
            token.safeTransfer(d.opponent, d.stake);
            emit DuelResolved(duelId, address(0), 0);
            return;
        }
        token.safeTransfer(d.winner, pot);
        emit DuelResolved(duelId, d.winner, pot);
    }
}
