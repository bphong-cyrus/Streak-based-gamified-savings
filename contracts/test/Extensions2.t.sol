// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./BaseTest.sol";
import {SavingsPots} from "../src/SavingsPots.sol";
import {StreakBoosts} from "../src/StreakBoosts.sol";
import {EpochBonus} from "../src/EpochBonus.sol";
import {GroupVault} from "../src/GroupVault.sol";
import {TeamChallenge} from "../src/TeamChallenge.sol";
import {Duel} from "../src/Duel.sol";
import {ReferralSeasons} from "../src/ReferralSeasons.sol";
import {ProfileSBT} from "../src/ProfileSBT.sol";
import {ActivityFeed} from "../src/ActivityFeed.sol";
import {BuddyPact} from "../src/BuddyPact.sol";
import {AnonCommit} from "../src/AnonCommit.sol";
import {GroupAlerts} from "../src/GroupAlerts.sol";
import {BattlePass} from "../src/BattlePass.sol";
import {MysteryBox} from "../src/MysteryBox.sol";
import {Raffle} from "../src/Raffle.sol";
import {Badges} from "../src/Badges.sol";
import {Bingo} from "../src/Bingo.sol";
import {VoucherMarket} from "../src/VoucherMarket.sol";
import {SalvageSpin} from "../src/SalvageSpin.sol";
import {SeasonBoard} from "../src/SeasonBoard.sol";
import {MockLendingPool} from "../src/MockLendingPool.sol";
import {YieldRouter} from "../src/YieldRouter.sol";
import {YieldSmoother} from "../src/YieldSmoother.sol";
import {ReserveFund} from "../src/ReserveFund.sol";
import {RoundUpVault} from "../src/RoundUpVault.sol";
import {PortfolioView} from "../src/PortfolioView.sol";
import {BatchHelper} from "../src/BatchHelper.sol";
import {CouncilMultisig} from "../src/CouncilMultisig.sol";
import {Timelock} from "../src/Timelock.sol";
import {Watchtower} from "../src/Watchtower.sol";
import {AuditExporter} from "../src/AuditExporter.sol";
import {GasSponsor} from "../src/GasSponsor.sol";
import {IStreakVault} from "../src/interfaces/IStreakVault.sol";
import {StreakGroups} from "../src/StreakGroups.sol";
import {Challenges} from "../src/Challenges.sol";
import {Leaderboard} from "../src/Leaderboard.sol";
import {Treasury} from "../src/Treasury.sol";

