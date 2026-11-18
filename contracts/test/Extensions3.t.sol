// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./BaseTest.sol";
import {IStreakVault} from "../src/interfaces/IStreakVault.sol";
import {Gems} from "../src/Gems.sol";
import {FreezeGift} from "../src/FreezeGift.sol";
import {SavingCircle} from "../src/SavingCircle.sol";
import {MentorHub} from "../src/MentorHub.sol";
import {CelebrationPool} from "../src/CelebrationPool.sol";
import {Web3Mail} from "../src/Web3Mail.sol";
import {GuildWars} from "../src/GuildWars.sol";
import {PrizeLinkedSavings} from "../src/PrizeLinkedSavings.sol";
import {SavingsBond} from "../src/SavingsBond.sol";
import {PaycheckSplitter} from "../src/PaycheckSplitter.sol";
import {TermLock} from "../src/TermLock.sol";
import {PredictionBox} from "../src/PredictionBox.sol";
import {DailyCheckIn} from "../src/DailyCheckIn.sol";
import {PetCompanion} from "../src/PetCompanion.sol";
import {KingOfTheHill} from "../src/KingOfTheHill.sol";
import {TimeCapsule} from "../src/TimeCapsule.sol";
import {GuardianRecovery} from "../src/GuardianRecovery.sol";
import {GemStaking} from "../src/GemStaking.sol";
import {TreasuryDividend} from "../src/TreasuryDividend.sol";
import {EmergencyHatch} from "../src/EmergencyHatch.sol";
import {StampsCollection} from "../src/StampsCollection.sol";
import {VaultCredit} from "../src/VaultCredit.sol";
import {GoalTemplates} from "../src/GoalTemplates.sol";
import {FaucetDrip} from "../src/FaucetDrip.sol";
import {SavingsJournal} from "../src/SavingsJournal.sol";
import {FeeRebate} from "../src/FeeRebate.sol";
import {CharityPot} from "../src/CharityPot.sol";
import {SpendingLimit} from "../src/SpendingLimit.sol";

