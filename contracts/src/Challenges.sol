// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title Challenges (Sponsored Challenges + Missions)
/// @notice Thử thách tài trợ: sponsor nạp giải, ngườ chơi đạt streak mốc thì claim.
///         Missions: nhiệm vụ do owner tạo (đủ số lần gửi / streak), ngườ chơi claim một lần.
/// @dev Giải thưởng trả bằng mUSDC từ pool của từng challenge/mission.
contract Challenges is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum Kind {
        STREAK, // đạt streakToClaim trước deadline
        DEPOSIT_COUNT, // gửi đủ depositCountToClaim lần (dùng vault.depositCount)
        STREAK_AND_DEPOSIT // cả hai

    }

    struct Challenge {
        uint256 id;
        Kind kind;
        uint256 streakToClaim;
        uint256 depositCountToClaim;
        uint256 prizePerWinner; // mUSDC
        uint256 maxWinners;
        uint256 winnersCount;
        uint256 deadlineEpoch; // claim trước kỳ này
        address sponsor;
        bool active;
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;

    uint256 public nextChallengeId;
    mapping(uint256 => Challenge) public challenges;
    mapping(uint256 => mapping(address => bool)) public claimed;
    mapping(address => uint256) public totalWon;

    event ChallengeCreated(
        uint256 indexed challengeId,
        Kind kind,
        uint256 streakToClaim,
        uint256 depositCountToClaim,
        uint256 prizePerWinner,
        uint256 maxWinners,
        uint256 deadlineEpoch,
        address indexed sponsor
    );
    event ChallengeWon(uint256 indexed challengeId, address indexed winner, uint256 prize);

    error ChallengeNotFound();
    error ChallengeNotActive();
    error RequirementsNotMet();
    error AlreadyClaimed();
    error WinnersExhausted();
    error DeadlinePassed(uint256 deadlineEpoch);
    error SponsorshipTooLow();

    constructor(IERC20 token_, IStreakVault vault_) Ownable(msg.sender) {
        token = token_;
        vault = vault_;
    }

    /// @notice Sponsor tạo thử thách, nạp prizePerWinner * maxWinners vào contract.
    function createChallenge(
        Kind kind,
        uint256 streakToClaim,
        uint256 depositCountToClaim,
        uint256 prizePerWinner,
        uint256 maxWinners,
        uint256 deadlineEpoch
    ) external returns (uint256 challengeId) {
        if (prizePerWinner == 0 || maxWinners == 0) revert SponsorshipTooLow();
        if (kind != Kind.STREAK && depositCountToClaim == 0) revert RequirementsNotMet();
        if (kind != Kind.DEPOSIT_COUNT && streakToClaim == 0) revert RequirementsNotMet();
        uint256 total = prizePerWinner * maxWinners;
        token.safeTransferFrom(msg.sender, address(this), total);

        challengeId = nextChallengeId++;
        challenges[challengeId] = Challenge({
            id: challengeId,
            kind: kind,
            streakToClaim: streakToClaim,
            depositCountToClaim: depositCountToClaim,
            prizePerWinner: prizePerWinner,
            maxWinners: maxWinners,
            winnersCount: 0,
            deadlineEpoch: deadlineEpoch,
            sponsor: msg.sender,
            active: true
        });
        emit ChallengeCreated(
            challengeId, kind, streakToClaim, depositCountToClaim, prizePerWinner, maxWinners, deadlineEpoch, msg.sender
        );
    }

    /// @notice Ngườ chơi claim giải nếu đủ điều kiện.
    function claim(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];
        if (c.sponsor == address(0)) revert ChallengeNotFound();
        if (!c.active) revert ChallengeNotActive();
        if (claimed[challengeId][msg.sender]) revert AlreadyClaimed();
        if (c.winnersCount >= c.maxWinners) revert WinnersExhausted();
        if (vault.hasStarted() && vault.currentEpoch() >= c.deadlineEpoch) {
            revert DeadlinePassed(c.deadlineEpoch);
        }

        IStreakVault.AccountView memory a = vault.getAccount(msg.sender);
        bool streakOk = a.streak >= c.streakToClaim;
        bool depositOk = vault.depositCount(msg.sender) >= c.depositCountToClaim;
        bool met = (c.kind == Kind.STREAK && streakOk)
            || (c.kind == Kind.DEPOSIT_COUNT && depositOk)
            || (c.kind == Kind.STREAK_AND_DEPOSIT && streakOk && depositOk);
        if (!met) revert RequirementsNotMet();

        claimed[challengeId][msg.sender] = true;
        c.winnersCount += 1;
        totalWon[msg.sender] += c.prizePerWinner;
        token.safeTransfer(msg.sender, c.prizePerWinner);
        emit ChallengeWon(challengeId, msg.sender, c.prizePerWinner);
    }

    /// @notice Owner đóng challenge, hoàn lại pool còn lại cho sponsor.
    function closeChallenge(uint256 challengeId) external onlyOwner {
        Challenge storage c = challenges[challengeId];
        if (c.sponsor == address(0)) revert ChallengeNotFound();
        c.active = false;
        uint256 remaining = c.prizePerWinner * (c.maxWinners - c.winnersCount);
        if (remaining > 0) token.safeTransfer(c.sponsor, remaining);
    }
}
