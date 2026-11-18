// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {IMockYieldSource} from "./interfaces/IMockYieldSource.sol";

/// @title YieldDistributor
/// @notice Chốt lần lượt các kỳ đã kết thúc, chia ngân sách theo streak,
///         hỗ trợ: phí yield về treasury, tách lãi cơ bản/lãi thưởng, hoa hồng giới thiệu, pause.
/// @dev Mặc định feeBps=0, baseRatioBps=0, referralBps=0 -> tương thích ngược bản MVP.
contract YieldDistributor is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;

    struct EpochSummary {
        bool finalized;
        uint256 funded; // Ngân sách mock source của kỳ
        uint256 rolloverIn; // Phần chuyển từ kỳ trước
        uint256 budget; // funded + rolloverIn
        uint256 fee; // Phí yield về treasury
        uint256 totalWeight;
        uint256 totalPrincipal; // Tổng gốc snapshot tại chốt (cho lãi cơ bản)
        uint256 distributed; // Tổng thưởng đã ghi cho các ví
        uint256 rolloverOut; // budget - fee - distributed
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;
    IMockYieldSource public immutable yieldSource;

    uint256 public nextEpochToFinalize;
    /// @notice Ngân sách chưa phân bổ, chuyển sang kỳ kế tiếp.
    uint256 public rollover;
    /// @notice Tổng thưởng đang chờ claim của mọi ví.
    uint256 public totalClaimable;

    // ---------------- Doanh thu / cấu hình chia ----------------
    address public treasury;
    uint256 public yieldFeeBps; // Phí trên budget mỗi kỳ
    uint256 public baseRatioBps; // % phần chia theo gốc (lãi cơ bản), phần còn lại theo streak
    uint256 public referralBps; // % hoa hồng người giới thiệu trên yield được claim

    mapping(address => uint256) public claimableYield;
    mapping(address => uint256) public claimedYield;
    mapping(address => bool) public autoCompound; // Tính năng 43: tự động tái đầu tư yield
    mapping(address => mapping(uint256 => uint256)) public rewardOf;
    mapping(uint256 => EpochSummary) internal _summaries;

    // ---------------- Giới thiệu ----------------
    mapping(address => address) public referrerOf; // wallet -> referrer
    mapping(address => uint256) public referralEarnings;

    event EpochFinalized(
        uint256 indexed epoch,
        uint256 budget,
        uint256 fee,
        uint256 totalWeight,
        uint256 distributed,
        uint256 rolloverOut,
        address indexed caller
    );
    event RewardAllocated(address indexed wallet, uint256 indexed epoch, uint256 amount);
    event YieldClaimed(address indexed wallet, uint256 amount);
    event AutoCompounded(address indexed wallet, uint256 amount);
    event AutoCompoundSet(address indexed wallet, bool enabled);
    event ReferralPaid(address indexed wallet, address indexed referrer, uint256 commission);
    event ReferrerSet(address indexed wallet, address indexed referrer);
    event TreasurySet(address indexed treasury);

    error ZeroAddress();
    error EpochOutOfOrder(uint256 expected, uint256 got);
    error EpochNotEnded(uint256 epoch, uint256 endsAt);
    error NothingToClaim();
    error InvalidReferrer();

    constructor(IERC20 token_, IStreakVault vault_, IMockYieldSource yieldSource_)
        Ownable(msg.sender)
    {
        if (address(token_) == address(0) || address(vault_) == address(0) || address(yieldSource_) == address(0)) {
            revert ZeroAddress();
        }
        token = token_;
        vault = vault_;
        yieldSource = yieldSource_;
    }

    // ---------------------------------------------------------------------
    // Admin config (owner)
    // ---------------------------------------------------------------------

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    function setYieldFeeBps(uint256 bps) external onlyOwner {
        require(bps <= BPS_DENOMINATOR, "fee>100%");
        yieldFeeBps = bps;
    }

    /// @notice Tỷ lệ lãi cơ bản (theo gốc). Phần còn lại là lãi thưởng theo streak.
    function setBaseRatioBps(uint256 bps) external onlyOwner {
        require(bps <= BPS_DENOMINATOR, "ratio>100%");
        baseRatioBps = bps;
    }

    function setReferralBps(uint256 bps) external onlyOwner {
        require(bps <= BPS_DENOMINATOR, "bps>100%");
        referralBps = bps;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Referral
    // ---------------------------------------------------------------------

    /// @notice Gắn người giới thiệu, chỉ một lần duy nhất.
    function setReferrer(address referrer) external {
        if (referrer == address(0) || referrer == msg.sender) revert InvalidReferrer();
        if (referrerOf[msg.sender] != address(0)) revert InvalidReferrer();
        referrerOf[msg.sender] = referrer;
        emit ReferrerSet(msg.sender, referrer);
    }

    // ---------------------------------------------------------------------
    // Finalize & claim
    // ---------------------------------------------------------------------

    /// @notice Ai cũng có thể gọi khi `epoch == nextEpochToFinalize` và kỳ đã kết thúc.
    function finalizeEpoch(uint256 epoch) external nonReentrant whenNotPaused {
        if (epoch != nextEpochToFinalize) revert EpochOutOfOrder(nextEpochToFinalize, epoch);
        uint256 end = vault.epochEnd(epoch);
        if (block.timestamp < end) revert EpochNotEnded(epoch, end);
        nextEpochToFinalize = epoch + 1;

        (address[] memory wallets, uint256[] memory weights, uint256[] memory principals, uint256 totalWeight) =
            vault.settleEpoch(epoch);
        uint256 funded = yieldSource.release(epoch);

        uint256 rolloverIn = rollover;
        uint256 budget = funded + rolloverIn;

        // 1) Phí yield về treasury
        uint256 fee;
        if (yieldFeeBps > 0 && budget > 0) {
            fee = Math.mulDiv(budget, yieldFeeBps, BPS_DENOMINATOR);
            if (treasury == address(0)) revert ZeroAddress();
            token.safeTransfer(treasury, fee);
        }

        uint256 distributable = budget - fee;
        uint256 basePart = Math.mulDiv(distributable, baseRatioBps, BPS_DENOMINATOR);
        uint256 bonusPart = distributable - basePart;

        // 2) Tổng gốc snapshot (cho lãi cơ bản)
        uint256 totalPrincipal = _sumPrincipals(principals);

        // 3) Chia thưởng: cơ bản theo gốc, thưởng theo streak
        uint256 distributed = _allocateRewards(epoch, wallets, weights, principals, totalPrincipal, totalWeight, basePart, bonusPart);

        uint256 rolloverOut = distributable - distributed;
        rollover = rolloverOut;
        totalClaimable += distributed;

        _summaries[epoch] = EpochSummary({
            finalized: true,
            funded: funded,
            rolloverIn: rolloverIn,
            budget: budget,
            fee: fee,
            totalWeight: totalWeight,
            totalPrincipal: totalPrincipal,
            distributed: distributed,
            rolloverOut: rolloverOut
        });

        emit EpochFinalized(epoch, budget, fee, totalWeight, distributed, rolloverOut, msg.sender);
    }

    function _sumPrincipals(uint256[] memory principals) internal pure returns (uint256 total) {
        for (uint256 i; i < principals.length; ++i) {
            total += principals[i];
        }
    }

    /// @dev Chia basePart theo gốc + bonusPart theo streak, ghi nhận reward từng ví.
    function _allocateRewards(
        uint256 epoch,
        address[] memory wallets,
        uint256[] memory weights,
        uint256[] memory principals,
        uint256 totalPrincipal,
        uint256 totalWeight,
        uint256 basePart,
        uint256 bonusPart
    ) internal returns (uint256 distributed) {
        if (basePart == 0 && bonusPart == 0) return 0;
        for (uint256 i; i < wallets.length; ++i) {
            uint256 reward;
            if (basePart > 0 && totalPrincipal > 0) {
                reward = Math.mulDiv(basePart, principals[i], totalPrincipal);
            }
            if (bonusPart > 0 && totalWeight > 0 && weights[i] > 0) {
                reward += Math.mulDiv(bonusPart, weights[i], totalWeight);
            }
            if (reward == 0) continue;
            address wallet = wallets[i];
            rewardOf[wallet][epoch] = reward;
            claimableYield[wallet] += reward;
            distributed += reward;
            emit RewardAllocated(wallet, epoch, reward);
        }
    }

    /// @notice Nhận toàn bộ thưởng đang chờ về ví gọi; trả hoa hồng người giới thiệu nếu có.
    function claimYield() external nonReentrant whenNotPaused returns (uint256 amount) {
        amount = claimableYield[msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimableYield[msg.sender] = 0;
        claimedYield[msg.sender] += amount;
        totalClaimable -= amount;

        address referrer = referrerOf[msg.sender];
        uint256 commission;
        if (referrer != address(0) && referralBps > 0) {
            commission = Math.mulDiv(amount, referralBps, BPS_DENOMINATOR);
            referralEarnings[referrer] += commission;
            token.safeTransfer(referrer, commission);
            emit ReferralPaid(msg.sender, referrer, commission);
        }
        emit YieldClaimed(msg.sender, amount);

        // Tính năng 43: auto-compound — yield tự gửi lại vào vault thay vì chuyển về ví.
        uint256 net = amount - commission;
        if (autoCompound[msg.sender] && net > 0 && vault.hasStarted()) {
            token.approve(address(vault), net);
            vault.depositFor(msg.sender, net);
            emit AutoCompounded(msg.sender, net);
        } else if (net > 0) {
            token.safeTransfer(msg.sender, net);
        }
    }

    function setAutoCompound(bool enabled) external {
        autoCompound[msg.sender] = enabled;
        emit AutoCompoundSet(msg.sender, enabled);
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
