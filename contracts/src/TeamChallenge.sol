// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {StreakGroups} from "./StreakGroups.sol";

/// @title TeamChallenge (Tính năng 12)
/// @notice Thử thách nhóm: sponsor đặt giải; nhóm đạt tổng mục tiêu ở kỳ chốt thì
///         mỗi thành viên đạt cá nhân được chia đều giải.
/// @dev Dùng groupId từ StreakGroups.
contract TeamChallenge is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct TeamQuest {
        uint256 id;
        uint256 groupId;
        uint256 epoch; // kỳ phải hoàn thành
        uint256 teamTarget; // tổng progress tối thiểu của nhóm
        uint256 prizePool; // còn lại sau mỗi lần trả
        uint256 prizePerWinner; // cố định lúc tạo = prizePool / số thành viên hiện có
        address sponsor;
        bool resolved;
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;
    StreakGroups public immutable groups;

    uint256 public nextQuestId;
    mapping(uint256 => TeamQuest) public quests;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event TeamQuestCreated(
        uint256 indexed questId, uint256 indexed groupId, uint256 epoch, uint256 teamTarget, uint256 prizePool
    );
    event TeamQuestWon(uint256 indexed questId, address indexed member, uint256 prize);

    error QuestNotFound();
    error EpochNotSettled();
    error TeamTargetMissed();
    error NotMember();
    error NotQualified();
    error AlreadyClaimed();
    error PoolEmpty();

    constructor(IERC20 token_, IStreakVault vault_, StreakGroups groups_) Ownable(msg.sender) {
        token = token_;
        vault = vault_;
        groups = groups_;
    }

    /// @notice Sponsor tạo thử thách cho nhóm tại một kỳ cụ thể.
    /// @dev prizePerWinner cố định theo số thành viên tại lúc tạo (tránh lệch khi ngườ claim dần).
    function createQuest(uint256 groupId, uint256 epoch, uint256 teamTarget, uint256 prizePool)
        external
        returns (uint256 questId)
    {
        token.safeTransferFrom(msg.sender, address(this), prizePool);
        (, , , , address[] memory members) = groups.getGroup(groupId);
        require(members.length > 0, "empty group");
        questId = nextQuestId++;
        quests[questId] = TeamQuest({
            id: questId,
            groupId: groupId,
            epoch: epoch,
            teamTarget: teamTarget,
            prizePool: prizePool,
            prizePerWinner: prizePool / members.length,
            sponsor: msg.sender,
            resolved: false
        });
        emit TeamQuestCreated(questId, groupId, epoch, teamTarget, prizePool);
    }

    /// @notice Thành viên nhóm claim sau khi kỳ challenge đã chốt.
    function claim(uint256 questId) external nonReentrant {
        TeamQuest storage q = quests[questId];
        if (q.sponsor == address(0)) revert QuestNotFound();
        if (claimed[questId][msg.sender]) revert AlreadyClaimed();
        if (!groups.isMember(q.groupId, msg.sender)) revert NotMember();
        if (vault.nextEpochToSettle() <= q.epoch) revert EpochNotSettled();

        IStreakVault.EpochStatus memory s = vault.getEpochStatus(msg.sender, q.epoch);
        if (!s.qualified) revert NotQualified();

        // Tổng progress của nhóm trong kỳ phải đạt target
        (, , , , address[] memory members) = groups.getGroup(q.groupId);
        uint256 totalProgress;
        uint256 qualifiedCount;
        for (uint256 i; i < members.length; ++i) {
            IStreakVault.EpochStatus memory ms = vault.getEpochStatus(members[i], q.epoch);
            if (ms.progress > 0) totalProgress += ms.progress;
            if (ms.qualified) ++qualifiedCount;
        }
        if (totalProgress < q.teamTarget) revert TeamTargetMissed();
        if (qualifiedCount == 0) revert PoolEmpty();
        if (q.prizePerWinner == 0 || q.prizePool < q.prizePerWinner) revert PoolEmpty();

        uint256 prize = q.prizePerWinner;
        claimed[questId][msg.sender] = true;
        q.prizePool -= prize;
        token.safeTransfer(msg.sender, prize);
        emit TeamQuestWon(questId, msg.sender, prize);
    }

    /// @notice Sponsor rút phần giải còn lại (nếu có) sau khi kỳ đã chốt.
    function reclaimLeftover(uint256 questId) external {
        TeamQuest storage q = quests[questId];
        if (q.sponsor != msg.sender) revert QuestNotFound();
        if (vault.nextEpochToSettle() <= q.epoch) revert EpochNotSettled();
        uint256 remaining = q.prizePool;
        q.prizePool = 0;
        if (remaining > 0) token.safeTransfer(msg.sender, remaining);
    }
}
