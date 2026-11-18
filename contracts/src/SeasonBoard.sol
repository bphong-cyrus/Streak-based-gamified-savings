// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {Leaderboard} from "./Leaderboard.sol";

/// @title SeasonBoard (Tính năng 30)
/// @notice Bảng xếp hạng theo mùa: chụp điểm Leaderboard đầu mùa & cuối mùa;
///         thưởng cho top theo mức tăng điểm trong mùa.
contract SeasonBoard is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Season {
        uint256 id;
        uint256 startEpoch;
        uint256 endEpoch;
        uint256 pool;
        uint256 topN; // số ngườ được thưởng
        bool ended;
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;
    Leaderboard public immutable board;

    uint256 public currentSeasonId;
    mapping(uint256 => Season) public seasons;
    mapping(uint256 => mapping(address => uint256)) public startScore; // season -> wallet -> điểm đầu mùa
    mapping(uint256 => mapping(address => bool)) public recorded; // đã chụp đầu mùa

    event SeasonStarted(uint256 indexed seasonId, uint256 startEpoch, uint256 endEpoch, uint256 pool, uint256 topN);
    event SeasonEnded(uint256 indexed seasonId);
    error NoSeason();
    error SeasonNotEnded();
    error NotRecorded();

    constructor(IERC20 token_, IStreakVault vault_, Leaderboard board_) Ownable(msg.sender) {
        token = token_;
        vault = vault_;
        board = board_;
    }

    function startSeason(uint256 startEpoch, uint256 endEpoch, uint256 pool, uint256 topN) external onlyOwner {
        token.safeTransferFrom(msg.sender, address(this), pool);
        uint256 id = ++currentSeasonId;
        seasons[id] = Season({id: id, startEpoch: startEpoch, endEpoch: endEpoch, pool: pool, topN: topN, ended: false});
        emit SeasonStarted(id, startEpoch, endEpoch, pool, topN);
    }

    /// @notice Ngườ chơi ghi danh đầu mùa (chụp điểm baseline).
    function record() external {
        if (currentSeasonId == 0) revert NoSeason();
        if (recorded[currentSeasonId][msg.sender]) return;
        recorded[currentSeasonId][msg.sender] = true;
        startScore[currentSeasonId][msg.sender] = board.scoreOf(msg.sender);
    }

    /// @notice Kết thúc mùa (owner), trả thưởng cho top theo mức tăng điểm.
    /// @dev Tìm top N bằng cách duyệt participants (demo, <= 20 ví).
    function endSeason() external onlyOwner {
        Season storage s = seasons[currentSeasonId];
        if (s.id == 0) revert NoSeason();
        if (vault.hasStarted() && vault.currentEpoch() < s.endEpoch) revert SeasonNotEnded();
        s.ended = true;

        address[] memory participants = vault.getParticipants();
        uint256 n = participants.length;
        // Sắp xếp nổi bọt theo mức tăng điểm giảm dần (n <= 20)
        uint256[] memory gains = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            uint256 scoreNow = board.scoreOf(participants[i]);
            uint256 start = startScore[currentSeasonId][participants[i]];
            gains[i] = scoreNow > start ? scoreNow - start : 0;
        }
        for (uint256 i; i < n; ++i) {
            for (uint256 j = i + 1; j < n; ++j) {
                if (gains[j] > gains[i]) {
                    (gains[i], gains[j]) = (gains[j], gains[i]);
                    (participants[i], participants[j]) = (participants[j], participants[i]);
                }
            }
        }
        uint256 winners = n < s.topN ? n : s.topN;
        uint256 remaining = s.pool;
        for (uint256 i; i < winners && remaining > 0; ++i) {
            if (gains[i] == 0) break;
            uint256 prize = s.pool / (winners - i) < remaining ? s.pool / (winners - i) : remaining;
            remaining -= prize;
            token.safeTransfer(participants[i], prize);
        }
        s.pool = 0;
        emit SeasonEnded(currentSeasonId);
    }
}