/// @notice Test các tính năng mở rộng lô 3 (Tính năng 51-130).
contract Extensions3Test is BaseTest {
    Gems internal gems;
    FreezeGift internal freezeGift;
    SavingCircle internal circle;
    MentorHub internal mentorHub;
    CelebrationPool internal celebration;
    Web3Mail internal mail;
    GuildWars internal guildWars;
    PrizeLinkedSavings internal pls;
    SavingsBond internal bond;
    PaycheckSplitter internal splitter;
    TermLock internal termLock;
    PredictionBox internal prediction;
    DailyCheckIn internal checkIn;
    PetCompanion internal pet;
    KingOfTheHill internal hill;
    TimeCapsule internal capsule;
    GuardianRecovery internal recovery;
    GemStaking internal staking;
    TreasuryDividend internal dividend;
    EmergencyHatch internal hatch;
    StampsCollection internal stamps;
    VaultCredit internal credit;
    GoalTemplates internal templates;
    FaucetDrip internal faucet;
    SavingsJournal internal journal;
    FeeRebate internal rebate;
    CharityPot internal charity;
    SpendingLimit internal spendLimit;

    address internal treasuryWallet = makeAddr("treasuryWallet");
    address internal dave = makeAddr("dave");

    function setUp() public virtual override {
        super.setUp();
        vm.startPrank(deployer);
        vault.setTreasury(treasuryWallet);

        gems = new Gems(deployer);
        freezeGift = new FreezeGift(vault, token);
        circle = new SavingCircle(vault, token);
        mentorHub = new MentorHub(vault, token);
        celebration = new CelebrationPool(vault, token);
        mail = new Web3Mail(token);
        guildWars = new GuildWars(vault, token);
        pls = new PrizeLinkedSavings(vault, distributor, token);
        bond = new SavingsBond(vault, token);
        splitter = new PaycheckSplitter(vault, token);
        termLock = new TermLock(vault, token);
        prediction = new PredictionBox(vault, source, token);
        checkIn = new DailyCheckIn(gems);
        pet = new PetCompanion(vault, gems, treasuryWallet, "https://example.com/pet/{id}.json");
        hill = new KingOfTheHill(vault, token);
        capsule = new TimeCapsule(vault, token);
        recovery = new GuardianRecovery();
        staking = new GemStaking(gems);
        dividend = new TreasuryDividend(gems, token);
        hatch = new EmergencyHatch(token);
        stamps = new StampsCollection(vault, token, "https://example.com/stamps/{id}.json");
        credit = new VaultCredit(vault, token);
        templates = new GoalTemplates(vault, gems);
        faucet = new FaucetDrip(vault, token);
        journal = new SavingsJournal(vault);
        rebate = new FeeRebate(vault, token, gems);
        charity = new CharityPot(token);
        spendLimit = new SpendingLimit(vault, token);

        // Cấp quyền: vault operator + Gems minter
        vault.setOperator(address(freezeGift), true);
        vault.setOperator(address(faucet), true);
        vault.setOperator(address(templates), true);
        gems.grantRole(gems.MINTER_ROLE(), address(checkIn));
        gems.grantRole(gems.MINTER_ROLE(), address(rebate));
        gems.grantRole(gems.MINTER_ROLE(), address(staking));
        gems.grantRole(gems.MINTER_ROLE(), address(templates));
        gems.grantRole(gems.MINTER_ROLE(), address(this)); // test mint Gems trực tiếp
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Helper: đưa một ví đạt streak = n (n kỳ đủ mục tiêu đã chốt)
    // ------------------------------------------------------------------
    function _buildStreak(address who, uint256 n) internal {
        for (uint256 e; e < n; ++e) {
            _warpToEpoch(e);
            if (!vault.getAccount(who).activated) _setTarget(who, 5 * ONE);
            _deposit(who, 5 * ONE);
            _warpToEpochEnd(e);
            _finalize(e);
        }
    }

    // ================================================== Nhóm xã hội

    function test_FreezeGift_TangFreezeVaInsurance() public {
        _warpToEpoch(0);
        _setTarget(binh, 5 * ONE);
        vm.prank(an);
        token.approve(address(freezeGift), 10 * ONE);
        // 51. Tặng freeze cho bạn
        vm.prank(an);
        freezeGift.giftFreeze(binh);
        assertEq(vault.frozenUntilEpoch(binh), 1); // lưu epoch+1 (kỳ 0 đã freeze)
        // 52. Tặng insurance
        vm.prank(an);
        freezeGift.giftInsurance(binh);
        assertTrue(vault.hasInsurance(binh));
        // 53. Lịch sử quà
        (,,,, uint256 feePaid) = _giftTuple(1);
        assertEq(feePaid, vault.freezeFee());
        (, address to,, bool isInsurance,) = _giftTuple(2);
        assertEq(to, binh);
        assertTrue(isInsurance);
    }

    function _giftTuple(uint256 id)
        internal
        view
        returns (address from, address to, uint256 epoch, bool isInsurance, uint256 feePaid)
    {
        (from, to, epoch, isInsurance, feePaid) = freezeGift.gifts(id);
    }

    function test_SavingCircle_HuiDienTu() public {
        _warpToEpoch(0);
        vm.prank(an);
        uint256 circleId = circle.createCircle("Hui lop hoc", 5 * ONE, 0);
        vm.prank(binh);
        circle.joinCircle(circleId);
        vm.prank(chi);
        circle.joinCircle(circleId);

        // 54. Đóng đủ cho vòng 0
        vm.prank(an);
        token.approve(address(circle), 5 * ONE);
        vm.prank(an);
        circle.contribute(circleId);
        vm.prank(binh);
        token.approve(address(circle), 5 * ONE);
        vm.prank(binh);
        circle.contribute(circleId);
        vm.prank(chi);
        token.approve(address(circle), 5 * ONE);
        vm.prank(chi);
        circle.contribute(circleId);
        assertEq(circle.potOf(circleId, 0), 15 * ONE);

        // 55. Payout vòng 0: ngườ nhận = members[0] = an
        _warpToEpochEnd(0);
        circle.payout(circleId);
        assertEq(token.balanceOf(an), 1_000 * ONE - 5 * ONE + 15 * ONE);
        (, , , , , uint256 nextRound, bool active) = circle.getCircle(circleId);
        assertTrue(active);
        assertEq(nextRound, 1);
    }

    function test_SavingCircle_DongMuonCoPhi() public {
        _warpToEpoch(0);
        vm.prank(an);
        uint256 circleId = circle.createCircle("Hui 2 nguoi", 10 * ONE, 0);
        vm.prank(binh);
        circle.joinCircle(circleId);
        _warpToEpochEnd(0); // hết kỳ vòng 0 -> đóng sau giờ = muộn
        vm.prank(an);
        token.approve(address(circle), 11 * ONE);
        vm.prank(an);
        circle.contribute(circleId);
        vm.prank(binh);
        token.approve(address(circle), 11 * ONE);
        vm.prank(binh);
        circle.contribute(circleId);
        // Phí muộn 10%: mỗi ngườ 10 + 1 = 11 -> pot = 22
        assertEq(circle.potOf(circleId, 0), 22 * ONE);
    }

    function test_MentorHub_ThuongMentor() public {
        // Mentor là an, mentee là binh
        _buildStreak(an, 1); // an streak 1 + activated
        _warpToEpoch(1);
        _setTarget(binh, 5 * ONE);
        _deposit(binh, 5 * ONE);
        vm.prank(binh);
        mentorHub.setMentor(an);

        // Nạp pool + đưa binh đạt streak 4
        vm.startPrank(deployer);
        token.mint(deployer, 100 * ONE);
        token.approve(address(mentorHub), 100 * ONE);
        mentorHub.fundPrizes(100 * ONE);
        vm.stopPrank();

        for (uint256 e = 1; e < 5; ++e) {
            _warpToEpoch(e);
            _deposit(binh, 5 * ONE);
            _warpToEpochEnd(e);
            _finalize(e);
        }
        // Sau 4 kỳ chốt (1..4): binh streak = 4 -> mốc đầu tiên
        assertEq(vault.getAccount(binh).streak, 4);
        vm.prank(binh);
        mentorHub.reportMilestone();
        assertEq(mentorHub.earnings(an), 2 * ONE); // mốc 4 = 2 mUSDC
        assertEq(mentorHub.mentorTier(an), 1); // hạng Bronze (Tính năng 59)

        vm.prank(an);
        mentorHub.claimEarnings();
        assertEq(token.balanceOf(an), 1_000 * ONE - 5 * ONE + 2 * ONE);
    }

    function test_CelebrationPool_TipVaMungMoc() public {
        _buildStreak(an, 5); // an streak 5
        vm.startPrank(deployer);
        token.mint(deployer, 50 * ONE);
        token.approve(address(celebration), 50 * ONE);
        celebration.fund(20 * ONE);
        vm.stopPrank();

        // 62. Tip kèm lờ chúc
        vm.prank(binh);
        token.approve(address(celebration), 3 * ONE);
        vm.prank(binh);
        celebration.tip("Co len nhe!", 3 * ONE);
        assertEq(celebration.totalTipped(binh), 3 * ONE);

        // 60 + 61. an đạt mốc 5 -> nhận 1 mUSDC từ quỹ 23
        vm.prank(an);
        celebration.celebrate();
        assertEq(token.balanceOf(an), 1_000 * ONE - 25 * ONE + 1 * ONE);
        assertEq(celebration.celebrationCount(), 1);
        // Mỗi mốc một lần: gọi lại revert
        vm.expectRevert(CelebrationPool.NoMilestone.selector);
        vm.prank(an);
        celebration.celebrate();
    }

    function test_Web3Mail_GuiThuKemTip() public {
        uint256 balBefore = token.balanceOf(binh);
        vm.prank(an);
        token.approve(address(mail), 2 * ONE);
        vm.prank(an);
        mail.send(binh, "group:1", "Nho gui tuan nay nhe!", 2 * ONE);
        assertEq(token.balanceOf(binh), balBefore + 2 * ONE);

        Web3Mail.Mail memory m = mail.getMail(1);
        assertEq(m.from, an);
        assertEq(m.tip, 2 * ONE);

        // 65. Lọc theo topic
        Web3Mail.Mail[] memory inbox = mail.inbox(binh, 0, 10, "group:1");
        assertEq(inbox.length, 1);
        Web3Mail.Mail[] memory empty = mail.inbox(binh, 0, 10, "mentor");
        assertEq(empty.length, 0);
    }

    function test_GuildWars_ChienMua() public {
        // an và binh cùng bang 1, chi bang 2. an đạt kỳ 0, chi không.
        _warpToEpoch(0);
        vm.prank(an);
        uint256 g1 = guildWars.createGuild("Bang A");
        vm.prank(binh);
        guildWars.joinGuild(g1);
        vm.prank(chi);
        uint256 g2 = guildWars.createGuild("Bang B");

        _setTarget(an, 5 * ONE);
        _deposit(an, 5 * ONE);
        _setTarget(chi, 5 * ONE);
        _warpToEpochEnd(0);
        _finalize(0);

        vm.startPrank(deployer);
        token.mint(deployer, 10 * ONE);
        token.approve(address(guildWars), 10 * ONE);
        guildWars.fundPrizes(10 * ONE);
        vm.stopPrank();

        // 67. sync điểm từ vault
        guildWars.sync();
        (,,, uint256 points1,) = guildWars.getGuild(g1);
        (,,, uint256 points2,) = guildWars.getGuild(g2);
        assertEq(points1, 1);
        assertEq(points2, 0);

        // 66 + 68. kết thúc mùa: bang 1 thắng, chia đều 10 mUSDC cho 2 thành viên
        vm.prank(deployer);
        guildWars.endSeason();
        assertEq(guildWars.winnerGuildOfSeason(), g1);
        assertEq(guildWars.pendingReward(an), 5 * ONE);
        vm.prank(an);
        guildWars.claimReward();
        // an đã gửi 5 mUSDC gốc kỳ 0, giờ nhận lại 5 thưởng bang
        assertEq(token.balanceOf(an), 1_000 * ONE);
    }

    function test_PrizeLinkedSavings_NoLossLottery() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        _deposit(an, 5 * ONE);
        _fundEpoch(0, 3 * ONE); // an hưởng toàn bộ 3 mUSDC -> 3 vé
        _warpToEpochEnd(0);
        _finalize(0);

        // 70. đổi vé
        vm.prank(an);
        pls.syncTickets();
        assertEq(pls.tickets(an), 3);

        vm.startPrank(deployer);
        pls.setDrawInterval(1); // drawIndex 0 gắn kỳ 0
        token.mint(deployer, 10 * ONE);
        token.approve(address(pls), 10 * ONE);
        pls.fund(10 * ONE);
        vm.stopPrank();

        // 69 + 71. quay giải: 70% giải nhất, 30% rollover
        pls.draw(0);
        assertEq(pls.jackpotRollover(), 3 * ONE);
        assertEq(pls.winnings(an), 7 * ONE);
        vm.prank(an);
        pls.claimPrize();
        // an: 1000 - 5 gửi gốc + 7 giải (3 yield vẫn nằm ở distributor, chưa claim)
        assertEq(token.balanceOf(an), 1_002 * ONE);
    }

    // ================================================== Nhóm tài chính

    function test_SavingsBond_PhatHanhVaDaoHan() public {
        _buildStreak(an, 1);
        vm.startPrank(deployer);
        token.mint(deployer, 100 * ONE);
        token.approve(address(bond), 100 * ONE);
        bond.fundCoupons(100 * ONE);
        vm.stopPrank();

        // 72 + 73. phát hành 100 mUSDC khóa 4 kỳ, streak 1 -> coupon > 0
        uint256 preview = bond.previewCoupon(an, 100 * ONE, 4);
        vm.prank(an);
        token.approve(address(bond), 100 * ONE);
        vm.prank(an);
        uint256 bondId = bond.issue(100 * ONE, 4);
        assertEq(bondsCoupon(bondId), preview);
        assertTrue(preview > 0);

        // 74. chuyển nhượng cho binh, binh đáo hạn
        vm.prank(an);
        bond.transferBond(bondId, binh);
        (,,,, uint256 maturity,, ) = bond.bonds(bondId);
        _warpToEpoch(maturity);
        vm.prank(binh);
        bond.redeem(bondId);
        assertEq(token.balanceOf(binh), 1_000 * ONE + 100 * ONE + preview);
    }

    function bondsCoupon(uint256 id) internal view returns (uint256) {
        (,,,,, uint256 coupon, ) = bond.bonds(id);
        return coupon;
    }

    function test_PaycheckSplitter_ChiaLuong() public {
        _warpToEpoch(0);
        // 77. đặt plan áp dụng kỳ 1: 60% vào vault, 40% cho binh
        PaycheckSplitter.Dest[] memory dests = new PaycheckSplitter.Dest[](2);
        dests[0] = PaycheckSplitter.Dest({to: address(0), bps: 6_000, toVault: true});
        dests[1] = PaycheckSplitter.Dest({to: binh, bps: 4_000, toVault: false});
        vm.prank(an);
        splitter.setPlan(dests);
        // Kỳ 0 chưa có plan -> execute revert
        vm.prank(an);
        token.approve(address(splitter), 10 * ONE);
        vm.expectRevert(PaycheckSplitter.NoPlan.selector);
        vm.prank(an);
        splitter.execute(10 * ONE);

        // 75 + 76. sang kỳ 1 thực hiện chia
        _warpToEpoch(1);
        vm.prank(an);
        splitter.execute(10 * ONE);
        IStreakVault.AccountView memory a = vault.getAccount(an);
        assertEq(a.principal, 6 * ONE);
        assertEq(token.balanceOf(binh), 1_000 * ONE + 4 * ONE);
    }

    function test_TermLock_KhoaVaPhat() public {
        _warpToEpoch(0);
        vm.startPrank(deployer);
        token.mint(deployer, 100 * ONE);
        token.approve(address(termLock), 100 * ONE);
        termLock.fundRewards(100 * ONE);
        vm.stopPrank();

        // 78. khóa 50 mUSDC 4 kỳ
        vm.prank(an);
        token.approve(address(termLock), 50 * ONE);
        vm.prank(an);
        uint256 lockId = termLock.lock(50 * ONE, 4);
        (, , , , uint256 endEpoch, uint256 reward, bool active) = termLock.locks(lockId);
        assertTrue(active);
        assertTrue(reward > 0);
        assertEq(endEpoch, 4);

        // 79. rút sớm kỳ 1: mất 20% phạt
        _warpToEpoch(1);
        vm.prank(an);
        termLock.release(lockId);
        assertEq(token.balanceOf(an), 1_000 * ONE - 50 * ONE + 40 * ONE); // 50 gốc - 10 phạt

        // 78 + 80. khóa mới tới hạn nhận đủ
        vm.prank(an);
        token.approve(address(termLock), 50 * ONE);
        vm.prank(an);
        uint256 lock2 = termLock.lock(50 * ONE, 2);
        _warpToEpoch(3);
        vm.prank(an);
        termLock.release(lock2);
    }

    function test_PredictionBox_ChinhXac() public {
        _warpToEpoch(0);
        vm.prank(deployer);
        uint256 marketId = prediction.createMarket(2 * ONE, 500); // kỳ được dự đoán = kỳ 1
        // Đặt cược trong kỳ 0 (trước deadline = đầu kỳ 1)
        vm.prank(an);
        token.approve(address(prediction), 10 * ONE);
        vm.prank(an);
        prediction.predict(marketId, PredictionBox.Side.OVER, 10 * ONE);
        vm.prank(binh);
        token.approve(address(prediction), 10 * ONE);
        vm.prank(binh);
        prediction.predict(marketId, PredictionBox.Side.UNDER, 10 * ONE);

        _warpToEpoch(1);
        _fundEpoch(1, 5 * ONE);
        _warpToEpochEnd(1);
        prediction.resolve(marketId);

        uint256 beforeAn = token.balanceOf(an);
        vm.prank(an);
        prediction.claim(marketId);
        // an thắng: 10 + 9.5 = 19.5 mUSDC
        assertEq(token.balanceOf(an) - beforeAn, 19.5 * 1e6);
        // binh thua: claim = 0, không đổi số dư
        uint256 beforeBinh = token.balanceOf(binh);
        vm.prank(binh);
        prediction.claim(marketId);
        assertEq(token.balanceOf(binh), beforeBinh);
    }

    // ================================================== Nhóm game hoá

    function test_DailyCheckIn_ChuoiNgay() public {
        vm.prank(an);
        checkIn.checkIn();
        assertEq(checkIn.checkInStreakDays(an), 1);
        assertEq(gems.balanceOf(an), 1.05 * 1e18); // day 1 đã có +5% chuỗi

        // 85. chuỗi tăng thưởng ngày 2
        vm.warp(block.timestamp + 1 days);
        vm.prank(an);
        checkIn.checkIn();
        assertEq(checkIn.checkInStreakDays(an), 2);
        assertEq(gems.balanceOf(an), 1.05 * 1e18 + 1.10 * 1e18);

        // 86. bỏ một ngày -> chuỗi về 1
        vm.warp(block.timestamp + 2 days);
        vm.prank(an);
        checkIn.checkIn();
        assertEq(checkIn.checkInStreakDays(an), 1);
    }

    function test_PetCompanion_NuoiThu() public {
        _buildStreak(an, 4); // streak 4 -> level >= 2
        // 87. adopt
        vm.prank(an);
        pet.adopt();
        assertEq(pet.balanceOf(an, pet.PET_ID()), 1);
        assertTrue(pet.levelOf(an) >= 2); // 88. level theo streak

        // 89. cho ăn bằng Gems
        gems.mint(an, 100 * 1e18);
        vm.prank(an);
        gems.approve(address(pet), 100 * 1e18);
        uint256 levelBefore = pet.levelOf(an);
        vm.prank(an);
        pet.feed();
        assertEq(pet.levelOf(an), levelBefore + 1);
        assertEq(gems.balanceOf(treasuryWallet), 5 * 1e18);
    }

    function test_KingOfTheHill_SoanNgoi() public {
        _warpToEpoch(0);
        vm.startPrank(deployer);
        token.mint(deployer, 20 * ONE);
        token.approve(address(hill), 20 * ONE);
        hill.fundPool(20 * ONE);
        vm.stopPrank();

        // 90. an lên ngôi với stake 10
        vm.prank(an);
        token.approve(address(hill), 10 * ONE);
        vm.prank(an);
        hill.claimThrone(10 * ONE);
        assertEq(hill.king(), an);
        // 92. lật đổ nhận 5% pool = 1
        vm.prank(binh);
        token.approve(address(hill), 12 * ONE); // 10 + 10% margin
        vm.prank(binh);
        hill.claimThrone(12 * ONE);
        assertEq(hill.king(), binh);
        assertEq(token.balanceOf(an), 1_000 * ONE); // nhận lại đầy đủ stake (lên ngôi đầu không có thưởng)
        // binh xuống ngôi nhận lại stake + giữ thưởng lật đổ 1
        vm.prank(binh);
        hill.abdicate();
        assertEq(hill.king(), address(0));
        assertEq(token.balanceOf(binh), 1_000 * ONE + 1 * ONE);
    }

    function test_TimeCapsule_GuiTuongLai() public {
        _warpToEpoch(0);
        // 93 + 94. tạo capsule 10 mUSDC mở sau 2 kỳ
        vm.prank(an);
        token.approve(address(capsule), 10 * ONE + 1e5);
        vm.prank(an);
        uint256 id = capsule.create(10 * ONE, 2, "Mua nha nhe!");
        (, address owner, uint256 amount, , uint256 unlockEpoch, , bool opened, bool cancelled) = capsule.capsules(id);
        assertEq(owner, an);
        assertEq(amount, 10 * ONE);
        assertEq(unlockEpoch, 2);

        // Chưa tới hạn không mở được
        _warpToEpoch(1);
        vm.expectRevert(TimeCapsule.NotUnlocked.selector);
        vm.prank(an);
        capsule.open(id);

        // 95. hủy capsule khác trước hạn, trả gốc - 20%
        vm.prank(an);
        token.approve(address(capsule), 5 * ONE + 1e5);
        vm.prank(an);
        uint256 id2 = capsule.create(5 * ONE, 10, "Du phong");
        vm.prank(an);
        capsule.cancel(id2);
        // an: -10 (capsule 1) - 0.1 phí - 5 (capsule 2) - 0.1 phí + 4 hoàn = 988.8 mUSDC
        assertEq(token.balanceOf(an), 988_800_000);
    }

    function test_TimeCapsule_MoDungHan() public {
        _warpToEpoch(0);
        vm.prank(an);
        token.approve(address(capsule), 10 * ONE + 1e5);
        vm.prank(an);
        uint256 id = capsule.create(10 * ONE, 2, "Loi nhan");
        _warpToEpoch(2);
        uint256 before = token.balanceOf(an);
        vm.prank(an);
        capsule.open(id);
        (, , , , , , bool opened, ) = capsule.capsules(id);
        assertTrue(opened);
        assertEq(token.balanceOf(an) - before, 10 * ONE);
    }

    function test_GuardianRecovery_KhoiPhuc() public {
        // 96. đăng ký guardian
        address[] memory guardians = new address[](2);
        guardians[0] = binh;
        guardians[1] = chi;
        vm.prank(an);
        recovery.setGuardians(guardians);

        // 97. yêu cầu recovery sang ví mới
        address newWallet = makeAddr("an-moi");
        vm.prank(an);
        uint256 reqId = recovery.requestRecovery(newWallet);
        // 98. guardian phê duyệt
        vm.prank(binh);
        recovery.approve(reqId);
        vm.prank(chi);
        recovery.approve(reqId);
        recovery.execute(reqId);
        assertEq(recovery.recoveredTo(an), newWallet);
        assertTrue(recovery.wasRecoveryTarget(newWallet));
    }

    function test_GemStaking_StakeVaVote() public {
        vm.startPrank(an);
        checkIn.checkIn(); // 1 gem
        gems.approve(address(staking), 1e18);
        staking.stake(1e18);
        vm.stopPrank();
        assertEq(staking.totalStaked(), 1e18);

        // 100. tạo đề xuất + bỏ phiếu theo trọng số stake
        vm.prank(an);
        uint256 pid = staking.propose("withdrawFeeBps", 100, 1 days);
        vm.prank(an);
        staking.vote(pid, true);
        (, , , uint256 yes, , , ) = staking.proposals(pid);
        assertEq(yes, 1e18);

        // 101. thưởng staking sau 1 epoch thờ gian
        vm.warp(block.timestamp + staking.rewardEpochDuration());
        vm.prank(an);
        staking.claimReward();
        assertEq(gems.balanceOf(an), 100.05 * 1e18); // 0.05 gems thừa + thưởng 100 gems (stake duy nhất)
    }

    function test_TreasuryDividend_CoTuc() public {
        vm.prank(an);
        checkIn.checkIn();
        vm.startPrank(an);
        gems.approve(address(dividend), 1e18);
        dividend.stake(1e18);
        vm.stopPrank();

        // 102 + 104. nạp cổ tức, snapshot stake
        vm.startPrank(deployer);
        token.mint(deployer, 10 * ONE);
        token.approve(address(dividend), 10 * ONE);
        dividend.distribute(10 * ONE);
        vm.stopPrank();
        assertEq(dividend.epochPool(0), 10 * ONE);
        assertEq(dividend.epochTotalStake(0), 1e18);

        // 103. claim cổ tức kỳ 0
        vm.prank(an);
        dividend.claim(0);
        assertEq(token.balanceOf(an), 1_000 * ONE + 10 * ONE);
    }

    function test_EmergencyHatch_RutCoTre() public {
        vm.prank(an);
        token.approve(address(hatch), 10 * ONE);
        vm.prank(an);
        hatch.deposit(10 * ONE);
        assertEq(hatch.balanceOf(an), 10 * ONE);

        // 105. yêu cầu rút -> phải chờ
        vm.prank(an);
        uint256 reqId = hatch.requestWithdrawal(10 * ONE);
        vm.expectRevert(EmergencyHatch.NotExecutable.selector);
        vm.prank(an);
        hatch.executeWithdrawal(reqId);

        // 106. huỷ lệnh rút, nhận lại
        vm.prank(an);
        hatch.cancelWithdrawal(reqId);
        assertEq(hatch.balanceOf(an), 10 * ONE);

        // 105. chờ đủ delay rồi rút thành công
        vm.prank(an);
        uint256 req2 = hatch.requestWithdrawal(4 * ONE);
        vm.warp(block.timestamp + 24 hours);
        vm.prank(an);
        hatch.executeWithdrawal(req2);
        assertEq(token.balanceOf(an), 1_000 * ONE - 10 * ONE + 4 * ONE);
    }

    function test_StampsCollection_DongTem() public {
        // an đạt đủ 12 kỳ liên tiếp -> đủ bộ mùa 0
        _buildStreak(an, 12);
        for (uint256 e; e < 12; ++e) {
            vm.prank(an);
            stamps.stamp(an, e);
            assertEq(stamps.balanceOf(an, stamps.tokenIdOf(e)), 1);
        }

        vm.startPrank(deployer);
        token.mint(deployer, 10 * ONE);
        token.approve(address(stamps), 10 * ONE);
        stamps.fundPrizes(5 * ONE);
        vm.stopPrank();

        // 110. thưởng đủ bộ mùa 0
        vm.prank(an);
        stamps.claimSeasonBonus(0);
        assertEq(token.balanceOf(an), 1_000 * ONE - 60 * ONE + 5 * ONE);
        // Mỗi mùa một lần
        vm.expectRevert(StampsCollection.BonusClaimed.selector);
        vm.prank(an);
        stamps.claimSeasonBonus(0);
    }

    function test_VaultCredit_VayTheoStreak() public {
        _buildStreak(an, 3); // streak 3 -> hạn mức 3 mUSDC
        vm.startPrank(deployer);
        token.mint(deployer, 10 * ONE);
        token.approve(address(credit), 10 * ONE);
        credit.fundPool(10 * ONE);
        vm.stopPrank();

        assertEq(credit.creditLimit(an), 3 * ONE);
        // 111 + 112. vay trong hạn mức
        vm.prank(an);
        credit.borrow(2 * ONE);
        assertEq(token.balanceOf(an), 1_000 * ONE - 15 * ONE + 2 * ONE);

        // Vay quá hạn mức -> revert (kiểm tra limit trước active loan)
        vm.expectRevert(VaultCredit.LimitExceeded.selector);
        vm.prank(an);
        credit.borrow(5 * ONE);
        // Có khoản vay đang mở -> ActiveLoan
        vm.expectRevert(VaultCredit.ActiveLoan.selector);
        vm.prank(an);
        credit.borrow(1 * ONE);

        // 113. trả nợ
        vm.prank(an);
        token.approve(address(credit), 2 * ONE);
        vm.prank(an);
        credit.repayFromWallet(2 * ONE);
        (uint256 debt, , ) = credit.loans(an);
        assertEq(debt, 0);
    }

    function test_GoalTemplates_MauMucTieu() public {
        _warpToEpoch(0);
        // 114. tạo mẫu
        vm.prank(an);
        uint256 id = templates.createTemplate("Di Nhat Ban", 5 * ONE, 200 * ONE);
        // 115. dùng mẫu: đặt luôn target vault
        vm.prank(binh);
        templates.useTemplate(id);
        IStreakVault.AccountView memory a = vault.getAccount(binh);
        assertEq(a.currentTarget, 5 * ONE);
        assertEq(templates.progressOf(binh, id), 0);
        // 116. tác giả được cộng hoa hồng chờ nhận
        vm.prank(deployer);
        templates.creditAuthor(id);
        assertEq(templates.authorRewardPool(an), 5 * 1e18);
        vm.prank(deployer);
        templates.rewardAuthor(id);
        assertEq(gems.balanceOf(an), 5 * 1e18);
    }

    function test_FaucetDrip_NguoiMoi() public {
        _warpToEpoch(0);
        vm.startPrank(deployer);
        token.mint(deployer, 100 * ONE);
        token.approve(address(faucet), 100 * ONE);
        faucet.fund(100 * ONE);
        vm.stopPrank();

        // 117 + 118. dave nhận drip 1 lần, tự kích hoạt vault
        vm.prank(dave);
        faucet.drip();
        IStreakVault.AccountView memory a = vault.getAccount(dave);
        assertTrue(a.activated);
        assertEq(a.currentTarget, 2 * ONE);
        assertEq(a.principal, 5 * ONE);
        // 118. không nhận lại được
        vm.expectRevert(FaucetDrip.AlreadyDripped.selector);
        vm.prank(dave);
        faucet.drip();
    }

    function test_SavingsJournal_NhatKy() public {
        _warpToEpoch(0);
        // 120 + 121. viết nhật ký private
        vm.prank(an);
        uint256 entryId = journal.write(SavingsJournal.Mood.PROUD, "Gui du 5 mUSDC dau tien!", false);
        SavingsJournal.Entry memory e = journal.entryOf(an, 0);
        assertEq(e.epoch, 0);
        assertTrue(!e.isPublic);
        // 121. ngườ khác không đọc được entry private
        vm.prank(binh);
        vm.expectRevert(SavingsJournal.NotOwner.selector);
        journal.readEntry(entryId);
        // Chủ đọc được
        vm.prank(an);
        SavingsJournal.Entry memory mine = journal.readEntry(entryId);
        assertEq(mine.text, "Gui du 5 mUSDC dau tien!");
    }

    function test_FeeRebate_HoanPhiTheoStreak() public {
        _buildStreak(an, 4); // streak 4
        vm.startPrank(deployer);
        token.mint(deployer, 10 * ONE);
        token.approve(address(rebate), 10 * ONE);
        rebate.fundPool(10 * ONE);
        vm.stopPrank();

        uint256 base = rebate.baseRebate();
        uint256 expected = base + 4 * rebate.perStreakBonus();
        // 123 + 124. claim rebate đúng chu kỳ
        vm.prank(an);
        rebate.claim(false);
        assertEq(token.balanceOf(an), 1_000 * ONE - 20 * ONE + expected);
        // 124. chưa đủ chu kỳ -> revert
        vm.prank(an);
        vm.expectRevert(abi.encodeWithSelector(FeeRebate.TooSoon.selector, 8));
        rebate.claim(false);
    }

    function test_CharityPot_QuyenGop() public {
        // 127. đăng ký tổ chức
        vm.prank(deployer);
        uint256 cid = charity.registerCharity("Quy hoc bong", chi);
        vm.prank(an);
        charity.chooseCharity(cid);
        // 126. quyên góp trực tiếp
        vm.prank(an);
        token.approve(address(charity), 3 * ONE);
        vm.prank(an);
        charity.donate(3 * ONE);
        assertEq(token.balanceOf(chi), 1_000 * ONE + 3 * ONE);
        assertEq(charity.lifetimeDonated(an), 3 * ONE); // 128

        // 126. auto-donate: cam kết 10% của 20 đã claim
        vm.prank(an);
        charity.setAutoDonate(1_000);
        vm.prank(an);
        token.approve(address(charity), 2 * ONE);
        vm.prank(an);
        charity.settleAutoDonate(20 * ONE);
        assertEq(charity.lifetimeDonated(an), 3 * ONE + 2 * ONE);
    }

    function test_SpendingLimit_TuGioiHan() public {
        _warpToEpoch(0);
        vm.prank(an);
        token.approve(address(spendLimit), 20 * ONE);
        vm.prank(an);
        spendLimit.deposit(20 * ONE);

        // 130. đặt limit 4/kỳ, hiệu lực sau 2 kỳ
        vm.prank(an);
        spendLimit.setLimit(4 * ONE);
        _warpToEpoch(1);
        // Kỳ 1: limit chưa hiệu lực (vẫn 0 = không giới hạn)
        vm.prank(an);
        spendLimit.withdraw(6 * ONE);
        assertEq(token.balanceOf(an), 1_000 * ONE - 20 * ONE + 6 * ONE);

        // 129. kỳ 2 limit đã hiệu lực: rút 2 lần 3 -> lần 2 vượt hạn mức
        // 129. kỳ 2 limit đã hiệu lực: rút 2 lần 3 -> lần 2 vượt hạn mức 4
        _warpToEpoch(2);
        vm.prank(an);
        spendLimit.withdraw(3 * ONE);
        vm.prank(an);
        vm.expectRevert(abi.encodeWithSelector(SpendingLimit.LimitExceeded.selector, 4 * ONE, 3 * ONE, 3 * ONE));
        spendLimit.withdraw(3 * ONE);
        // Vẫn rút được trong phần hạn mức còn lại
        vm.prank(an);
        spendLimit.withdraw(1 * ONE);
        assertEq(token.balanceOf(an), 1_000 * ONE - 20 * ONE + 10 * ONE);
    }
}
