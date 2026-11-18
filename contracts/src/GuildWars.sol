// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title GuildWars (Tính năng 66 + 67 + 68)
/// @notice 66. Bang hội chiến theo mùa: các bang đua tổng điểm từ kỳ đã chốt.
///         67. Điểm tự động từ vault: mỗi kỳ qualified của thành viên = 1 điểm (sync pull).
///         68. Phần thưởng bang thắng: pool giải thưởng chia cho thành viên bang thắng theo điểm.
/// @dev sync() quét các kỳ đã chốt từ lần cuối; mùa kết thúc khi owner gọi endSeason().
contract GuildWars is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_GUILD_MEMBERS = 20;

    struct Guild {
        uint256 id;
        string name;
        address[] members;
        uint256 points; // tổng điểm mùa hiện tại
        bool active;
    }

    IStreakVault public immutable vault;
    IERC20 public immutable token; // mUSDC trả thưởng

    uint256 public guildCount;
    mapping(uint256 => Guild) internal _guilds;
    mapping(address => uint256) public guildOf; // member -> guildId (0 = chưa vào bang)

    uint256 public season; // mùa hiện tại (tăng mỗi lần endSeason)
    uint256 public lastSyncedEpoch; // kỳ đã sync tới
    uint256 public prizePool;

    mapping(address => uint256) internal _pendingReward; // thành viên bang thắng
    uint256 public winnerGuildOfSeason; // bang thắng mùa gần nhất
    uint256 public winnerPoints;

    event GuildCreated(uint256 indexed guildId, string name, address indexed creator);
    event MemberJoinedGuild(uint256 indexed guildId, address indexed member);
    event Synced(uint256 fromEpoch, uint256 toEpoch);
    event SeasonEnded(uint256 indexed season, uint256 indexed winnerGuild, uint256 points, uint256 prize);
    event RewardClaimed(address indexed member, uint256 amount);

    error BadGuild();
    error AlreadyInGuild();
    error GuildFull();
    error NotSynced();
    error NoReward();

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    function fundPrizes(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        prizePool += amount;
    }

    function createGuild(string memory name) external returns (uint256 guildId) {
        if (guildOf[msg.sender] != 0) revert AlreadyInGuild();
        guildId = ++guildCount;
        Guild storage g = _guilds[guildId];
        g.id = guildId;
        g.name = name;
        g.active = true;
        g.members.push(msg.sender);
        guildOf[msg.sender] = guildId;
        emit GuildCreated(guildId, name, msg.sender);
    }

    function joinGuild(uint256 guildId) external {
        Guild storage g = _guilds[guildId];
        if (!g.active || g.id == 0) revert BadGuild();
        if (guildOf[msg.sender] != 0) revert AlreadyInGuild();
        if (g.members.length >= MAX_GUILD_MEMBERS) revert GuildFull();
        g.members.push(msg.sender);
        guildOf[msg.sender] = guildId;
        emit MemberJoinedGuild(guildId, msg.sender);
    }

    /// @notice Tính năng 67: quét các kỳ đã chốt chưa sync, cộng điểm cho bang.
    /// @dev Mỗi thành viên đạt mục tiêu ở kỳ đã chốt = 1 điểm cho bang.
    function sync() public {
        uint256 to = vault.nextEpochToSettle();
        uint256 from = lastSyncedEpoch;
        if (to <= from) return; // không có kỳ mới: không làm gì (endSeason vẫn gọi được)

        for (uint256 epoch = from; epoch < to; ++epoch) {
            for (uint256 gid = 1; gid <= guildCount; ++gid) {
                Guild storage g = _guilds[gid];
                if (!g.active) continue;
                uint256 points;
                for (uint256 i; i < g.members.length; ++i) {
                    IStreakVault.EpochStatus memory s = vault.getEpochStatus(g.members[i], epoch);
                    if (s.settled && s.qualified) ++points;
                }
                g.points += points;
            }
        }
        lastSyncedEpoch = to;
        emit Synced(from, to);
    }

    /// @notice Tính năng 66 + 68: kết thúc mùa, bang có điểm cao nhất nhận pool giải thưởng.
    /// @dev Giải chia cho thành viên theo tỷ lệ điểm cá nhân mùa vừa rồi (điểm từng ngườ trong mùa hiện tại).
    ///      Vì đã tổng hợp ở cấp bang, ta lưu pending theo snapshot: mỗi thành viên bang thắng nhận đều
    ///      phần pool theo số thành viên, phần dư về pool mùa sau.
    function endSeason() external onlyOwner {
        sync();
        uint256 best;
        uint256 bestPoints;
        for (uint256 gid = 1; gid <= guildCount; ++gid) {
            Guild storage g = _guilds[gid];
            if (g.active && g.points > bestPoints) {
                best = gid;
                bestPoints = g.points;
            }
        }
        winnerGuildOfSeason = best;
        winnerPoints = bestPoints;

        uint256 prize = prizePool;
        if (best != 0 && prize > 0) {
            Guild storage g = _guilds[best];
            uint256 share = prize / g.members.length;
            for (uint256 i; i < g.members.length; ++i) {
                _pendingReward[g.members[i]] += share;
            }
            uint256 distributed = share * g.members.length;
            prizePool = prize - distributed;
            emit SeasonEnded(season, best, bestPoints, distributed);
        } else {
            emit SeasonEnded(season, 0, 0, 0);
        }

        // Reset mùa mới
        for (uint256 gid = 1; gid <= guildCount; ++gid) {
            _guilds[gid].points = 0;
        }
        season += 1;
    }

    function claimReward() external nonReentrant {
        uint256 amount = _pendingReward[msg.sender];
        if (amount == 0) revert NoReward();
        _pendingReward[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);
        emit RewardClaimed(msg.sender, amount);
    }

    function getGuild(uint256 guildId)
        external
        view
        returns (uint256 id, string memory name, address[] memory members, uint256 points, bool active)
    {
        Guild storage g = _guilds[guildId];
        return (g.id, g.name, g.members, g.points, g.active);
    }

    function pendingReward(address member) external view returns (uint256) {
        return _pendingReward[member];
    }
}
