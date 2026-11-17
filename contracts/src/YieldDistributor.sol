// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {IMockYieldSource} from "./interfaces/IMockYieldSource.sol";

/// @title YieldDistributor
/// @notice Chốt lần lượt các kỳ đã kết thúc, chia ngân sách theo streak, quản lý rollover và claim.
contract YieldDistributor is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct EpochSummary {
        bool finalized;
        uint256 funded; // Ngân sách mock source của kỳ
        uint256 rolloverIn; // Phần chuyển từ kỳ trước
        uint256 budget; // funded + rolloverIn
        uint256 totalWeight;
        uint256 distributed; // Tổng thưởng đã ghi cho các ví
        uint256 rolloverOut; // budget - distributed
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;
    IMockYieldSource public immutable yieldSource;

    uint256 public nextEpochToFinalize;
    /// @notice Ngân sách chưa phân bổ, chuyển sang kỳ kế tiếp.
    uint256 public rollover;
    /// @notice Tổng thưởng đang chờ claim của mọi ví.
    uint256 public totalClaimable;

    mapping(address => uint256) public claimableYield;
    mapping(address => uint256) public claimedYield;
    mapping(address => mapping(uint256 => uint256)) public rewardOf;
    mapping(uint256 => EpochSummary) internal _summaries;

    event EpochFinalized(
        uint256 indexed epoch,
        uint256 budget,
        uint256 totalWeight,
        uint256 distributed,
        uint256 rolloverOut,
        address indexed caller
    );
    event RewardAllocated(address indexed wallet, uint256 indexed epoch, uint256 amount);
    event YieldClaimed(address indexed wallet, uint256 amount);

    error ZeroAddress();
    error EpochOutOfOrder(uint256 expected, uint256 got);
    error EpochNotEnded(uint256 epoch, uint256 endsAt);
    error NothingToClaim();

    constructor(IERC20 token_, IStreakVault vault_, IMockYieldSource yieldSource_) {
        if (address(token_) == address(0) || address(vault_) == address(0) || address(yieldSource_) == address(0)) {
            revert ZeroAddress();
        }
        token = token_;
        vault = vault_;
        yieldSource = yieldSource_;
    }

    /// @notice Ai cũng có thể gọi khi `epoch == nextEpochToFinalize` và kỳ đã kết thúc.
    function finalizeEpoch(uint256 epoch) external nonReentrant {
        if (epoch != nextEpochToFinalize) revert EpochOutOfOrder(nextEpochToFinalize, epoch);
        uint256 end = vault.epochEnd(epoch);
        if (block.timestamp < end) revert EpochNotEnded(epoch, end);
        nextEpochToFinalize = epoch + 1;

        (address[] memory wallets, uint256[] memory weights, uint256 totalWeight) = vault.settleEpoch(epoch);
        uint256 funded = yieldSource.release(epoch);

        uint256 rolloverIn = rollover;
        uint256 budget = funded + rolloverIn;
        uint256 distributed;

        if (totalWeight > 0 && budget > 0) {
            for (uint256 i; i < wallets.length; ++i) {
                uint256 w = weights[i];
                if (w == 0) continue;
                uint256 reward = Math.mulDiv(budget, w, totalWeight);
                if (reward == 0) continue;
                address wallet = wallets[i];
                rewardOf[wallet][epoch] = reward;
                claimableYield[wallet] += reward;
                distributed += reward;
                emit RewardAllocated(wallet, epoch, reward);
            }
        }

        uint256 rolloverOut = budget - distributed;
        rollover = rolloverOut;
        totalClaimable += distributed;

        _summaries[epoch] = EpochSummary({
            finalized: true,
            funded: funded,
            rolloverIn: rolloverIn,
            budget: budget,
            totalWeight: totalWeight,
            distributed: distributed,
            rolloverOut: rolloverOut
        });

        emit EpochFinalized(epoch, budget, totalWeight, distributed, rolloverOut, msg.sender);
    }

    /// @notice Nhận toàn bộ thưởng đang chờ về ví gọi.
    function claimYield() external nonReentrant returns (uint256 amount) {
        amount = claimableYield[msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimableYield[msg.sender] = 0;
        claimedYield[msg.sender] += amount;
        totalClaimable -= amount;
        token.safeTransfer(msg.sender, amount);
        emit YieldClaimed(msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getEpochSummary(uint256 epoch) external view returns (EpochSummary memory) {
        return _summaries[epoch];
    }

    /// @notice true nếu `nextEpochToFinalize` đã hết hạn và có thể chốt ngay.
    function canFinalize() external view returns (bool) {
        return block.timestamp >= vault.epochEnd(nextEpochToFinalize);
    }
}