/// @notice Kiểm thử 50 tính năng đợt 3 (Extensions2).
contract Extensions2Test is BaseTest {
    Treasury treasury;
    StreakGroups groups;
    Challenges challenges;
    Leaderboard board;

    SavingsPots pots;
    StreakBoosts boosts;
    EpochBonus epochBonus;
    GroupVault groupVault;
    TeamChallenge teamChallenge;
    Duel duel;
    ReferralSeasons referralSeasons;
    ProfileSBT profile;
    ActivityFeed feed;
    BuddyPact buddy;
    AnonCommit anon;
    GroupAlerts alerts;
    BattlePass battlePass;
    MysteryBox box;
    Raffle raffle;
    Badges badges;
    Bingo bingo;
    VoucherMarket voucherMarket;
    SalvageSpin salvage;
    SeasonBoard seasonBoard;
    MockLendingPool lending;
    YieldRouter router;
    YieldSmoother smoother;
    ReserveFund reserve;
    RoundUpVault roundUp;
    PortfolioView portfolio;
    BatchHelper batchHelper;
    CouncilMultisig council;
    Timelock timelock;
    Watchtower watchtower;
    AuditExporter audit;
    GasSponsor gasSponsor;

    function setUp() public override {
        super.setUp();
        vm.startPrank(deployer);
        treasury = new Treasury();
        groups = new StreakGroups(vault);
        challenges = new Challenges(token, vault);
        board = new Leaderboard(vault);
        vault.setTreasury(address(treasury));

        pots = new SavingsPots(token, vault);
        pots.setTreasury(address(treasury));
        boosts = new StreakBoosts(vault, "https://example.com/boost/{id}.json");
        epochBonus = new EpochBonus(token, vault);
        groupVault = new GroupVault(token, vault);
        teamChallenge = new TeamChallenge(token, vault, groups);
        duel = new Duel(token, vault);
        referralSeasons = new ReferralSeasons(token, vault);
        profile = new ProfileSBT(vault);
        feed = new ActivityFeed();
        buddy = new BuddyPact(token, vault);
        anon = new AnonCommit(vault);
        alerts = new GroupAlerts(vault, groups);
        battlePass = new BattlePass(token, vault);
        box = new MysteryBox(token, vault, "https://example.com/box/{id}.json");
        raffle = new Raffle(token, vault);
        badges = new Badges(vault, challenges, groups, "https://example.com/badges/{id}.json");
        bingo = new Bingo(vault);
        voucherMarket = new VoucherMarket(token, vault, deployer);
        salvage = new SalvageSpin(token, vault);
        seasonBoard = new SeasonBoard(token, vault, board);
        lending = new MockLendingPool(token);
        router = new YieldRouter(token);
        smoother = new YieldSmoother(token, address(source));
        reserve = new ReserveFund(token);
        roundUp = new RoundUpVault(token, vault);
        portfolio = new PortfolioView(vault, distributor);
        batchHelper = new BatchHelper(vault, distributor);
        council = new CouncilMultisig(an, binh, chi);
        timelock = new Timelock(1 hours);
        watchtower = new Watchtower(vault, distributor);
        audit = new AuditExporter(vault, distributor);
        gasSponsor = new GasSponsor(token);
        vm.stopPrank();

        // Nạp ngân sách cho các pool thưởng
        vm.startPrank(deployer);
        token.mint(deployer, 1000 * ONE);
        token.approve(address(epochBonus), type(uint256).max);
        epochBonus.fund(100 * ONE);
        token.approve(address(buddy), type(uint256).max);
        buddy.fundRewards(50 * ONE);
        token.approve(address(box), type(uint256).max);
        box.fundPrizes(50 * ONE);
        box.setPrizes(_toArray([uint256(1), 2, 5])); // mUSDC
        token.approve(address(bingo), 100 * ONE);
        bingo.fund(100 * ONE);
        token.approve(address(salvage), type(uint256).max);
        salvage.fund(20 * ONE);
        token.approve(address(gasSponsor), type(uint256).max);
        gasSponsor.fund(10 * ONE);
        token.approve(address(reserve), type(uint256).max);
        reserve.fund(20 * ONE);
        token.approve(address(smoother), type(uint256).max);
        smoother.depositSurplus(8 * ONE);
        vm.stopPrank();
    }

    function _toArray(uint256[3] memory a) internal pure returns (uint256[] memory out) {
        out = new uint256[](3);
        out[0] = a[0] * ONE;
        out[1] = a[1] * ONE;
        out[2] = a[2] * ONE;
    }

    // ------------------------------------------------------------ Nhóm A

    function test_SavingsPotsLockedTerm() public {
        _warpToEpoch(0);
        vm.startPrank(an);
        uint256 pid = pots.createPot("Du hoc", 2); // khóa đến kỳ 2
        token.approve(address(pots), 10 * ONE);
        pots.fundPot(pid, 10 * ONE);
        vm.stopPrank();
        assertEq(pots.potBalance(pid), 10 * ONE);

        // Rút trước hạn -> phạt 5% (Tính năng 32)
        vm.prank(an);
        pots.withdrawPot(pid, 10 * ONE);
        assertEq(token.balanceOf(address(treasury)), 500_000, "penalty 0.5 mUSDC");
    }

    function test_StreakBoostsTierAndVoucher() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _warpToEpochEnd(0);
        _finalize(0);
        assertEq(vault.getAccount(an).streak, 1);
        // Tier hiện tại: streak=1 -> NONE (10000)
        assertEq(boosts.weightMultiplier(an, 0), 10_000);

        // Tính năng 35: voucher +50% (dùng cho kỳ hiện tại = kỳ 1 sau khi warp qua end kỳ 0)
        vm.prank(deployer);
        boosts.mintVoucher(an, 1);
        vm.prank(an);
        boosts.useVoucher();
        assertEq(boosts.weightMultiplier(an, 1), 15_000, "voucher +50%");

        // Tính năng 36: boost window toàn cục x2 (max(tier, window) + voucher)
        vm.prank(deployer);
        boosts.openWindow(0, 100, 20_000);
        assertEq(boosts.weightMultiplier(an, 1), 25_000, "window x2 + voucher");
    }

    function test_EpochBonusEarlyBird() public {
        _warpToEpoch(0);
        _deposit(an, ONE);
        uint256 before = token.balanceOf(an);
        vm.prank(an);
        epochBonus.claimEarlyBird();
        assertEq(token.balanceOf(an), before + 500_000, "early bird 0.5");

        vm.prank(an);
        vm.expectRevert(EpochBonus.AlreadyPaid.selector);
        epochBonus.claimEarlyBird();
    }

    function test_WhaleDiscountAndFreeFirstWithdraw() public {
        vm.startPrank(deployer);
        vault.setWithdrawFeeBps(1000); // 10%
        vault.setWhaleDiscount(50 * ONE, 100); // whale chỉ 1%
        vault.setFreeFirstWithdraw(true);
        vm.stopPrank();

        _warpToEpoch(0);
        _deposit(an, 100 * ONE); // đạt ngưỡng whale

        // Tính năng 40: lần rút đầu miễn phí (dù là whale)
        _withdraw(an, 10 * ONE);
        assertEq(token.balanceOf(address(treasury)), 0, "first withdraw free");

        // Lần rút 2: phí whale 1%
        _withdraw(an, 10 * ONE);
        assertEq(token.balanceOf(address(treasury)), 100_000, "whale fee 1%");
    }

    // ------------------------------------------------------------ Nhóm B

    function test_GroupVaultSharedFund() public {
        _warpToEpoch(0);
        uint256 gid = _createGroup(an, "G1", "CODE1");
        vm.prank(binh);
        groups.joinGroup(gid, "CODE1");

        vm.startPrank(an);
        token.approve(address(groupVault), 6 * ONE);
        groupVault.fundGroup(gid, 6 * ONE);
        vm.stopPrank();
        vm.startPrank(binh);
        token.approve(address(groupVault), 2 * ONE);
        groupVault.fundGroup(gid, 2 * ONE);
        vm.stopPrank();
        assertEq(groupVault.shareOf(gid, an), 6 * ONE);
        assertEq(groupVault.shareOf(gid, binh), 2 * ONE);

        uint256 beforeB = token.balanceOf(binh);
        vm.prank(binh);
        groupVault.withdrawShare(gid);
        assertEq(token.balanceOf(binh), beforeB + 2 * ONE);
    }

    function test_TeamChallenge() public {
        _warpToEpoch(0);
        uint256 gid = _createGroup(an, "Team", "TEAM1");
        vm.prank(binh);
        groups.joinGroup(gid, "TEAM1"); // hiệu lực kỳ 1

        // Kỳ 1: cả hai gửi, tổng 10 >= target 10
        _warpToEpoch(1);
        _setTarget(an, 5 * ONE);
        _setTarget(binh, 5 * ONE);
        _deposit(an, 5 * ONE);
        _deposit(binh, 5 * ONE);

        vm.startPrank(chi);
        token.approve(address(teamChallenge), 10 * ONE);
        uint256 qid = teamChallenge.createQuest(gid, 1, 10 * ONE, 10 * ONE);
        vm.stopPrank();

        _warpToEpochEnd(1);
        _finalize(0);
        _finalize(1);

        uint256 beforeA = token.balanceOf(an);
        vm.prank(an);
        teamChallenge.claim(qid);
        assertEq(token.balanceOf(an), beforeA + 5 * ONE);

        uint256 beforeB = token.balanceOf(binh);
        vm.prank(binh);
        teamChallenge.claim(qid);
        assertEq(token.balanceOf(binh), beforeB + 5 * ONE);
    }

    function test_DuelWinnerTakesPot() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _setTarget(binh, ONE);
        _deposit(an, ONE); // An đạt kỳ 0

        vm.prank(an);
        token.approve(address(duel), ONE);
        vm.prank(an);
        uint256 did = duel.createDuel(ONE, 0, 1);

        vm.prank(binh);
        token.approve(address(duel), ONE);
        vm.prank(binh);
        duel.acceptDuel(did); // Bình không gửi -> fail kỳ 0

        _warpToEpochEnd(0);
        _finalize(0);

        uint256 beforeA = token.balanceOf(an);
        duel.resolveDuel(did);
        assertEq(token.balanceOf(an), beforeA + 2 * ONE, "winner takes 2x stake");
    }

    function test_ReferralSeasonsAndMentorship() public {
        _warpToEpoch(0);
        vm.prank(deployer);
        token.approve(address(referralSeasons), 10 * ONE);
        vm.prank(deployer);
        referralSeasons.startSeason(0, 10, 10 * ONE);

        // Tính năng 14: đăng ký referrer
        vm.prank(binh);
        referralSeasons.registerReferrer(an);
        assertEq(referralSeasons.points(1, an), 1);

        // Tính năng 20: mentorship — An nhận thưởng khi Bình đạt streak
        _setTarget(binh, ONE);
        _deposit(binh, ONE);
        _warpToEpochEnd(0);
        _finalize(0); // Bình streak 1

        uint256 beforeA = token.balanceOf(an);
        vm.prank(an);
        referralSeasons.claimMentorship(binh);
        assertEq(token.balanceOf(an), beforeA + 1 * ONE);
    }

    function test_ProfileSBT() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);

        vm.prank(an);
        uint256 tid = profile.mint("An Nguyen");
        assertEq(profile.displayNames(tid), "An Nguyen");
        assertEq(profile.tokenOf(an), tid);

        vm.prank(an);
        vm.expectRevert(ProfileSBT.TransfersDisabled.selector);
        profile.transferFrom(an, binh, tid);
    }

    function test_ActivityFeedFollow() public {
        vm.prank(an);
        feed.follow(binh);
        assertTrue(feed.isFollowing(an, binh));
        assertEq(feed.followerCount(binh), 1);

        vm.prank(an);
        feed.unfollow(binh);
        assertFalse(feed.isFollowing(an, binh));
    }

    function test_BuddyPactBothWin() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _setTarget(binh, ONE);

        vm.startPrank(an);
        token.approve(address(buddy), ONE);
        uint256 pid = buddy.createPact(binh, 0, ONE);
        vm.stopPrank();
        vm.prank(binh);
        token.approve(address(buddy), ONE);
        vm.prank(binh);
        buddy.joinPact(pid);

        _deposit(an, ONE);
        _deposit(binh, ONE);
        _warpToEpochEnd(0);
        _finalize(0);

        buddy.resolvePact(pid);
        // Cả hai đạt: mỗi ngườ nhận 2*ONE (an nhận về tổng 2 ONE, gồm 1 stake + 1 của Bình)
        assertGt(token.balanceOf(an), 1000 * ONE);
        assertGt(token.balanceOf(binh), 1000 * ONE);
    }

    function test_AnonCommitReveal() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        bytes32 salt = keccak256("salt");
        bytes32 h = keccak256(abi.encode(an, ONE, salt));
        vm.prank(an);
        anon.commit(0, h);

        _deposit(an, ONE);
        _warpToEpochEnd(0);
        _finalize(0);

        vm.prank(an);
        anon.reveal(0, ONE, salt);
        assertTrue(anon.fulfilled(0, an));
    }

    function test_GroupAlertsOffTrack() public {
        _warpToEpoch(0);
        uint256 gid = _createGroup(an, "Alert", "ALERT");
        vm.prank(binh);
        groups.joinGroup(gid, "ALERT");

        _warpToEpoch(1);
        _setTarget(an, 5 * ONE);
        _setTarget(binh, 5 * ONE);
        _deposit(an, 5 * ONE); // Bình chưa gửi

        uint256 off = alerts.checkGroup(gid);
        assertEq(off, 1);
    }

    // ------------------------------------------------------------ Nhóm C

    function test_BattlePassSeasonAndCheckIn() public {
        _warpToEpoch(0);
        vm.startPrank(deployer);
        token.approve(address(battlePass), 20 * ONE);
        uint256[] memory th = new uint256[](2);
        th[0] = 100;
        th[1] = 200;
        uint256[] memory rw = new uint256[](2);
        rw[0] = 5 * ONE;
        rw[1] = 10 * ONE;
        battlePass.startSeason(0, 10, 20 * ONE, th, rw);
        vm.stopPrank();

        // An đạt streak 1 -> sync 100 điểm -> đủ tier 0
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _warpToEpochEnd(0);
        _finalize(0);

        vm.prank(an);
        battlePass.sync();
        assertEq(battlePass.points(1, an), 100);

        // Tính năng 22: check-in kỳ 1 (đã gửi tiền kỳ 1)
        _warpToEpoch(1);
        _deposit(an, ONE);
        vm.prank(an);
        battlePass.checkIn();
        assertEq(battlePass.points(1, an), 125);

        uint256 before = token.balanceOf(an);
        vm.prank(an);
        battlePass.claimTier(0);
        assertEq(token.balanceOf(an), before + 5 * ONE);
    }

    function test_MysteryBoxGrantAndOpen() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        for (uint256 e; e < 3; ++e) {
            _warpToEpoch(e);
            _deposit(an, ONE);
            _warpToEpochEnd(e);
            _finalize(e);
        }
        assertEq(vault.getAccount(an).streak, 3);

        vm.prank(an);
        box.grantBox();
        assertEq(box.balanceOf(an, box.BOX_ID()), 1);

        uint256 before = token.balanceOf(an);
        vm.prank(an);
        box.openBox();
        assertGt(token.balanceOf(an), before);
        assertEq(box.balanceOf(an, box.BOX_ID()), 0);
    }

    function test_RaffleBuyAndDraw() public {
        _warpToEpoch(0);
        vm.prank(an);
        token.approve(address(raffle), 10 * ONE);
        vm.prank(an);
        raffle.buyTickets(10); // 10 vé, pool 10 mUSDC
        assertEq(raffle.totalTickets(0), 10);

        _warpToEpochEnd(0);
        _finalize(0);

        vm.prank(deployer);
        raffle.draw(0);
        assertEq(raffle.drawn(0), true);
        // Ngườ mua duy nhất trúng lại đúng 10 mUSDC (hoàn vốn vé)
        assertEq(token.balanceOf(an), 1000 * ONE);
    }

    function test_BadgesClaim() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        uint256 badgeId = badges.BADGE_FIRST_DEPOSIT();
        vm.prank(an);
        badges.claim(badgeId);
        assertEq(badges.balanceOf(an, 1), 1);
    }

    function test_BingoMarkAndClaim() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        // 3 kỳ liên tiếp: epoch 0,1,2 -> cell 0,1,2 (hàng 0)
        for (uint256 e; e < 3; ++e) {
            _warpToEpoch(e);
            _deposit(an, ONE);
            _warpToEpochEnd(e);
            _finalize(e);
        }
        vm.startPrank(an);
        bingo.mark(0);
        bingo.mark(1);
        bingo.mark(2);
        assertTrue(bingo.hasBingo(an));
        uint256 before = token.balanceOf(an);
        bingo.claimBingo();
        assertEq(token.balanceOf(an), before + 5 * ONE);
        vm.stopPrank();
    }

    function test_VoucherMarketListAndBuy() public {
        _warpToEpoch(0);
        vm.prank(deployer);
        voucherMarket.mintVouchers(an, 5);
        vm.startPrank(an);
        uint256 lid = voucherMarket.list(5, 10 * ONE);
        vm.stopPrank();

        uint256 beforeSeller = token.balanceOf(an);
        vm.prank(binh);
        token.approve(address(voucherMarket), 10 * ONE);
        vm.prank(binh);
        voucherMarket.buy(lid);
        assertEq(voucherMarket.voucherBalance(binh), 5);
        // Giá 10 - phí 2.5% = 9.75 về seller
        assertEq(token.balanceOf(an), beforeSeller + 9_750_000);
    }

    function test_SalvageSpinAfterFail() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _warpToEpochEnd(0);
        _finalize(0); // streak 1
        _warpToEpochEnd(1);
        _finalize(1); // miss -> streak 0

        assertTrue(salvage.spinAvailable(an));
        uint256 before = token.balanceOf(an);
        vm.prank(an);
        salvage.spin();
        assertEq(token.balanceOf(an), before + 1 * ONE);

        assertFalse(salvage.spinAvailable(an));
    }

    function test_SeasonBoardEndToEnd() public {
        _warpToEpoch(0);
        vm.prank(deployer);
        token.approve(address(seasonBoard), 10 * ONE);
        vm.prank(deployer);
        seasonBoard.startSeason(0, 2, 10 * ONE, 2);

        _setTarget(an, ONE);
        _deposit(an, ONE);
        vm.prank(an);
        seasonBoard.record(); // baseline

        _warpToEpoch(1);
        _deposit(an, ONE);
        _warpToEpochEnd(1);
        _finalize(0);
        _finalize(1); // An tăng điểm

        vm.prank(deployer);
        seasonBoard.endSeason();
        assertTrue(token.balanceOf(an) > 1000 * ONE, "top nhan thuong");
    }

    // ------------------------------------------------------------ Nhóm D

    function test_LendingPoolInterest() public {
        _warpToEpoch(0);
        vm.prank(an);
        token.approve(address(lending), 100 * ONE);
        vm.prank(an);
        lending.deposit(100 * ONE);

        // Warp 1 năm -> lãi ~5% (giả lập yield từ nguồn ngoài bơm vào pool)
        vm.warp(block.timestamp + 365 days);
        uint256 interest = lending.interestOf(an);
        assertEq(interest, 5 * ONE, "5% APY after 1 year");
        vm.prank(deployer);
        token.mint(address(lending), 10 * ONE);

        uint256 before = token.balanceOf(an);
        vm.prank(an);
        lending.withdraw();
        assertEq(token.balanceOf(an), before + 105 * ONE);
    }

    function test_YieldRouterBestSource() public {
        vm.prank(deployer);
        router.addSource(address(lending), "MockPool", 500);
        vm.prank(deployer);
        router.addSource(address(0x1234), "OtherPool", 900);

        (address pool, uint256 apy,) = router.bestSource();
        assertEq(pool, address(0x1234));
        assertEq(apy, 900);
    }

    function test_YieldSmootherRelease() public {
        // smoother đã nạp 8 mUSDC; release 2 mUSDC vào kỳ 0
        _warpToEpoch(0);
        smoother.release(0, 2 * ONE);
        assertEq(source.budgetOf(0), 2 * ONE);
        assertEq(smoother.surplus(), 6 * ONE);
    }

    function test_ReserveFundTopUp() public {
        _warpToEpoch(0);
        vm.prank(deployer);
        reserve.topUpEpoch(address(source), 0, 5 * ONE);
        assertEq(source.budgetOf(0), 5 * ONE);
        assertEq(reserve.balance(), 15 * ONE);
    }

    function test_RoundUpVault() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        vm.prank(an);
        token.approve(address(roundUp), type(uint256).max);

        // Chi 3.2 mUSDC -> round up 0.8
        vm.prank(an);
        roundUp.roundupFor(an, 3_200_000);
        assertEq(vault.getAccount(an).principal, 800_000);
        assertEq(roundUp.previewRoundUp(3_200_000), 800_000);
    }

    function test_AutoCompound() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _fundEpoch(0, 2 * ONE);
        _warpToEpochEnd(0);
        _finalize(0);

        vm.prank(an);
        distributor.setAutoCompound(true);
        // Kỳ 1: claim 2 mUSDC -> tự gửi lại vào vault
        _warpToEpoch(1);
        vm.prank(an);
        distributor.claimYield();
        assertEq(vault.getAccount(an).principal, 3 * ONE, "2 yield auto deposited");
    }

    function test_PortfolioView() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, 5 * ONE);

        PortfolioView.Portfolio memory p = portfolio.portfolioOf(an, pots, lending);
        assertEq(p.principal, 5 * ONE);
        assertEq(p.currentProgress, 5 * ONE);
        assertEq(p.streak, 0);
        assertEq(p.claimable, 0);
    }

    // ------------------------------------------------------------ Nhóm E

    function test_BatchHelperDepositWithTarget() public {
        _warpToEpoch(0);
        vm.prank(an);
        token.approve(address(batchHelper), 5 * ONE);
        vm.prank(an);
        batchHelper.batchDepositWithTarget(5 * ONE, 5 * ONE);
        IStreakVault.AccountView memory a = vault.getAccount(an);
        assertEq(a.principal, 5 * ONE);
        assertEq(a.currentProgress, 5 * ONE);
    }

    function test_BatchHelperRateLimit() public {
        _warpToEpoch(0);
        vm.startPrank(an);
        token.approve(address(batchHelper), 100 * ONE);
        for (uint256 i; i < 5; ++i) {
            batchHelper.batchDepositWithTarget(ONE, ONE);
        }
        vm.expectRevert(BatchHelper.BatchLimitReached.selector);
        batchHelper.batchDepositWithTarget(ONE, ONE);
        vm.stopPrank();
    }

    function test_CouncilMultisigPause() public {
        vm.prank(deployer);
        vault.transferOwnership(address(council));

        vm.prank(an);
        bytes32 action = council.approvePause(address(vault));
        vm.prank(binh);
        council.approvePause(address(vault));
        assertEq(council.approvals(action, an), true);

        council.executePause(address(vault));
        assertTrue(vault.paused());
    }

    function test_TimelockQueueAndExecute() public {
        vm.prank(deployer);
        vault.transferOwnership(address(timelock));

        bytes memory data = abi.encodeWithSignature("setWithdrawFeeBps(uint256)", 100);
        vm.prank(deployer);
        (bytes32 action,) = timelock.queue(address(vault), data);
        assertTrue(action != bytes32(0));

        // Chưa qua delay -> revert TooEarly
        vm.prank(deployer);
        vm.expectRevert(); // TooEarly(eta động)
        timelock.execute(address(vault), data);

        vm.warp(block.timestamp + 2 hours);
        vm.prank(deployer);
        timelock.execute(address(vault), data);
        assertEq(vault.withdrawFeeBps(), 100);
    }

    function test_WatchtowerAndAuditExporter() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        assertTrue(watchtower.systemHealthy());

        (bool ok,) = audit.verify();
        assertTrue(ok);

        AuditExporter.Snapshot memory s = audit.capture();
        assertEq(s.totalPrincipal, ONE);
        assertEq(s.vaultBalance, ONE);
    }

    function test_GasSponsor() public {
        uint256 before = token.balanceOf(an);
        vm.prank(an);
        gasSponsor.subsidize();
        assertEq(token.balanceOf(an), before + 20_000);

        vm.prank(an);
        vm.expectRevert(GasSponsor.CooldownActive.selector);
        gasSponsor.subsidize();
    }

    // ------------------------------------------------------------ helper

    function _createGroup(address who, string memory name, string memory code)
        internal
        returns (uint256 gid)
    {
        vm.prank(who);
        gid = groups.createGroup(name, code);
    }
}
