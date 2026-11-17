// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {console2} from "forge-std/Test.sol";
import {BaseTest} from "./BaseTest.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {IMockYieldSource} from "../src/interfaces/IMockYieldSource.sol";

contract YieldDistributorTest is BaseTest {
    // ------------------------------------------------------------ finalize ordering

    function test_RevertFinalizeBeforeEnd() public {
        _warpToEpoch(0);
        vm.expectRevert(abi.encodeWithSelector(YieldDistributor.EpochNotEnded.selector, 0, startAt + EPOCH));
        distributor.finalizeEpoch(0);

        vm.warp(startAt + EPOCH - 1);
        vm.expectRevert();
        distributor.finalizeEpoch(0);
    }

    function test_RevertFinalizeWrongEpoch() public {
        _warpToEpochEnd(3);
        vm.expectRevert(abi.encodeWithSelector(YieldDistributor.EpochOutOfOrder.selector, 0, 1));
        distributor.finalizeEpoch(1);
    }

    function test_RevertFinalizeTwice() public {
        _warpToEpochEnd(0);
        _finalize(0);
        vm.expectRevert(abi.encodeWithSelector(YieldDistributor.EpochOutOfOrder.selector, 1, 0));
        distributor.finalizeEpoch(0);
    }

    function test_CanFinalizeFlag() public {
        _warpToEpoch(0);
        assertFalse(distributor.canFinalize());
        _warpToEpochEnd(0);
        assertTrue(distributor.canFinalize());
        _finalize(0);
        assertFalse(distributor.canFinalize());
    }

    // ------------------------------------------------------------ split math

    function test_Split_2_1_0() public {
        // Tạo streak An=2, Bình=1, Chi=0 tại kỳ 1, ngân sách kỳ 1 = 3 mUSDC.
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _setTarget(binh, ONE);
        _setTarget(chi, ONE);
        _deposit(an, ONE);
        _warpToEpoch(1);
        _deposit(an, ONE);
        _deposit(binh, ONE);
        _fundEpoch(1, 3 * ONE);
        _warpToEpochEnd(1);
        _finalize(0);
        _finalize(1);

        assertEq(distributor.rewardOf(an, 1), 2 * ONE);
        assertEq(distributor.rewardOf(binh, 1), 1 * ONE);
        assertEq(distributor.rewardOf(chi, 1), 0);
        assertEq(distributor.rollover(), 0);
        _assertSolvency();
    }

    function test_ZeroBudgetStillSettlesStreak() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _warpToEpochEnd(0);
        _finalize(0);

        assertEq(vault.getAccount(an).streak, 1);
        assertEq(distributor.claimableYield(an), 0);
        YieldDistributor.EpochSummary memory s = distributor.getEpochSummary(0);
        assertTrue(s.finalized);
        assertEq(s.budget, 0);
        assertEq(s.totalWeight, 1);
    }

    function test_RolloverWhenTotalWeightZero() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        _deposit(an, ONE); // không đạt
        _fundEpoch(0, 2 * ONE);
        _fundEpoch(1, 3 * ONE);
        _warpToEpochEnd(0);
        _finalize(0);
        assertEq(distributor.rollover(), 2 * ONE);
        assertEq(distributor.claimableYield(an), 0);
        _assertSolvency();

        // Kỳ 1: An đạt -> nhận cả 3 + 2 rollover
        _deposit(an, 5 * ONE);
        _warpToEpochEnd(1);
        _finalize(1);
        assertEq(distributor.rewardOf(an, 1), 5 * ONE);
        assertEq(distributor.rollover(), 0);
        _assertSolvency();
    }

    function test_RoundingRemainderRollsOver() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _setTarget(binh, ONE);
        _setTarget(chi, ONE);
        _deposit(an, ONE);
        _deposit(binh, ONE);
        _deposit(chi, ONE);
        _fundEpoch(0, 10); // 10 đơn vị nhỏ nhất chia 3
        _warpToEpochEnd(0);
        _finalize(0);

        assertEq(distributor.rewardOf(an, 0), 3);
        assertEq(distributor.rewardOf(binh, 0), 3);
        assertEq(distributor.rewardOf(chi, 0), 3);
        assertEq(distributor.rollover(), 1);
        assertEq(distributor.totalClaimable() + distributor.rollover(), token.balanceOf(address(distributor)));
    }

    function test_SkippedEpochsFinalizeSequentially() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _warpToEpoch(1);
        _deposit(an, ONE);
        // Bỏ kỳ 2, 3. Kỳ 4 gửi lại.
        _warpToEpoch(4);
        _deposit(an, ONE);
        _warpToEpochEnd(4);

        for (uint256 e; e <= 4; ++e) {
            _finalize(e);
        }
        assertEq(vault.getEpochStatus(an, 1).streakAtSettle, 2);
        assertFalse(vault.getEpochStatus(an, 2).qualified);
        assertEq(vault.getEpochStatus(an, 3).streakAtSettle, 0);
        assertEq(vault.getEpochStatus(an, 4).streakAtSettle, 1);
        assertEq(vault.getAccount(an).streak, 1);
        assertEq(distributor.nextEpochToFinalize(), 5);
    }

    function test_LateActivation() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _warpToEpoch(2);
        _setTarget(chi, ONE); // kích hoạt muộn tại kỳ 2
        _deposit(chi, ONE);
        _warpToEpochEnd(2);
        _finalize(0);
        _finalize(1);
        _finalize(2);

        assertFalse(vault.getEpochStatus(chi, 0).settled, "chi not considered before activation");
        assertFalse(vault.getEpochStatus(chi, 1).settled);
        assertTrue(vault.getEpochStatus(chi, 2).qualified);
        assertEq(vault.getEpochStatus(chi, 2).streakAtSettle, 1);
    }

    function test_SettledResultImmutableAfterWithdraw() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _fundEpoch(0, 2 * ONE);
        _warpToEpochEnd(0);
        _finalize(0);
        _withdraw(an, ONE);
        _warpToEpochEnd(1);
        _finalize(1);

        assertTrue(vault.getEpochStatus(an, 0).qualified);
        assertEq(vault.getEpochStatus(an, 0).streakAtSettle, 1);
        assertEq(vault.getAccount(an).streak, 0);
        // vẫn claim được thưởng kỳ 0 dù đã rút hết gốc
        assertEq(_claim(an), 2 * ONE);
    }

    // ------------------------------------------------------------ funding

    function test_RevertFundAfterEpochEnd() public {
        _warpToEpochEnd(0);
        vm.startPrank(deployer);
        token.mint(deployer, ONE);
        token.approve(address(source), ONE);
        vm.expectRevert(abi.encodeWithSelector(IMockYieldSource.FundingClosed.selector, 0, startAt + EPOCH));
        source.fundEpoch(0, ONE);
        vm.stopPrank();
    }

    function test_FundBeforeStartAllowed() public {
        _fundEpoch(0, 2 * ONE);
        assertEq(source.budgetOf(0), 2 * ONE);
    }

    function test_RevertReleaseNotDistributor() public {
        vm.expectRevert(IMockYieldSource.NotDistributor.selector);
        source.release(0);
    }

    // ------------------------------------------------------------ claim

    function test_ClaimAndDoubleClaim() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _fundEpoch(0, 2 * ONE);
        _warpToEpochEnd(0);
        _finalize(0);

        uint256 before = token.balanceOf(an);
        assertEq(_claim(an), 2 * ONE);
        assertEq(token.balanceOf(an), before + 2 * ONE);
        assertEq(distributor.claimableYield(an), 0);
        assertEq(distributor.claimedYield(an), 2 * ONE);

        vm.prank(an);
        vm.expectRevert(YieldDistributor.NothingToClaim.selector);
        distributor.claimYield();
        _assertSolvency();
    }

    function test_ClaimDoesNotAffectProgress() public {
        _warpToEpoch(0);
        _setTarget(an, ONE);
        _deposit(an, ONE);
        _fundEpoch(0, 2 * ONE);
        _warpToEpochEnd(0);
        _finalize(0);
        _claim(an);
        assertEq(vault.getAccount(an).currentDeposited, 0);
        assertEq(vault.getAccount(an).principal, ONE);
    }

    // ------------------------------------------------------------ gas, 20 wallets

    function test_Gas_Finalize20Wallets() public {
        _warpToEpoch(0);
        for (uint256 i; i < 20; ++i) {
            address w = address(uint160(0x1000 + i));
            _fundWallet(w, 10 * ONE);
            _setTarget(w, ONE);
            _deposit(w, ONE);
        }
        _fundEpoch(0, 100 * ONE);
        _warpToEpochEnd(0);

        uint256 g = gasleft();
        _finalize(0);
        uint256 used = g - gasleft();
        console2.log("finalizeEpoch gas (20 wallets):", used);
        // Fuji block gas limit 15M; giữ ngưỡng an toàn cho 20 ví.
        assertLt(used, 3_000_000, "finalize gas too high");

        assertEq(distributor.rewardOf(address(uint160(0x1000)), 0), 5 * ONE);
        _assertSolvency();
    }
}
