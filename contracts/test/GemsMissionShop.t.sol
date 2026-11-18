// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./BaseTest.sol";
import {Gems} from "../src/Gems.sol";
import {Missions} from "../src/Missions.sol";
import {GemShop} from "../src/GemShop.sol";

/// @notice Kiểm thử vòng lặp tiền tệ trong game: Missions mint Gems -> GemShop tiêu Gems.
contract GemsMissionShopTest is BaseTest {
    Gems internal gems;
    Missions internal missions;
    GemShop internal shop;

    uint256 internal weeklyId;
    uint256 internal streak4Id;
    uint256 internal depositsId;
    uint256 internal savedId;

    function setUp() public virtual override {
        super.setUp();
        vm.startPrank(deployer);
        gems = new Gems(deployer);
        missions = new Missions(vault, gems, deployer);
        shop = new GemShop(gems, deployer, deployer);
        gems.grantRole(gems.MINTER_ROLE(), address(missions));

        weeklyId = missions.addMission(Missions.Kind.WeeklyTarget, 0, 10, true);
        streak4Id = missions.addMission(Missions.Kind.StreakMilestone, 4, 100, false);
        depositsId = missions.addMission(Missions.Kind.DepositCount, 3, 25, false);
        savedId = missions.addMission(Missions.Kind.TotalSaved, 10 * ONE, 50, false);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ Gems

    function testMintRequiresMinterRole() public {
        bytes32 minterRole = gems.MINTER_ROLE();
        vm.prank(an);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), an, minterRole
            )
        );
        gems.mint(an, 100);

        vm.startPrank(deployer);
        gems.grantRole(minterRole, deployer);
        gems.mint(an, 100);
        vm.stopPrank();
        assertEq(gems.balanceOf(an), 100);
    }

    // ------------------------------------------------------------------ WeeklyTarget (recurring)

    function testWeeklyTargetPaysEachEpoch() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        _deposit(an, 5 * ONE);

        assertTrue(missions.canClaim(weeklyId, an));
        vm.prank(an);
        missions.claim(weeklyId);
        assertEq(gems.balanceOf(an), 10);

        // Kỳ này đã nhận, claim lại revert.
        vm.prank(an);
        vm.expectRevert(Missions.AlreadyClaimed.selector);
        missions.claim(weeklyId);

        // Kỳ sau gửi đủ lại nhận tiếp.
        _warpToEpoch(1);
        _deposit(an, 5 * ONE);
        vm.prank(an);
        missions.claim(weeklyId);
        assertEq(gems.balanceOf(an), 20);
    }

    function testWeeklyTargetNotEligibleWhenUnderDeposited() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        _deposit(an, 2 * ONE);
        vm.prank(an);
        vm.expectRevert(Missions.NotEligible.selector);
        missions.claim(weeklyId);
    }

    function testWeeklyTargetNotEligibleBeforeActivation() public {
        _warpToEpoch(0);
        vm.prank(an);
        vm.expectRevert(Missions.NotEligible.selector);
        missions.claim(weeklyId);
    }

    // ------------------------------------------------------------------ StreakMilestone

    function testStreakMilestoneOneTime() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);

        // 4 kỳ đủ mục tiêu -> streak 4.
        for (uint256 e; e < 4; ++e) {
            _deposit(an, 5 * ONE);
            _warpToEpochEnd(e);
            _finalize(e);
            _warpToEpoch(e + 1);
        }
        assertEq(vault.getAccount(an).streak, 4);

        vm.prank(an);
        missions.claim(streak4Id);
        assertEq(gems.balanceOf(an), 100);

        vm.prank(an);
        vm.expectRevert(Missions.AlreadyClaimed.selector);
        missions.claim(streak4Id);
    }

    function testStreakMilestoneBelowThreshold() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        _deposit(an, 5 * ONE);
        _warpToEpochEnd(0);
        _finalize(0);
        assertEq(vault.getAccount(an).streak, 1);
        vm.prank(an);
        vm.expectRevert(Missions.NotEligible.selector);
        missions.claim(streak4Id);
    }

    // ------------------------------------------------------------------ DepositCount / TotalSaved

    function testDepositCount() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _deposit(an, ONE);
        assertFalse(missions.canClaim(depositsId, an));
        _deposit(an, ONE);
        assertTrue(missions.canClaim(depositsId, an));
        vm.prank(an);
        missions.claim(depositsId);
        assertEq(gems.balanceOf(an), 25);
    }

    function testTotalSaved() public {
        _warpToEpoch(0);
        _setTarget(an, 10 * ONE);
        _deposit(an, 10 * ONE);
        vm.prank(an);
        missions.claim(savedId);
        assertEq(gems.balanceOf(an), 50);
    }

    // ------------------------------------------------------------------ quản trị

    function testInactiveMissionReverts() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        _deposit(an, 5 * ONE);

        vm.prank(deployer);
        missions.setActive(weeklyId, false);

        vm.prank(an);
        vm.expectRevert(Missions.MissionInactive.selector);
        missions.claim(weeklyId);
    }

    function testNonRecurringWeeklyMissionForbidden() public {
        vm.prank(deployer);
        vm.expectRevert(Missions.NotEligible.selector);
        missions.addMission(Missions.Kind.WeeklyTarget, 0, 10, false);
    }

    function testMissionNotFound() public {
        vm.expectRevert(Missions.MissionNotFound.selector);
        missions.canClaim(99, an);
    }

    // ------------------------------------------------------------------ GemShop

    function _earnGems(address who, uint256 amount) internal {
        bytes32 minterRole = gems.MINTER_ROLE();
        vm.startPrank(deployer);
        gems.grantRole(minterRole, deployer);
        gems.mint(who, amount);
        gems.renounceRole(minterRole, deployer);
        vm.stopPrank();
    }

    function testBuyTheme() public {
        vm.prank(deployer);
        shop.setTheme(7, 40); // theme 7 giá 40 Gems
        _earnGems(an, 100);
        vm.prank(an);
        gems.approve(address(shop), type(uint256).max);

        vm.prank(an);
        shop.buyTheme(7);
        assertTrue(shop.ownedThemes(an, 7));
        assertEq(gems.balanceOf(an), 60);
        assertEq(gems.balanceOf(deployer), 40); // treasury

        vm.prank(an);
        vm.expectRevert(GemShop.AlreadyOwned.selector);
        shop.buyTheme(7);
    }

    function testBuyDecor() public {
        vm.prank(deployer);
        shop.setDecor(3, 15);
        _earnGems(binh, 20);
        vm.prank(binh);
        gems.approve(address(shop), type(uint256).max);

        vm.prank(binh);
        shop.buyDecor(3);
        assertTrue(shop.ownedDecors(binh, 3));
        assertEq(gems.balanceOf(binh), 5);
    }

    function testBuyNotForSaleReverts() public {
        _earnGems(an, 100);
        vm.prank(an);
        gems.approve(address(shop), type(uint256).max);
        vm.prank(an);
        vm.expectRevert(GemShop.ItemNotForSale.selector);
        shop.buyTheme(123);
    }

    function testBuyWithoutGemsReverts() public {
        vm.prank(deployer);
        shop.setTheme(1, 40);
        vm.prank(an);
        gems.approve(address(shop), type(uint256).max);
        vm.prank(an);
        vm.expectRevert();
        shop.buyTheme(1);
    }

    // ------------------------------------------------------------------ vòng lặp đầy đủ

    function testEarnThenSpendLoop() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        _deposit(an, 5 * ONE);

        vm.prank(an);
        missions.claim(weeklyId); // +10 Gems

        vm.prank(deployer);
        shop.setTheme(1, 10);
        vm.prank(an);
        gems.approve(address(shop), 10);

        vm.prank(an);
        shop.buyTheme(1);
        assertEq(gems.balanceOf(an), 0);
        assertTrue(shop.ownedThemes(an, 1));
        _assertSolvency();
    }
}
