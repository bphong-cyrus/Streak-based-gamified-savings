// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title MentorHub (Tính năng 57 + 58 + 59)
/// @notice 57. Gắn mentor một lần duy nhất (mentor phải đã kích hoạt vault).
///         58. Thưởng mentor: khi mentee đạt streak mốc (4/8/12/26), mentor nhận thưởng từ pool.
///         59. Hồ sơ mentor on-chain: số mentee, số mốc đã đưa mentee đạt được, hạng mentor.
/// @dev Mentee tự gọi reportMilestone() sau khi kỳ chốt để cập nhật; mỗi mốc chỉ trả một lần.
contract MentorHub is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MILESTONE_COUNT = 4;

    IStreakVault public immutable vault;
    IERC20 public immutable token; // mUSDC trả thưởng mentor

    /// @dev Các mốc streak cố định.
    uint256[MILESTONE_COUNT] public milestones = [4, 8, 12, 26];
    uint256[MILESTONE_COUNT] public milestoneBonus = [2 * 1e6, 4 * 1e6, 8 * 1e6, 20 * 1e6]; // mUSDC

    mapping(address => address) public mentorOf; // mentee -> mentor (một lần duy nhất)
    mapping(address => uint256) public menteeCount;
    mapping(address => uint256) public milestonesEarned; // mentor: tổng mốc mentee đạt
    mapping(address => uint256) public earnings; // mentor: thưởng đã ghi nhận (chưa claim)
    mapping(address => uint256) internal _claimedMilestoneMask; // mentee -> bitmask mốc đã trả

    uint256 public prizePool;

    event MentorSet(address indexed mentee, address indexed mentor);
    event MilestoneReported(address indexed mentee, address indexed mentor, uint256 streak, uint256 bonus);
    event MentorEarningsClaimed(address indexed mentor, uint256 amount);
    event PrizeFunded(address indexed funder, uint256 amount);

    error BadMentor();
    error NoMentor();
    error NoMilestone();

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    function fundPrizes(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        prizePool += amount;
        emit PrizeFunded(msg.sender, amount);
    }

    /// @notice Tính năng 57: gắn mentor, chỉ được gắn một lần.
    function setMentor(address mentor) external {
        if (mentor == address(0) || mentor == msg.sender) revert BadMentor();
        if (mentorOf[msg.sender] != address(0)) revert BadMentor();
        if (!vault.getAccount(mentor).activated) revert BadMentor();
        mentorOf[msg.sender] = mentor;
        menteeCount[mentor] += 1;
        emit MentorSet(msg.sender, mentor);
    }

    /// @notice Tính năng 58: mentee báo cáo mốc streak vừa đạt, trả thưởng cho mentor.
    /// @dev Mỗi mốc chỉ trả một lần cho mỗi mentee; phải sau khi kỳ đã chốt (streak đã cập nhật).
    function reportMilestone() external {
        address mentor = mentorOf[msg.sender];
        if (mentor == address(0)) revert NoMentor();
        uint256 streak = vault.getAccount(msg.sender).streak;
        uint256 mask = _claimedMilestoneMask[msg.sender];

        bool any;
        for (uint256 i; i < MILESTONE_COUNT; ++i) {
            if (streak >= milestones[i] && (mask & (1 << i)) == 0) {
                mask |= 1 << i;
                uint256 bonus = milestoneBonus[i];
                if (bonus > prizePool) bonus = prizePool;
                prizePool -= bonus;
                earnings[mentor] += bonus;
                milestonesEarned[mentor] += 1;
                emit MilestoneReported(msg.sender, mentor, streak, bonus);
                any = true;
            }
        }
        _claimedMilestoneMask[msg.sender] = mask;
        if (!any) revert NoMilestone();
    }

    function claimEarnings() external nonReentrant {
        uint256 amount = earnings[msg.sender];
        if (amount == 0) revert NoMilestone();
        earnings[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);
        emit MentorEarningsClaimed(msg.sender, amount);
    }

    /// @notice Tính năng 59: hạng mentor theo số mốc đã đưa mentee đạt được.
    function mentorTier(address mentor) external view returns (uint256) {
        uint256 m = milestonesEarned[mentor];
        if (m >= 20) return 4; // Platinum
        if (m >= 10) return 3; // Gold
        if (m >= 5) return 2; // Silver
        if (m >= 1) return 1; // Bronze
        return 0;
    }
}
