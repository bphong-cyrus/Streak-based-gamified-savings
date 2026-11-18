// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./BaseTest.sol";
import {Treasury} from "../src/Treasury.sol";
import {AutoSaver} from "../src/AutoSaver.sol";
import {StreakGroups} from "../src/StreakGroups.sol";
import {StreakNFT} from "../src/StreakNFT.sol";
import {Challenges} from "../src/Challenges.sol";
import {LuckyWheel} from "../src/LuckyWheel.sol";
import {SavingsGoal} from "../src/SavingsGoal.sol";
import {Leaderboard} from "../src/Leaderboard.sol";
import {ReminderCenter} from "../src/ReminderCenter.sol";
import {IStreakVault} from "../src/interfaces/IStreakVault.sol";

/// @notice Kiểm thử 25 tính năng mở rộng: freeze/revive/insurance, auto-save,
///         groups, NFT, challenges/missions, lucky wheel, goal, leaderboard, reminder.
contract ExtensionsTest is BaseTest {
    Treasury treasury;
    AutoSaver autoSaver;
    StreakGroups groups;
    StreakNFT nft;
    Challenges challenges;
    LuckyWheel wheel;
    SavingsGoal goal;
    Leaderboard leaderboard;
    ReminderCenter reminders;

    function setUp() public override {
        super.setUp();
        vm.startPrank(deployer);
        treasury = new Treasury();
        autoSaver = new AutoSaver(vault, token);
        groups = new StreakGroups(vault);
        nft = new StreakNFT(vault, "https://example.com/{id}.json");
        challenges = new Challenges(token, vault);
        wheel = new LuckyWheel(token);
        goal = new SavingsGoal(vault);
        leaderboard = new Leaderboard(vault);
        reminders = new ReminderCenter(vault);
        vault.setTreasury(address(treasury));
        distributor.setTreasury(address(treasury));
        vault.setProtectionFees(200_000, 500_000, 300_000);
        vm.stopPrank();
    }

    // ------------------------------------------------------------ freeze / revive / insurance

    function test_FreezeKeepsStreakOnMiss() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _warpToEpochEnd(0);
        _finalize(0);
        assertEq(vault.getAccount(an).streak, 1);

        // Kỳ 1: An freeze rồi thiếu target -> streak giữ nguyên 1
        _warpToEpoch(1);
        vm.prank(an);
        vault.freezeCurrentEpoch();
        _warpToEpochEnd(1);
        _finalize(1);
        assertEq(vault.getAccount(an).streak, 1, "freeze keeps streak");
        assertEq(token.balanceOf(address(treasury)), 200_000, "freeze fee to treasury");
    }

    function test_InsuranceKeepsStreakOnce() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _warpToEpochEnd(0);
        _finalize(0);
        assertEq(vault.getAccount(an).streak, 1);

        // Kỳ 1: bảo hiểm, thiếu target -> giữ streak, bảo hiểm tiêu hao
        _warpToEpoch(1);
        vm.prank(an);
        vault.insureCurrentEpoch();
        assertTrue(vault.hasInsurance(an));
        _warpToEpochEnd(1);
        _finalize(1);
        assertEq(vault.getAccount(an).streak, 1);
        assertFalse(vault.hasInsurance(an), "insurance consumed");

        // Kỳ 2: thiếu target không bảo hiểm -> về 0
        _warpToEpochEnd(2);
        _finalize(2);
        assertEq(vault.getAccount(an).streak, 0);
    }

    function test_ReviveRestoresStreakWithinWindow() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _warpToEpochEnd(0);
        _finalize(0);
        assertEq(vault.getAccount(an).streak, 1);

        // Kỳ 1 thất bại -> streak 0
        _warpToEpochEnd(1);
        _finalize(1);
        assertEq(vault.getAccount(an).streak, 0);
        assertEq(vault.lastFailedEpoch(an), 1);

        // Revive trong cửa sổ -> về 1
        vm.prank(an);
        vault.revive();
        assertEq(vault.getAccount(an).streak, 1);
        assertEq(token.balanceOf(address(treasury)), 500_000, "revive fee");
    }

    // ------------------------------------------------------------ depositFor / auto-save / round-up

    function test_DepositForCreditsWallet() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        // Bình (có token) gửi hộ cho An
        vm.prank(deployer);
        token.mint(binh, 5 * ONE);
        uint256 binhBefore = token.balanceOf(binh);
        vm.startPrank(binh);
        token.approve(address(vault), 5 * ONE);
        vault.depositFor(an, 5 * ONE);
        vm.stopPrank();

        IStreakVault.AccountView memory a = vault.getAccount(an);
        assertEq(a.principal, 5 * ONE);
        assertEq(a.currentProgress, 5 * ONE);
        assertEq(vault.depositCount(an), 1);
        assertEq(token.balanceOf(binh), binhBefore - 5 * ONE);
    }

    function test_AutoSaverExecutesOncePerEpoch() public {
        _warpToEpoch(0);
        _setTarget(an, 2 * ONE);
        vm.startPrank(an);
        autoSaver.register(2 * ONE, 0);
        token.approve(address(autoSaver), type(uint256).max);
        vm.stopPrank();

        vm.prank(binh); // bot gọi hộ
        autoSaver.execute(an);

        IStreakVault.AccountView memory a = vault.getAccount(an);
        assertEq(a.principal, 2 * ONE);
        assertEq(a.currentProgress, 2 * ONE);

        vm.prank(binh);
        vm.expectRevert(abi.encodeWithSelector(AutoSaver.AlreadyExecuted.selector, 0));
        autoSaver.execute(an);

        // Sang kỳ mới execute được tiếp
        _warpToEpoch(1);
        vm.prank(binh);
        autoSaver.execute(an);
        assertEq(vault.getAccount(an).principal, 4 * ONE);
    }

    function test_AutoSaverRoundUp() public {
        assertEq(autoSaver.previewAmount(address(0)), 0); // view không revert với ví chưa đăng ký
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        vm.startPrank(an);
        autoSaver.register(3_200_000, 1e6); // 3.2 -> làm tròn 4 mUSDC
        token.approve(address(autoSaver), type(uint256).max);
        vm.stopPrank();

        assertEq(autoSaver.previewAmount(an), 4e6);
        vm.prank(an);
        autoSaver.execute(an);
        assertEq(vault.getAccount(an).principal, 4e6);
    }

    // ------------------------------------------------------------ fees: withdraw fee / emergency

    function test_WithdrawFeeGoesToTreasury() public {
        vm.prank(deployer);
        vault.setWithdrawFeeBps(100); // 1%
        _warpToEpoch(0);
        _deposit(an, 10 * ONE);

        uint256 beforeTreasury = token.balanceOf(address(treasury));
        _withdraw(an, 10 * ONE);
        assertEq(token.balanceOf(address(treasury)), beforeTreasury + 100_000, "1% fee");
        assertEq(vault.getAccount(an).principal, 0);
    }

    function test_EmergencyWithdrawWithPenalty() public {
        vm.prank(deployer);
        vault.setEmergencyPenaltyBps(500); // 5%
        _warpToEpoch(0);
        _deposit(an, 10 * ONE);
        _deposit(binh, 10 * ONE);

        uint256 beforeTreasury = token.balanceOf(address(treasury));
        uint256 balBefore = token.balanceOf(an);
        vm.prank(an);
        vault.emergencyWithdraw();
        assertEq(vault.getAccount(an).principal, 0);
        assertEq(token.balanceOf(an), balBefore + 9_500_000);
        assertEq(token.balanceOf(address(treasury)), beforeTreasury + 500_000, "5% penalty");
        // Gốc Bình không bị ảnh hưởng
        assertEq(vault.getAccount(binh).principal, 10 * ONE);
    }

    // ------------------------------------------------------------ limits + pause

    function test_DepositLimits() public {
        vm.startPrank(deployer);
        vault.setMinDeposit(1e6);
        vault.setMaxDepositPerEpoch(5e6);
        vm.stopPrank();
        _warpToEpoch(0);

        vm.prank(an);
        vm.expectRevert(abi.encodeWithSelector(IStreakVault.DepositBelowMinimum.selector, 500_000, 1e6));
        vault.deposit(500_000);

        _deposit(an, 5 * ONE);
        vm.prank(an);
        vm.expectRevert(abi.encodeWithSelector(IStreakVault.DepositOverEpochLimit.selector, 6e6, 5e6));
        vault.deposit(ONE);
    }

    function test_PauseBlocksUserActions() public {
        _warpToEpoch(0);
        vm.prank(deployer);
        vault.pause();

        vm.prank(an);
        vm.expectRevert(); // EnforcedPause
        vault.deposit(ONE);

        vm.prank(an);
        vm.expectRevert();
        vault.withdraw(ONE);

        vm.prank(deployer);
        vault.unpause();
        _deposit(an, ONE);
        assertEq(vault.getAccount(an).principal, ONE);
    }

    // ------------------------------------------------------------ referral + yield fee + base/bonus

    function test_ReferralCommissionOnClaim() public {
        vm.prank(deployer);
        distributor.setReferralBps(1000); // 10%

        _warpToEpoch(0);
        _setTarget(binh, ONE);
        _setTarget(an, ONE);
        _deposit(binh, ONE);
        _deposit(an, ONE);

        vm.prank(binh);
        distributor.setReferrer(an);

        _fundEpoch(0, 2 * ONE);
        _warpToEpochEnd(0);
        _finalize(0);

        uint256 anBefore = token.balanceOf(an);
        uint256 binhBefore = token.balanceOf(binh);
        _claim(binh); // 1 mUSDC, 10% về An
        assertEq(token.balanceOf(an), anBefore + 100_000, "10% commission");
        assertEq(token.balanceOf(binh), binhBefore + 900_000);
        assertEq(distributor.referralEarnings(an), 100_000);
    }

    function test_YieldFeeToTreasury() public {
        vm.prank(deployer);
        distributor.setYieldFeeBps(1000); // 10%

        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _fundEpoch(0, 10 * ONE);
        _warpToEpochEnd(0);
        _finalize(0);

        assertEq(token.balanceOf(address(treasury)), 10 * ONE / 10, "10% yield fee");
        // 9 còn lại về An
        assertEq(_claim(an), 9 * ONE);
        assertEq(distributor.rollover(), 0);
    }

    function test_BaseBonusSplit() public {
        vm.prank(deployer);
        distributor.setBaseRatioBps(5000); // 50% theo gốc, 50% theo streak

        // Kỳ 0: cả hai gửi 5, cùng đạt -> streak 1:1
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _setTarget(binh, ONE);
        _deposit(an, 5 * ONE);
        _deposit(binh, 5 * ONE);
        _warpToEpochEnd(0);
        _finalize(0);

        // Kỳ 1: An gửi thêm 10 (gốc snapshot An 15, Bình 5); An đạt (streak 2), Bình bỏ (streak 0)
        _warpToEpoch(1);
        _deposit(an, 10 * ONE);
        _fundEpoch(1, 12 * ONE);
        _warpToEpochEnd(1);
        _finalize(1);

        // budget kỳ 1 = 12; base = 6 chia theo gốc 15:5 -> An 4.5, Bình 1.5
        // bonus = 6 chia theo streak 2:0 -> An 6, Bình 0
        // An = 10.5, Bình = 1.5 (tổng 12)
        assertEq(distributor.rewardOf(an, 1), 10_500_000);
        assertEq(distributor.rewardOf(binh, 1), 1_500_000);
    }

    // ------------------------------------------------------------ groups

    function test_GroupCreateJoinAndGroupStreak() public {
        _warpToEpoch(0);
        uint256 gid = _createGroup(an, "Nhom An", "AN-2026");
        vm.prank(binh);
        vm.expectRevert(StreakGroups.InvalidInviteCode.selector);
        groups.joinGroup(gid, "SAI-MA");

        // Bình join kỳ 1 -> có hiệu lực từ kỳ 2 (thành viên mới từ kỳ sau)
        _warpToEpoch(1);
        vm.prank(binh);
        groups.joinGroup(gid, "AN-2026");
        assertEq(groups.effectiveEpochOf(gid, binh), 2);

        // Kỳ 2: cả hai đặt target và đạt; chốt tuần tự kỳ 0 -> 2
        _warpToEpoch(2);
        _setTarget(an, ONE);
        _setTarget(binh, ONE);
        _deposit(an, ONE);
        _deposit(binh, ONE);
        _warpToEpochEnd(2);
        _finalize(0);
        _finalize(1);
        _finalize(2);

        assertEq(groups.groupStreak(gid), 1);

        // Kỳ 3: cả hai đạt nữa -> group streak 2
        _warpToEpoch(3);
        _deposit(an, ONE);
        _deposit(binh, ONE);
        _warpToEpochEnd(3);
        _finalize(3);
        assertEq(groups.groupStreak(gid), 2);

        // Kỳ 4: Bình bỏ -> group streak về 0
        _warpToEpoch(4);
        _deposit(an, ONE);
        _warpToEpochEnd(4);
        _finalize(4);
        assertEq(groups.groupStreak(gid), 0);
    }

    function _createGroup(address who, string memory name, string memory code)
        internal
        returns (uint256 gid)
    {
        vm.prank(who);
        gid = groups.createGroup(name, code);
    }

    // ------------------------------------------------------------ NFT milestones

    function test_NFTMilestoneMintAndSoulbound() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);

        // 3 kỳ đạt -> streak 3
        for (uint256 e; e < 3; ++e) {
            _warpToEpoch(e);
            _deposit(an, ONE);
            _warpToEpochEnd(e);
            _finalize(e);
        }
        assertEq(vault.getAccount(an).streak, 3);
        assertEq(nft.eligibleTier(an), 3);

        vm.prank(an);
        nft.mint();
        assertEq(nft.balanceOf(an, 3), 1);

        vm.prank(an);
        vm.expectRevert(StreakNFT.AlreadyMinted.selector);
        nft.mint();

        // Soulbound: chuyển bị chặn
        vm.prank(an);
        vm.expectRevert(StreakNFT.TransfersDisabled.selector);
        nft.safeTransferFrom(an, binh, 3, 1, "");

        // Bình streak 0 -> không mint được
        vm.prank(binh);
        vm.expectRevert(StreakNFT.StreakNotReached.selector);
        nft.mint();
    }

    // ------------------------------------------------------------ challenges / missions

    function test_SponsoredChallengeClaim() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _warpToEpochEnd(0);
        _finalize(0); // An streak 1

        // Sponsor (Chi) tạo challenge min streak 1, giải 2 mUSDC, 2 winners
        vm.startPrank(chi);
        token.approve(address(challenges), 4 * ONE);
        uint256 cid = challenges.createChallenge(
            Challenges.Kind.STREAK, 1, 0, 2 * ONE, 2, 10 // deadline kỳ 10
        );
        vm.stopPrank();

        uint256 before = token.balanceOf(an);
        vm.prank(an);
        challenges.claim(cid);
        assertEq(token.balanceOf(an), before + 2 * ONE);
        assertEq(challenges.totalWon(an), 2 * ONE);

        vm.prank(an);
        vm.expectRevert(Challenges.AlreadyClaimed.selector);
        challenges.claim(cid);

        // Bình streak 0 -> không claim được
        vm.prank(binh);
        vm.expectRevert(Challenges.RequirementsNotMet.selector);
        challenges.claim(cid);
    }

    function test_MissionDepositCount() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _deposit(an, ONE);
        _warpToEpochEnd(0);
        _finalize(0);

        // Mission: gửi đủ 2 lần -> thưởng 3 mUSDC
        vm.startPrank(chi);
        token.approve(address(challenges), 3 * ONE);
        uint256 mid = challenges.createChallenge(Challenges.Kind.DEPOSIT_COUNT, 0, 2, 3 * ONE, 1, 10);
        vm.stopPrank();

        uint256 before = token.balanceOf(an);
        vm.prank(an);
        challenges.claim(mid);
        assertEq(token.balanceOf(an), before + 3 * ONE);
        assertEq(vault.depositCount(an), 2);
    }

    // ------------------------------------------------------------ lucky wheel

    function test_LuckyWheelSpinOncePerEpoch() public {
        vm.startPrank(deployer);
        token.mint(deployer, 10 * ONE);
        token.approve(address(wheel), 10 * ONE);
        wheel.fund(10 * ONE);
        uint256[] memory probs = new uint256[](2);
        probs[0] = 5000;
        probs[1] = 5000;
        uint256[] memory prizes = new uint256[](2);
        prizes[0] = ONE;
        prizes[1] = 2 * ONE;
        wheel.setTiers(probs, prizes);
        vm.stopPrank();

        _warpToEpoch(0);
        vm.prank(an);
        wheel.spin(0); // trúng 1 hoặc 2
        assertTrue(token.balanceOf(an) > 1000 * ONE - 0); // vẫn giữ nguyên ban đầu + giải

        vm.prank(an);
        vm.expectRevert(abi.encodeWithSelector(LuckyWheel.AlreadySpun.selector, 0));
        wheel.spin(0);

        _warpToEpoch(1);
        vm.prank(an);
        wheel.spin(1); // kỳ mới quay lại được
    }

    // ------------------------------------------------------------ savings goal

    function test_SavingsGoalReached() public {
        _warpToEpoch(0);
        vm.prank(an);
        goal.setGoal(10 * ONE, 5); // deadline kỳ 5

        _deposit(an, 10 * ONE);
        vm.prank(an);
        assertTrue(goal.checkReached());

        (uint256 target, uint256 deadline, uint256 progress, bool reached, bool active) = goal.statusOf(an);
        assertEq(target, 10 * ONE);
        assertEq(deadline, 5);
        assertEq(progress, 10 * ONE);
        assertTrue(reached);
        assertTrue(active);

        // Đã reached -> không check lại
        vm.prank(an);
        vm.expectRevert(SavingsGoal.GoalNotActive.selector);
        goal.checkReached();
    }

    // ------------------------------------------------------------ leaderboard + reminder

    function test_LeaderboardScores() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, 5 * ONE);
        _deposit(an, 5 * ONE); // 2 lần gửi

        uint256 score = leaderboard.scoreOf(an);
        // streak 0*1000 + 2*10 + 10 (principal/1e6) = 30
        assertEq(score, 30);

        (address[] memory wallets, uint256[] memory scores) = leaderboard.leaderboard();
        assertEq(wallets.length, 1);
        assertEq(scores.length, 1);
        assertEq(scores[0], 30);
    }

    function test_ReminderPokeEmitsOncePerEpoch() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        vm.prank(an);
        reminders.optIn();

        vm.expectEmit(true, false, false, false);
        emit ReminderCenter.EpochOpened(0, vault.epochEnd(0), new address[](0), new address[](0));
        reminders.poke();

        vm.expectRevert(bytes("announced"));
        reminders.poke();

        _warpToEpoch(1);
        reminders.poke(); // kỳ mới poke được
    }
}
