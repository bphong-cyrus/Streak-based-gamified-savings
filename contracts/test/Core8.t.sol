// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./BaseTest.sol";
import {DailyCheckIn} from "../src/DailyCheckIn.sol";
import {SavingsGoal} from "../src/SavingsGoal.sol";
import {StreakNFT} from "../src/StreakNFT.sol";
import {FaucetDrip} from "../src/FaucetDrip.sol";
import {IStreakVault} from "../src/interfaces/IStreakVault.sol";

/// @notice Test suite cho 4 core contract vệ tinh: FaucetDrip, DailyCheckIn, SavingsGoal, StreakNFT
///         + một ca tích hợp deposit -> streak -> NFT.
contract Core8Test is BaseTest {
    DailyCheckIn internal checkIn;
    SavingsGoal internal goal;
    StreakNFT internal nft;
    FaucetDrip internal faucet;

    function setUp() public override {
        super.setUp();
        vm.startPrank(deployer);
        checkIn = new DailyCheckIn(token);
        goal = new SavingsGoal(vault);
        nft = new StreakNFT(vault, "ipfs://test/{id}.json");
        faucet = new FaucetDrip(vault, token);
        vault.setOperator(address(faucet), true);
        vm.stopPrank();

        vm.prank(deployer);
        token.mint(deployer, 1_000 * ONE);
        vm.startPrank(deployer);
        token.approve(address(faucet), 100 * ONE);
        faucet.fund(100 * ONE);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ FaucetDrip

    function testFaucetDripOnboardsNewWallet() public {
        _warpToEpoch(0); // vault da khoi dong moi drip duoc
        address newbie = makeAddr("newbie");
        vm.prank(newbie);
        faucet.drip();

        // drip gửi thẳng 5 mUSDC VÀO vault: ví mới có ngay gốc tiết kiệm + mục tiêu kỳ đầu
        IStreakVault.AccountView memory acc = vault.getAccount(newbie);
        assertEq(acc.principal, 5 * ONE);
        assertEq(acc.currentTarget, 2 * ONE);
        assertTrue(acc.activated);

        vm.prank(newbie);
        vm.expectRevert(); // chỉ drip một lần
        faucet.drip();
    }

    // ------------------------------------------------------------------ DailyCheckIn

    function testCheckInRewardsAndStreak() public {
        vm.startPrank(deployer);
        token.approve(address(checkIn), 10 * ONE);
        checkIn.fund(10 * ONE);
        vm.stopPrank();

        uint256 balBefore = token.balanceOf(an);

        vm.prank(an);
        checkIn.checkIn();
        assertEq(checkIn.checkInStreakDays(an), 1);
        assertEq(token.balanceOf(an) - balBefore, checkIn.baseReward());

        // Ngày kế tiếp: chuỗi tăng, thưởng nhiều hơn
        vm.warp(block.timestamp + 1 days);
        vm.prank(an);
        checkIn.checkIn();
        assertEq(checkIn.checkInStreakDays(an), 2);
        uint256 expected = checkIn.baseReward() + (checkIn.baseReward() * checkIn.bonusBpsPerStreakDay()) / 10_000;
        assertEq(token.balanceOf(an) - balBefore, checkIn.baseReward() + expected);

        // Cùng ngày: revert
        vm.prank(an);
        vm.expectRevert(DailyCheckIn.AlreadyCheckedIn.selector);
        checkIn.checkIn();

        // Bỏ 1 ngày -> chuỗi về 1
        vm.warp(block.timestamp + 2 days);
        vm.prank(an);
        checkIn.checkIn();
        assertEq(checkIn.checkInStreakDays(an), 1);
    }

    function testCheckInRecordsWhenPoolEmpty() public {
        vm.prank(an);
        checkIn.checkIn(); // pool = 0 -> vẫn ghi nhận, không trả thưởng
        assertEq(checkIn.checkInStreakDays(an), 1);
        assertEq(checkIn.rewardPool(), 0);
    }

    // ------------------------------------------------------------------ SavingsGoal

    function testSavingsGoalLifecycle() public {
        _warpToEpoch(0);
        vm.prank(an);
        vault.setWeeklyTarget(1 * ONE);
        vm.prank(an);
        vault.deposit(1 * ONE);

        vm.prank(an);
        goal.setGoal(3 * ONE, 4); // mục tiêu 3 mUSDC trước kỳ 4

        (uint256 target,, uint256 progress, bool reached, bool active) = goal.statusOf(an);
        assertEq(target, 3 * ONE);
        assertEq(progress, 1 * ONE);
        assertFalse(reached);
        assertTrue(active);

        // Gửi thêm 2 kỳ nữa -> principal 3
        _warpToEpoch(1);
        vm.prank(an);
        vault.deposit(1 * ONE);
        _warpToEpoch(2);
        vm.prank(an);
        vault.deposit(1 * ONE);

        vm.prank(an);
        assertTrue(goal.checkReached());
        (, , , reached, ) = goal.statusOf(an);
        assertTrue(reached);
    }

    function testSavingsGoalCannotReachBelowTarget() public {
        _warpToEpoch(0);
        vm.prank(an);
        goal.setGoal(100 * ONE, 4);
        vm.prank(an);
        vault.setWeeklyTarget(1 * ONE);
        vm.prank(an);
        vault.deposit(1 * ONE);

        vm.prank(an);
        vm.expectRevert();
        goal.checkReached();
    }

    // ------------------------------------------------------------------ StreakNFT

    function testStreakNFTMilestones() public {
        // An: streak 0 -> chưa đủ
        assertEq(nft.eligibleTier(an), 0);

        _warpToEpoch(0);
        vm.prank(an);
        vault.setWeeklyTarget(1 * ONE);

        // 3 kỳ đạt mục tiêu -> streak 3 -> tier 3
        for (uint256 e; e < 3; ++e) {
            _warpToEpoch(e);
            vm.prank(an);
            vault.deposit(1 * ONE);
            _warpToEpochEnd(e);
            vm.prank(deployer);
            distributor.finalizeEpoch(e);
        }
        assertEq(vault.getAccount(an).streak, 3);
        assertEq(nft.eligibleTier(an), 3);

        vm.prank(an);
        assertEq(nft.mint(), 3);
        assertEq(nft.balanceOf(an, 3), 1);

        vm.prank(an);
        vm.expectRevert(); // không mint trùng
        nft.mint();
    }

    function testStreakNFTIntegration_FullJourney() public {
        // Ví mới: faucet -> set target + gốc -> 3 kỳ đạt -> check-in -> goal -> NFT -> claim yield
        address user = makeAddr("user");
        _warpToEpoch(0);
        vm.prank(user);
        faucet.drip(); // kích hoạt + 5 mUSDC + mục tiêu gợi ý 2

        // mint them de user gui tiep moi ky
        vm.prank(deployer);
        token.mint(user, 10 * ONE);
        vm.prank(user);
        token.approve(address(vault), type(uint256).max);
        vm.prank(user);
        vault.deposit(2 * ONE);
        _warpToEpochEnd(0);
        vm.prank(deployer);
        distributor.finalizeEpoch(0);

        _warpToEpoch(1);
        vm.prank(user);
        vault.deposit(2 * ONE);
        _warpToEpochEnd(1);
        vm.prank(deployer);
        distributor.finalizeEpoch(1);

        assertEq(vault.getAccount(user).streak, 2);
        assertEq(nft.eligibleTier(user), 0); // tier đầu ở mốc 3

        _warpToEpoch(2);
        vm.prank(user);
        vault.deposit(2 * ONE);
        _warpToEpochEnd(2);
        vm.prank(deployer);
        distributor.finalizeEpoch(2);

        assertEq(vault.getAccount(user).streak, 3);
        vm.prank(user);
        assertEq(nft.mint(), 3);

        // Goal: gốc = 6 -> đạt mục tiêu 5
        vm.prank(user);
        goal.setGoal(5 * ONE, 10);
        vm.prank(user);
        assertTrue(goal.checkReached());

        // Check-in có thưởng
        vm.startPrank(deployer);
        token.approve(address(checkIn), ONE);
        checkIn.fund(ONE);
        vm.stopPrank();
        vm.prank(user);
        checkIn.checkIn();
        assertEq(checkIn.checkInStreakDays(user), 1);
    }
}
