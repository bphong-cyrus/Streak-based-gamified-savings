// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title ReferralSeasons (Tính năng 14 + 20)
/// @notice 14. Mùa giới thiệu: điểm giới thiệu theo mùa, chia pool cuối mùa.
///         20. Mentorship: mentor nhận thưởng khi mentee đạt streak đầu tiên.
/// @dev Tách khỏi YieldDistributor.referrerOf để có chu kỳ mùa.
contract ReferralSeasons is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Season {
        uint256 id;
        uint256 startEpoch;
        uint256 endEpoch;
        uint256 pool;
        uint256 totalPoints;
        bool distributed;
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;

    uint256 public currentSeasonId;
    mapping(uint256 => Season) public seasons;
    /// @dev season -> referrer -> points.
    mapping(uint256 => mapping(address => uint256)) public points;
    /// @dev mentee -> mentor (một lần).
    mapping(address => address) public mentorOf;
    /// @dev mentor -> số mentee đã đạt streak đầu (Tính năng 20).
    mapping(address => uint256) public menteeSuccesses;

    uint256 public mentorshipReward = 1 * 1e6; // 1 mUSDC mỗi mentee đạt streak đầu

    event SeasonStarted(uint256 indexed seasonId, uint256 startEpoch, uint256 endEpoch, uint256 pool);
    event Referred(address indexed referrer, address indexed referee, uint256 indexed seasonId);
    event MenteeActivated(address indexed mentor, address indexed mentee);
    event SeasonDistributed(uint256 indexed seasonId);

    error SelfReferral();
    error AlreadyReferred();
    error NoSeason();
    error SeasonActive();
    error SeasonNotEnded();
    error NothingToClaim();

    constructor(IERC20 token_, IStreakVault vault_) Ownable(msg.sender) {
        token = token_;
        vault = vault_;
    }

    function startSeason(uint256 startEpoch, uint256 endEpoch, uint256 pool) external onlyOwner {
        if (currentSeasonId != 0 && !seasons[currentSeasonId].distributed) revert SeasonActive();
        token.safeTransferFrom(msg.sender, address(this), pool);
        uint256 id = ++currentSeasonId;
        seasons[id] = Season({id: id, startEpoch: startEpoch, endEpoch: endEpoch, pool: pool, totalPoints: 0, distributed: false});
        emit SeasonStarted(id, startEpoch, endEpoch, pool);
    }

    /// @notice Ngườ chơi gắn mentor/referrer của mình (một lần).
    function registerReferrer(address referrer) external {
        if (referrer == msg.sender) revert SelfReferral();
        if (mentorOf[msg.sender] != address(0)) revert AlreadyReferred();
        if (currentSeasonId == 0) revert NoSeason();
        mentorOf[msg.sender] = referrer;
        points[currentSeasonId][referrer] += 1;
        seasons[currentSeasonId].totalPoints += 1;
        emit Referred(referrer, msg.sender, currentSeasonId);
    }

    /// @notice Tính năng 20: mentor gọi sau khi mentee đã kích hoạt và đạt streak >= 1.
    function claimMentorship(address mentee) external nonReentrant {
        address mentor = mentorOf[mentee];
        if (mentor != msg.sender) revert NothingToClaim();
        if (vault.getAccount(mentee).streak < 1) revert NothingToClaim();
        if (mentorshipReward > token.balanceOf(address(this))) revert NothingToClaim();
        menteeSuccesses[mentor] += 1;
        // Đánh dấu đã nhận bằng cách xóa gắn kết
        mentorOf[mentee] = address(0);
        token.safeTransfer(mentor, mentorshipReward);
        emit MenteeActivated(mentor, mentee);
    }

    /// @notice Chia pool cuối mùa theo điểm (ai cũng gọi được sau khi mùa kết thúc).
    function distribute(uint256 seasonId) external nonReentrant {
        Season storage s = seasons[seasonId];
        if (s.id == 0) revert NoSeason();
        if (!s.distributed) {
            if (vault.hasStarted() && vault.currentEpoch() < s.endEpoch) revert SeasonNotEnded();
            s.distributed = true;
            emit SeasonDistributed(seasonId);
        }
        uint256 p = points[seasonId][msg.sender];
        if (p == 0) revert NothingToClaim();
        uint256 share = (s.pool * p) / s.totalPoints;
        points[seasonId][msg.sender] = 0;
        token.safeTransfer(msg.sender, share);
    }
}
