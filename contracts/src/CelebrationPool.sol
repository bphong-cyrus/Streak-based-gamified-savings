// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title CelebrationPool (Tính năng 60 + 61 + 62)
/// @notice 60. Quỹ mừng milestone chung: ai cũng góp, ai đạt streak mốc được chia từ quỹ.
///         61. Trả tự động theo mốc: đạt mốc 5/10/20 gọi celebrate() nhận thưởng một lần mỗi mốc.
///         62. Tip vào quỹ kèm lờ chúc (event TipWithMessage).
/// @dev Cơ chế "tự động" thực tế là pull: ngườ đạt mốc gọi celebrate() để nhận.
contract CelebrationPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MILESTONE_COUNT = 3;
    uint256[MILESTONE_COUNT] public milestones = [5, 10, 20];
    uint256[MILESTONE_COUNT] public milestonePrize = [1 * 1e6, 3 * 1e6, 10 * 1e6]; // mUSDC

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public pool;
    mapping(address => uint256) public totalTipped;
    mapping(address => uint256) internal _claimedMask; // wallet -> bitmask mốc đã nhận
    uint256 public celebrationCount;

    event PoolFunded(address indexed funder, uint256 amount);
    event TipWithMessage(address indexed from, uint256 amount, string message);
    event Celebrated(address indexed wallet, uint256 streak, uint256 prize);

    error NoMilestone();
    error NoPrize();

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        pool += amount;
        emit PoolFunded(msg.sender, amount);
    }

    /// @notice Tính năng 62: tip vào quỹ kèm lờ chúc hiển thị trên feed.
    function tip(string memory message, uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        pool += amount;
        totalTipped[msg.sender] += amount;
        emit TipWithMessage(msg.sender, amount, message);
    }

    /// @notice Tính năng 60 + 61: nhận thưởng mốc streak từ quỹ (mỗi mốc một lần).
    function celebrate() external nonReentrant {
        uint256 streak = vault.getAccount(msg.sender).streak;
        uint256 mask = _claimedMask[msg.sender];
        uint256 payout;
        for (uint256 i; i < MILESTONE_COUNT; ++i) {
            if (streak >= milestones[i] && (mask & (1 << i)) == 0) {
                mask |= 1 << i;
                uint256 prize = milestonePrize[i];
                if (prize > pool) prize = pool;
                pool -= prize;
                payout += prize;
            }
        }
        if (payout == 0) revert NoMilestone();
        _claimedMask[msg.sender] = mask;
        celebrationCount += 1;
        token.safeTransfer(msg.sender, payout);
        emit Celebrated(msg.sender, streak, payout);
    }

    function claimedMilestones(address wallet) external view returns (uint256) {
        return _claimedMask[wallet];
    }
}
