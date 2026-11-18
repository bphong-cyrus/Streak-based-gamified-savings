// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {Gems} from "./Gems.sol";

/// @title FeeRebate (Tính năng 123 + 124 + 125)
/// @notice 123. Hoàn phí theo streak: streak càng dài, hoàn càng nhiều.
///         124. Cấp rebate định kỳ: mỗi `intervalEpochs` kỳ được claim một lần.
///         125. Rebate tự chọn nhận bằng mUSDC hoặc quy đổi sang Gems.
/// @dev Khoản hoàn là khuyến khích từ pool vận hành (không truy vết phí thật); đổi Gems mint qua MINTER_ROLE.
contract FeeRebate is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IStreakVault public immutable vault;
    IERC20 public immutable token;
    Gems public immutable gems;

    uint256 public intervalEpochs = 4; // Tính năng 124
    uint256 public baseRebate = 1e5; // 0.1 mUSDC mỗi lần claim
    uint256 public perStreakBonus = 5e4; // +0.05 mUSDC mỗi streak
    uint256 public maxRebate = 1e6; // 1 mUSDC
    uint256 public gemPerMusd = 100 * 1e12; // 1 mUSDC = 100 Gems (6d -> 18d)

    uint256 public rebatePool;
    mapping(address => uint256) internal _lastClaimEpoch;

    event RebateClaimed(address indexed wallet, uint256 amount, bool asGems);
    event PoolFunded(address indexed funder, uint256 amount);

    error TooSoon(uint256 claimableAtEpoch);
    error NoStreak();

    constructor(IStreakVault vault_, IERC20 token_, Gems gems_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
        gems = gems_;
    }

    function fundPool(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        rebatePool += amount;
        emit PoolFunded(msg.sender, amount);
    }

    function setParams(uint256 interval, uint256 base, uint256 perStreak, uint256 cap, uint256 gemRate) external onlyOwner {
        intervalEpochs = interval;
        baseRebate = base;
        perStreakBonus = perStreak;
        maxRebate = cap;
        gemPerMusd = gemRate;
    }

    /// @notice Tính năng 123 + 124: claim rebate theo chu kỳ, số tiền tăng theo streak.
    /// @param asGems Tính năng 125: true = nhận Gems (giá trị tương đương), false = nhận mUSDC.
    function claim(bool asGems) external nonReentrant {
        require(vault.hasStarted(), "not started");
        uint256 epoch = vault.currentEpoch();
        uint256 streak = vault.getAccount(msg.sender).streak;
        if (streak == 0) revert NoStreak();
        if (epoch < _lastClaimEpoch[msg.sender] + intervalEpochs) {
            revert TooSoon(_lastClaimEpoch[msg.sender] + intervalEpochs);
        }
        _lastClaimEpoch[msg.sender] = epoch;

        uint256 amount = baseRebate + streak * perStreakBonus;
        if (amount > maxRebate) amount = maxRebate;
        if (amount > rebatePool) amount = rebatePool;
        rebatePool -= amount;

        if (asGems) {
            gems.mint(msg.sender, amount * gemPerMusd / 1e6);
        } else {
            token.safeTransfer(msg.sender, amount);
        }
        emit RebateClaimed(msg.sender, amount, asGems);
    }

    function nextClaimEpoch(address wallet) external view returns (uint256) {
        return _lastClaimEpoch[wallet] + intervalEpochs;
    }
}
