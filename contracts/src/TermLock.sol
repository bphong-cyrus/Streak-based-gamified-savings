// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title TermLock (Tính năng 78 + 79 + 80)
/// @notice 78. Khóa gốc N kỳ đổi boost: cam kết không rút để nhận thưởng khóa từ pool.
///         79. Rút trước hạn bị phạt (phần phạt về pool, không ai bị mất trắng).
///         80. Chứng nhận khóa: NFT (ERC-1155-free) dạng id + sự kiện, có thể dùng làm huy hiệu.
/// @dev Kỳ hạn tính theo epoch của vault; thưởng = principal * bps * epochs / 10000 / 52.
contract TermLock is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_LOCK_EPOCHS = 52;

    struct Lock {
        uint256 id;
        address owner;
        uint256 principal;
        uint256 startEpoch;
        uint256 endEpoch; // kết thúc sau kỳ này
        uint256 reward; // thưởng đã cam kết
        bool active;
    }

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public lockCount;
    mapping(uint256 => Lock) public locks;
    mapping(address => uint256) public activeLocksOf;

    uint256 public rewardBpsPerYear = 1_000; // 10%/năm quy ước 52 kỳ
    uint256 public earlyPenaltyBps = 2_000; // 20% phạt rút trước hạn
    uint256 public rewardPool;

    event LockCreated(uint256 indexed lockId, address indexed owner, uint256 principal, uint256 endEpoch, uint256 reward);
    event LockReleased(uint256 indexed lockId, address indexed owner, uint256 principal, uint256 reward, bool early);
    event RewardFunded(address indexed funder, uint256 amount);

    error NoLock();
    error NotLockOwner();
    error LockEnded();

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    function fundRewards(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
        emit RewardFunded(msg.sender, amount);
    }

    function setTerms(uint256 bpsPerYear, uint256 penaltyBps) external onlyOwner {
        rewardBpsPerYear = bpsPerYear;
        earlyPenaltyBps = penaltyBps;
    }

    /// @notice Tính năng 78: khóa `amount` trong `epochs` kỳ (tối đa 52), nhận thưởng cam kết.
    function lock(uint256 amount, uint256 epochs) external nonReentrant returns (uint256 lockId) {
        require(vault.hasStarted(), "not started");
        require(amount > 0 && epochs >= 1 && epochs <= MAX_LOCK_EPOCHS, "bad lock");
        uint256 epoch = vault.currentEpoch();

        uint256 reward = Math.mulDiv(amount, rewardBpsPerYear * epochs, BPS * 52);
        if (reward > rewardPool) reward = rewardPool;

        token.safeTransferFrom(msg.sender, address(this), amount);
        rewardPool -= reward;

        lockId = ++lockCount;
        locks[lockId] = Lock({
            id: lockId,
            owner: msg.sender,
            principal: amount,
            startEpoch: epoch,
            endEpoch: epoch + epochs,
            reward: reward,
            active: true
        });
        activeLocksOf[msg.sender] += 1;
        emit LockCreated(lockId, msg.sender, amount, epoch + epochs, reward);
    }

    /// @notice Kết thúc khóa: đúng hạn nhận gốc + thưởng; sớm nhận gốc - phạt, mất thưởng (về pool).
    /// @dev Tính năng 79 + 80: event LockReleased kèm flag early làm bằng chứng khóa/hủy khóa.
    function release(uint256 lockId) external nonReentrant {
        Lock storage l = locks[lockId];
        if (!l.active) revert NoLock();
        if (l.owner != msg.sender) revert NotLockOwner();

        uint256 epoch = vault.hasStarted() ? vault.currentEpoch() : 0;
        bool early = epoch < l.endEpoch;
        l.active = false;
        activeLocksOf[msg.sender] -= 1;

        uint256 payout = l.principal;
        uint256 reward;
        if (early) {
            uint256 penalty = Math.mulDiv(l.principal, earlyPenaltyBps, BPS);
            payout = l.principal - penalty;
            rewardPool += l.reward; // thưởng trả lại pool
        } else {
            reward = l.reward;
        }
        token.safeTransfer(msg.sender, payout + reward);
        emit LockReleased(lockId, msg.sender, payout, reward, early);
    }
}
