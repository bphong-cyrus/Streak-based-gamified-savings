// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title SavingsBond (Tính năng 72 + 73 + 74)
/// @notice 72. Trái phiếu tiết kiệm kỳ hạn: khóa mUSDC N kỳ, đáo hạn nhận gốc + coupon.
///         73. Lãi coupon thưởng theo streak: ngườ có streak cao khi phát hành nhận coupon tốt hơn.
///         74. Chuyển nhượng bond: bán/trade bond trước đáo hạn bằng transfer đơn giản.
/// @dev Coupon trả từ pool owner nạp; rút trước hạn được nhưng mất coupon và trả phạt phí phát hành.
contract SavingsBond is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;

    enum BondState {
        ACTIVE,
        REDEEMED,
        TRANSFERRED // chỉ để lịch sử; bond vẫn ACTIVE với chủ mới

    }

    struct Bond {
        uint256 id;
        address owner;
        uint256 principal;
        uint256 issuedEpoch;
        uint256 maturityEpoch; // đáo hạn sau kỳ này kết thúc
        uint256 coupon; // tổng coupon dự kiến
        BondState state;
    }

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public bondCount;
    mapping(uint256 => Bond) public bonds;
    mapping(address => uint256) public bondCountOf;

    /// @dev Thang coupon theo streak khi phát hành (Tính năng 73): streak >= mức -> bps.
    uint256 public baseCouponBps = 500; // 5%
    uint256 public streakBonusPerEpoch = 50; // +0.5% mỗi streak, tối đa +5%
    uint256 public earlyExitPenaltyBps = 1_000; // 10% phạt rút trước hạn

    uint256 public couponPool;

    event BondIssued(uint256 indexed bondId, address indexed owner, uint256 principal, uint256 maturityEpoch, uint256 coupon);
    event BondRedeemed(uint256 indexed bondId, address indexed owner, uint256 principal, uint256 coupon);
    event BondTransferred(uint256 indexed bondId, address indexed from, address indexed to);
    event CouponFunded(address indexed funder, uint256 amount);

    error NoBond();
    error NotBondOwner();
    error BondRedeemedAlready();

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    function fundCoupons(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        couponPool += amount;
        emit CouponFunded(msg.sender, amount);
    }

    function setTerms(uint256 baseBps, uint256 perStreakBps, uint256 penaltyBps) external onlyOwner {
        baseCouponBps = baseBps;
        streakBonusPerEpoch = perStreakBps;
        earlyExitPenaltyBps = penaltyBps;
    }

    /// @notice Tính năng 72 + 73: phát hành bond khóa `amount` trong `lockEpochs` kỳ.
    /// @dev Coupon = principal * (base + min(streak,10)*perStreak) * lockEpochs / 10000 / epochsPerYear quy ước 52.
    function issue(uint256 amount, uint256 lockEpochs) external nonReentrant returns (uint256 bondId) {
        require(amount > 0 && lockEpochs >= 2, "bad bond");
        require(vault.hasStarted(), "not started");
        uint256 epoch = vault.currentEpoch();

        uint256 streak = vault.getAccount(msg.sender).streak;
        uint256 streakBonus = Math.min(streak, 10) * streakBonusPerEpoch;
        uint256 bps = baseCouponBps + streakBonus;
        uint256 coupon = Math.mulDiv(amount, bps * lockEpochs, BPS * 52);
        if (coupon > couponPool) coupon = couponPool;

        token.safeTransferFrom(msg.sender, address(this), amount);
        couponPool -= coupon;

        bondId = ++bondCount;
        bonds[bondId] = Bond({
            id: bondId,
            owner: msg.sender,
            principal: amount,
            issuedEpoch: epoch,
            maturityEpoch: epoch + lockEpochs,
            coupon: coupon,
            state: BondState.ACTIVE
        });
        bondCountOf[msg.sender] += 1;
        emit BondIssued(bondId, msg.sender, amount, epoch + lockEpochs, coupon);
    }

    /// @notice Đáo hạn: nhận gốc + coupon. Trước đáo hạn: nhận gốc - phạt, mất coupon.
    function redeem(uint256 bondId) external nonReentrant {
        Bond storage b = bonds[bondId];
        if (b.id == 0 || b.state != BondState.ACTIVE) revert NoBond();
        if (b.owner != msg.sender) revert NotBondOwner();
        b.state = BondState.REDEEMED;
        bondCountOf[msg.sender] -= 1;

        uint256 epoch = vault.hasStarted() ? vault.currentEpoch() : 0;
        uint256 payout = b.principal;
        uint256 coupon;
        if (epoch >= b.maturityEpoch) {
            coupon = b.coupon;
        } else {
            uint256 penalty = Math.mulDiv(b.principal, earlyExitPenaltyBps, BPS);
            payout = b.principal - penalty;
            couponPool += b.coupon; // coupon chưa dùng trả lại pool
        }
        token.safeTransfer(msg.sender, payout + coupon);
        emit BondRedeemed(bondId, msg.sender, payout, coupon);
    }

    /// @notice Tính năng 74: chuyển nhượng bond cho ngườ mua (trực tiếp, tin tưởng đối tác — demo).
    function transferBond(uint256 bondId, address to) external {
        Bond storage b = bonds[bondId];
        if (b.id == 0 || b.state != BondState.ACTIVE) revert BondRedeemedAlready();
        if (b.owner != msg.sender) revert NotBondOwner();
        if (to == address(0)) revert NotBondOwner();
        b.owner = to;
        bondCountOf[msg.sender] -= 1;
        bondCountOf[to] += 1;
        emit BondTransferred(bondId, msg.sender, to);
    }

    function previewCoupon(address wallet, uint256 amount, uint256 lockEpochs) external view returns (uint256) {
        uint256 streak = vault.getAccount(wallet).streak;
        uint256 bps = baseCouponBps + Math.min(streak, 10) * streakBonusPerEpoch;
        uint256 coupon = Math.mulDiv(amount, bps * lockEpochs, BPS * 52);
        return coupon > couponPool ? couponPool : coupon;
    }
}
