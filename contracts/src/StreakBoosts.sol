// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IBoostProvider} from "./interfaces/IBoostProvider.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title StreakBoosts
/// @notice Tính năng 33-37: hệ thống boost trọng số streak.
///   33. Deposit streak (gửi nhiều kỳ liên tiếp -> tier cao hơn)
///   34. Tier multiplier theo hạng (Bronze/Silver/Gold/Platinum)
///   35. Boost voucher (ERC-1155, tiêu hao, +X% một kỳ)
///   36. Boost windows (owner mở sự kiện boost toàn cục theo khoảng kỳ)
///   37. Stake tier NFT để duy trì hạng (kích hoạt tier mà không cần đủ streak tối thiểu)
/// @dev Là IBoostProvider, vault gọi weightMultiplier khi chốt kỳ.
contract StreakBoosts is ERC1155, Ownable, IBoostProvider {
    uint256 public constant BPS = 10_000;
    uint256 public constant VOUCHER_ID = 1; // voucher +50% một kỳ (Tính năng 35)

    enum Tier {
        NONE, // x1.0
        BRONZE, // x1.1 (33: deposit streak >= 2)
        SILVER, // x1.25 (streak >= 5)
        GOLD, // x1.5 (streak >= 12)
        PLATINUM // x2.0 (streak >= 26)

    }

    struct TierConfig {
        uint256 minStreak; // điều kiện streak
        uint256 minDepositStreak; // hoặc deposit streak (Tính năng 33)
        uint256 multiplierBps;
    }

    IStreakVault public immutable vault;

    TierConfig[5] public tiers; // index theo enum Tier
    /// @dev wallet -> epoch đã dùng voucher.
    mapping(address => uint256) internal _voucherUsedEpoch;
    /// @dev Boost window toàn cục (Tính năng 36): [startEpoch, endEpoch) -> bps.
    uint256 public windowStartEpoch;
    uint256 public windowEndEpoch;
    uint256 public windowBps;
    /// @dev Tier NFT stake (Tính năng 37): tokenId (tier) -> staked duy trì hạng tối thiểu.
    mapping(address => uint256) public stakedTier;

    event VoucherMinted(address indexed to, uint256 amount);
    event VoucherUsed(address indexed wallet, uint256 indexed epoch);
    event WindowOpened(uint256 startEpoch, uint256 endEpoch, uint256 bps);
    event TierStaked(address indexed wallet, uint256 tier);

    error NotActivated();

    constructor(IStreakVault vault_, string memory uri_) ERC1155(uri_) Ownable(msg.sender) {
        vault = vault_;
        // Tính năng 34: bảng hạng mặc định
        tiers[uint256(Tier.BRONZE)] = TierConfig({minStreak: 2, minDepositStreak: 2, multiplierBps: 11_000});
        tiers[uint256(Tier.SILVER)] = TierConfig({minStreak: 5, minDepositStreak: 5, multiplierBps: 12_500});
        tiers[uint256(Tier.GOLD)] = TierConfig({minStreak: 12, minDepositStreak: 12, multiplierBps: 15_000});
        tiers[uint256(Tier.PLATINUM)] = TierConfig({minStreak: 26, minDepositStreak: 26, multiplierBps: 20_000});
    }

    // ---------------- Admin ----------------

    function setTier(Tier tier, uint256 minStreak, uint256 minDepositStreak, uint256 bps) external onlyOwner {
        tiers[uint256(tier)] = TierConfig({minStreak: minStreak, minDepositStreak: minDepositStreak, multiplierBps: bps});
    }

    /// @notice Tính năng 36: mở cửa sổ boost toàn cục.
    function openWindow(uint256 startEpoch, uint256 endEpoch, uint256 bps) external onlyOwner {
        require(bps > BPS && endEpoch > startEpoch, "bad window");
        windowStartEpoch = startEpoch;
        windowEndEpoch = endEpoch;
        windowBps = bps;
        emit WindowOpened(startEpoch, endEpoch, bps);
    }

    function closeWindow() external onlyOwner {
        windowEndEpoch = 0;
        windowBps = 0;
    }

    /// @notice Phát voucher (owner/bot, Tính năng 35).
    function mintVoucher(address to, uint256 amount) external onlyOwner {
        _mint(to, VOUCHER_ID, amount, "");
        emit VoucherMinted(to, amount);
    }

    /// @notice Dùng voucher cho kỳ hiện tại (+50% trọng số kỳ này).
    function useVoucher() external {
        require(vault.hasStarted(), "not started");
        require(balanceOf(msg.sender, VOUCHER_ID) >= 1, "no voucher");
        uint256 epoch = vault.currentEpoch();
        require(_voucherUsedEpoch[msg.sender] != epoch + 1, "used this epoch");
        _burn(msg.sender, VOUCHER_ID, 1);
        _voucherUsedEpoch[msg.sender] = epoch + 1;
        emit VoucherUsed(msg.sender, epoch);
    }

    /// @notice Tính năng 37: stake tier NFT (id = tier) để giữ hạng tối thiểu.
    function stakeTier(Tier tier) external {
        require(tier > Tier.NONE && tier <= Tier.PLATINUM, "bad tier");
        require(balanceOf(msg.sender, uint256(tier)) >= 1, "no tier nft");
        stakedTier[msg.sender] = uint256(tier);
        emit TierStaked(msg.sender, uint256(tier));
    }

    // ---------------- Views ----------------

    function voucherActive(address wallet, uint256 epoch) public view returns (bool) {
        return _voucherUsedEpoch[wallet] == epoch + 1;
    }

    /// @notice Hạng hiện tại của ví (theo streak / deposit streak / stake).
    function tierOf(address wallet) public view returns (Tier) {
        uint256 streak = vault.getAccount(wallet).streak;
        uint256 best = uint256(Tier.NONE);
        for (uint256 t = 1; t <= 4; ++t) {
            TierConfig memory c = tiers[t];
            bool byStreak = streak >= c.minStreak;
            bool byDepositStreak = _depositStreakOf(wallet) >= c.minDepositStreak;
            if (byStreak || byDepositStreak) best = t;
        }
        // Tính năng 37: stake giữ hạng tối thiểu
        if (stakedTier[wallet] > best) best = stakedTier[wallet];
        return Tier(best);
    }

    /// @notice Tính năng 33: số kỳ gửi liên tiếp gần nhất (quét tối đa 64 kỳ).
    function _depositStreakOf(address wallet) internal view returns (uint256) {
        uint256 lastSettled = vault.nextEpochToSettle();
        uint256 count;
        for (uint256 e = lastSettled; e > 0 && count < 64; --e) {
            uint256 epoch = e - 1;
            IStreakVault.EpochStatus memory s = vault.getEpochStatus(wallet, epoch);
            if (!s.settled || s.deposited == 0) break;
            ++count;
        }
        return count;
    }

    /// @dev Tổng hệ số: max(tier, window) + voucher cộng thêm. Trả về bps, 10_000 = 1x.
    function weightMultiplier(address wallet, uint256 epoch) external view override returns (uint256) {
        uint256 mult = BPS;
        uint256 tierMult = tiers[uint256(tierOf(wallet))].multiplierBps;
        if (tierMult > mult) mult = tierMult;
        // Tính năng 36: boost window toàn cục
        if (epoch >= windowStartEpoch && epoch < windowEndEpoch && windowBps > mult) mult = windowBps;
        // Tính năng 35: voucher +50% cộng thêm
        if (voucherActive(wallet, epoch)) mult += 5000;
        return mult;
    }
}
