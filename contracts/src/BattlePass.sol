// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title BattlePass (Tính năng 21 + 22)
/// @notice 21. Mùa điểm thưởng (battle pass): điểm từ streak/tiến độ, lên tier nhận thưởng.
///         22. Check-in mỗi kỳ: điểm cộng thêm khi check-in trong kỳ đã gửi tiền.
/// @dev Điểm tự sync từ vault (tránh tin cậy input ngoài); thưởng từ pool mùa.
contract BattlePass is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Season {
        uint256 id;
        uint256 startEpoch;
        uint256 endEpoch;
        uint256 pool;
        uint256[] tierThresholds; // điểm cần để đạt tier
        uint256[] tierRewards; // thưởng mỗi tier (song song mảng trên)
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;

    uint256 public currentSeasonId;
    mapping(uint256 => Season) internal _seasons;
    mapping(uint256 => mapping(address => uint256)) public points; // season -> wallet -> điểm
    mapping(uint256 => mapping(address => uint256)) public syncedStreak; // điểm đã đồng bộ
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public checkInDone; // season -> wallet -> epoch
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public tierClaimed;

    uint256 public constant POINTS_PER_STREAK = 100;
    uint256 public constant CHECK_IN_POINTS = 25;

    event SeasonStarted(uint256 indexed seasonId, uint256 startEpoch, uint256 endEpoch, uint256 pool);
    event Synced(address indexed wallet, uint256 seasonId, uint256 totalPoints);
    event CheckedIn(address indexed wallet, uint256 seasonId, uint256 epoch);
    event TierClaimed(address indexed wallet, uint256 seasonId, uint256 tier, uint256 reward);

    error NoSeason();
    error NothingNewToSync();
    error AlreadyCheckedIn();
    error NoDepositThisEpoch();
    error TierLocked();
    error AlreadyClaimed();
    error RewardPoolEmpty();

    constructor(IERC20 token_, IStreakVault vault_) Ownable(msg.sender) {
        token = token_;
        vault = vault_;
    }

    function startSeason(uint256 startEpoch, uint256 endEpoch, uint256 pool, uint256[] calldata thresholds, uint256[] calldata rewards)
        external
        onlyOwner
        returns (uint256 seasonId)
    {
        require(thresholds.length == rewards.length && thresholds.length > 0, "bad tiers");
        token.safeTransferFrom(msg.sender, address(this), pool);
        seasonId = ++currentSeasonId;
        Season storage s = _seasons[seasonId];
        s.id = seasonId;
        s.startEpoch = startEpoch;
        s.endEpoch = endEpoch;
        s.pool = pool;
        for (uint256 i; i < thresholds.length; ++i) {
            s.tierThresholds.push(thresholds[i]);
            s.tierRewards.push(rewards[i]);
        }
        emit SeasonStarted(seasonId, startEpoch, endEpoch, pool);
    }

    /// @notice Đồng bộ điểm từ streak hiện tại (streak mới so với lần sync trước).
    function sync() external returns (uint256 totalPoints) {
        if (currentSeasonId == 0) revert NoSeason();
        uint256 streak = vault.getAccount(msg.sender).streak;
        uint256 last = syncedStreak[currentSeasonId][msg.sender];
        if (streak <= last) revert NothingNewToSync();
        uint256 gained = (streak - last) * POINTS_PER_STREAK;
        syncedStreak[currentSeasonId][msg.sender] = streak;
        points[currentSeasonId][msg.sender] += gained;
        emit Synced(msg.sender, currentSeasonId, points[currentSeasonId][msg.sender]);
        return points[currentSeasonId][msg.sender];
    }

    /// @notice Tính năng 22: check-in kỳ (phải đã gửi tiền trong kỳ hiện tại).
    function checkIn() external {
        if (currentSeasonId == 0) revert NoSeason();
        require(vault.hasStarted(), "not started");
        uint256 epoch = vault.currentEpoch();
        if (checkInDone[currentSeasonId][msg.sender][epoch]) revert AlreadyCheckedIn();
        if (vault.getAccount(msg.sender).currentDeposited == 0) revert NoDepositThisEpoch();
        checkInDone[currentSeasonId][msg.sender][epoch] = true;
        points[currentSeasonId][msg.sender] += CHECK_IN_POINTS;
        emit CheckedIn(msg.sender, currentSeasonId, epoch);
    }

    function claimTier(uint256 tierIndex) external nonReentrant {
        Season storage s = _seasons[currentSeasonId];
        if (s.id == 0) revert NoSeason();
        if (tierIndex >= s.tierThresholds.length) revert TierLocked();
        if (tierClaimed[currentSeasonId][msg.sender][tierIndex]) revert AlreadyClaimed();
        if (points[currentSeasonId][msg.sender] < s.tierThresholds[tierIndex]) revert TierLocked();

        uint256 reward = s.tierRewards[tierIndex];
        if (reward > s.pool) revert RewardPoolEmpty();
        s.pool -= reward;
        tierClaimed[currentSeasonId][msg.sender][tierIndex] = true;
        token.safeTransfer(msg.sender, reward);
        emit TierClaimed(msg.sender, currentSeasonId, tierIndex, reward);
    }

    function seasonInfo(uint256 seasonId)
        external
        view
        returns (uint256 startEpoch, uint256 endEpoch, uint256 pool, uint256[] memory thresholds, uint256[] memory rewards)
    {
        Season storage s = _seasons[seasonId];
        return (s.startEpoch, s.endEpoch, s.pool, s.tierThresholds, s.tierRewards);
    }
}
