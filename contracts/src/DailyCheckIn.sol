// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title DailyCheckIn — điểm danh mỗi ngày (ranh giới 00:00 UTC), thưởng mUSDC từ pool đã nạp.
/// @notice Chuỗi điểm danh tăng dần khi điểm liên tiếp, reset về 1 nếu bỏ ngày.
///         Chuỗi điểm danh là chuỗi PHỤ — không ảnh hưởng streak tiết kiệm của StreakVault.
contract DailyCheckIn is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant DAY = 86400;

    IERC20 public immutable token;

    uint256 public baseReward = 200_000; // 0.2 mUSDC mỗi ngày
    uint256 public bonusBpsPerStreakDay = 500; // +5% mỗi ngày chuỗi
    uint256 public maxBonusBps = 10_000; // tối đa gấp đôi
    uint256 public rewardPool;

    mapping(address => uint256) public lastCheckInDay; // 0 = chưa điểm danh
    mapping(address => uint256) public checkInStreakDays;

    event CheckedIn(address indexed wallet, uint256 day, uint256 streakDays, uint256 reward);
    event Funded(address indexed funder, uint256 amount);

    error AlreadyCheckedIn();

    constructor(IERC20 token_) Ownable(msg.sender) {
        token = token_;
    }

    /// @notice Nạp pool thưởng — ai cũng nạp được.
    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
        emit Funded(msg.sender, amount);
    }

    function setRewards(uint256 base, uint256 perStreakBps, uint256 capBps) external onlyOwner {
        baseReward = base;
        bonusBpsPerStreakDay = perStreakBps;
        maxBonusBps = capBps;
    }

    function today() external view returns (uint256) {
        return block.timestamp / DAY;
    }

    /// @notice Phần thưởng dự kiến cho lượt tiếp theo (bị giới hạn bởi pool còn lại).
    function previewReward(address wallet) external view returns (uint256) {
        uint256 bonus = checkInStreakDays[wallet] * bonusBpsPerStreakDay;
        if (bonus > maxBonusBps) bonus = maxBonusBps;
        uint256 reward = baseReward + (baseReward * bonus) / 10_000;
        return reward > rewardPool ? rewardPool : reward;
    }

    function checkIn() external nonReentrant {
        uint256 day = block.timestamp / DAY;
        if (lastCheckInDay[msg.sender] == day) revert AlreadyCheckedIn();

        uint256 streak = checkInStreakDays[msg.sender];
        streak = (lastCheckInDay[msg.sender] == day - 1) ? streak + 1 : 1;
        checkInStreakDays[msg.sender] = streak;
        lastCheckInDay[msg.sender] = day;

        uint256 bonus = (streak - 1) * bonusBpsPerStreakDay;
        if (bonus > maxBonusBps) bonus = maxBonusBps;
        uint256 reward = baseReward + (baseReward * bonus) / 10_000;
        if (reward > rewardPool) reward = rewardPool;
        if (reward > 0) {
            rewardPool -= reward;
            token.safeTransfer(msg.sender, reward);
        }
        emit CheckedIn(msg.sender, day, streak, reward);
    }
}
