// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Gems} from "./Gems.sol";

/// @title DailyCheckIn (Tính năng 84 + 85 + 86)
/// @notice 84. Điểm danh mỗi ngày nhận Gems (1 lần/ngày, ranh giới 00:00 UTC).
///         85. Chuỗi điểm danh thưởng tăng dần: base * (100% + streakDay * bonusBps).
///         86. Bỏ một ngày reset chuỗi điểm danh (chỉ reset chuỗi phụ, KHÔNG đụng streak tiết kiệm).
/// @dev Có MINTER_ROLE của Gems; nguồn thưởng là lạm phát có kiểm soát trong game.
contract DailyCheckIn is ReentrancyGuard, AccessControl {
    uint256 public constant BASE_REWARD = 1 * 1e18; // 1 Gem
    uint256 public constant DAY = 86400;

    Gems public immutable gems;

    uint256 public bonusBpsPerStreakDay = 500; // +5%/ngày chuỗi
    uint256 public maxBonusBps = 10_000; // tối đa gấp đôi

    mapping(address => uint256) public lastCheckInDay; // 0 = chưa điểm danh
    mapping(address => uint256) public checkInStreakDays;

    event CheckedIn(address indexed wallet, uint256 day, uint256 streakDays, uint256 reward);

    error AlreadyCheckedIn();
    error NotStarted();

    constructor(Gems gems_) {
        require(address(gems_) != address(0), "zero gems");
        gems = gems_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setRewards(uint256 perDayBps, uint256 capBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bonusBpsPerStreakDay = perDayBps;
        maxBonusBps = capBps;
    }

    /// @notice Điểm danh hôm nay.
    function checkIn() external nonReentrant {
        uint256 day = block.timestamp / DAY;
        if (lastCheckInDay[msg.sender] == day) revert AlreadyCheckedIn();

        // Tính năng 86: chuỗi chỉ tăng khi điểm danh liên tiếp ngày, ngược lại về 1.
        uint256 streakDays = (lastCheckInDay[msg.sender] == day - 1) ? checkInStreakDays[msg.sender] + 1 : 1;
        lastCheckInDay[msg.sender] = day;
        checkInStreakDays[msg.sender] = streakDays;

        uint256 bonusBps = streakDays * bonusBpsPerStreakDay;
        if (bonusBps > maxBonusBps) bonusBps = maxBonusBps;
        uint256 reward = BASE_REWARD + (BASE_REWARD * bonusBps) / 10_000;
        gems.mint(msg.sender, reward);
        emit CheckedIn(msg.sender, day, streakDays, reward);
    }

    /// @notice Ngày (UTC) hiện tại theo block.timestamp.
    function today() external view returns (uint256) {
        return block.timestamp / DAY;
    }
}
