// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./BaseTest.sol";
import {IStreakVault} from "../src/interfaces/IStreakVault.sol";

contract StreakVaultTest is BaseTest {
    // ------------------------------------------------------------ start gating

    function test_RevertBeforeStart() public {
        assertFalse(vault.hasStarted());
        assertEq(vault.currentEpoch(), 0);

        vm.prank(an);
        vm.expectRevert(IStreakVault.NotStarted.selector);
        vault.setWeeklyTarget(5 * ONE);

        vm.prank(an);
        vm.expectRevert(IStreakVault.NotStarted.selector);
        vault.deposit(5 * ONE);
    }

    function test_EpochMath() public {
        _warpToEpoch(0);
        assertTrue(vault.hasStarted());
        assertEq(vault.currentEpoch(), 0);
        assertEq(vault.epochStart(0), startAt);
        assertEq(vault.epochEnd(0), startAt + EPOCH);

        vm.warp(startAt + EPOCH - 1);
        assertEq(vault.currentEpoch(), 0);
        vm.warp(startAt + EPOCH);
        assertEq(vault.currentEpoch(), 1);
        vm.warp(startAt + 5 * EPOCH + 123);
        assertEq(vault.currentEpoch(), 5);
    }

    // ------------------------------------------------------------ targets

    function test_RevertZeroTarget() public {
        _warpToEpoch(0);
        vm.prank(an);
        vm.expectRevert(IStreakVault.ZeroAmount.selector);
        vault.setWeeklyTarget(0);
    }

    function test_FirstTargetAppliesNow_ChangesApplyNextEpoch() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        assertEq(vault.targetAt(an, 0), 5 * ONE);

        _setTarget(an, 8 * ONE);
        _setTarget(an, 10 * ONE); // lần cuối trong kỳ quyết định
        assertEq(vault.targetAt(an, 0), 5 * ONE, "current epoch unchanged");
        assertEq(vault.targetAt(an, 1), 10 * ONE, "next epoch uses last change");

        IStreakVault.AccountView memory a = vault.getAccount(an);
        assertEq(a.currentTarget, 5 * ONE);
        assertEq(a.pendingTarget, 10 * ONE);
        assertEq(a.pendingTargetEpoch, 1);
        assertTrue(a.activated);
        assertEq(vault.getTargetCheckpoints(an).length, 2);

        _warpToEpoch(1);
        a = vault.getAccount(an);
        assertEq(a.currentTarget, 10 * ONE);
        assertEq(a.pendingTarget, 0);
    }

    function test_TargetHistoryBinarySearch() public {
        _warpToEpoch(0);
        _setTarget(an, 1 * ONE); // e0 = 1
        _warpToEpoch(2);
        _setTarget(an, 3 * ONE); // e3 = 3
        _warpToEpoch(6);
        _setTarget(an, 7 * ONE); // e7 = 7

        assertEq(vault.targetAt(an, 0), 1 * ONE);
        assertEq(vault.targetAt(an, 2), 1 * ONE);
        assertEq(vault.targetAt(an, 3), 3 * ONE);
        assertEq(vault.targetAt(an, 6), 3 * ONE);
        assertEq(vault.targetAt(an, 7), 7 * ONE);
        assertEq(vault.targetAt(an, 100), 7 * ONE);
        assertEq(vault.targetAt(binh, 3), 0);
    }

    function test_MaxParticipants() public {
        _warpToEpoch(0);
        for (uint256 i; i < 20; ++i) {
            address w = address(uint160(0x1000 + i));
            vm.prank(w);
            vault.setWeeklyTarget(ONE);
        }
        assertEq(vault.participantCount(), 20);

        vm.prank(an);
        vm.expectRevert(IStreakVault.MaxParticipantsReached.selector);
        vault.setWeeklyTarget(ONE);

        // ví đã kích hoạt vẫn đổi mục tiêu được
        vm.prank(address(uint160(0x1000)));
        vault.setWeeklyTarget(2 * ONE);
    }

    // ------------------------------------------------------------ deposit / withdraw

    function test_MultipleDepositsReachTarget() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        _deposit(an, 2 * ONE);
        _deposit(an, 3 * ONE);

        IStreakVault.AccountView memory a = vault.getAccount(an);
        assertEq(a.principal, 5 * ONE);
        assertEq(a.currentDeposited, 5 * ONE);
        assertEq(a.currentProgress, 5 * ONE);
        assertGe(a.currentProgress, a.currentTarget, "target reached");
        assertEq(vault.totalPrincipal(), 5 * ONE);
        assertEq(token.balanceOf(address(vault)), 5 * ONE);
    }

    function test_NetProgress_DepositThenWithdraw() public {
        _warpToEpoch(0);
        _deposit(an, 10 * ONE); // số dư cũ
        _warpToEpoch(1);
        _setTarget(an, 5 * ONE);
        _deposit(an, 5 * ONE);
        _withdraw(an, 1 * ONE); // rút từ số dư cũ vẫn trừ tiến độ

        IStreakVault.EpochStatus memory s = vault.getEpochStatus(an, 1);
        assertEq(s.deposited, 5 * ONE);
        assertEq(s.withdrawn, 1 * ONE);
        assertEq(s.progress, 4 * ONE);

        _warpToEpochEnd(1);
        _finalize(0);
        _finalize(1);
        s = vault.getEpochStatus(an, 1);
        assertTrue(s.settled);
        assertFalse(s.qualified);
    }

    function test_ProgressFloorsAtZero() public {
        _warpToEpoch(0);
        _deposit(an, 10 * ONE);
        _warpToEpoch(1);
        _withdraw(an, 8 * ONE);
        _deposit(an, 2 * ONE);
        assertEq(vault.getEpochStatus(an, 1).progress, 0);
    }

    function test_DirectTransferNotCounted() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        vm.prank(an);
        token.transfer(address(vault), 5 * ONE);
        assertEq(vault.getAccount(an).currentProgress, 0);
        assertEq(vault.getAccount(an).principal, 0);
        assertEq(vault.totalPrincipal(), 0);
    }

    function test_WithdrawPartialAndFull() public {
        _warpToEpoch(0);
        _deposit(an, 5 * ONE);
        uint256 balBefore = token.balanceOf(an);
        _withdraw(an, 2 * ONE);
        assertEq(token.balanceOf(an), balBefore + 2 * ONE);
        _withdraw(an, 3 * ONE);
        assertEq(vault.getAccount(an).principal, 0);
        assertEq(vault.totalPrincipal(), 0);
    }

    function test_RevertWithdrawMoreThanOwnPrincipal() public {
        _warpToEpoch(0);
        _deposit(an, 5 * ONE);
        _deposit(binh, 10 * ONE);

        vm.prank(an);
        vm.expectRevert(abi.encodeWithSelector(IStreakVault.InsufficientPrincipal.selector, 6 * ONE, 5 * ONE));
        vault.withdraw(6 * ONE);

        vm.prank(chi);
        vm.expectRevert(abi.encodeWithSelector(IStreakVault.InsufficientPrincipal.selector, ONE, 0));
        vault.withdraw(ONE);
    }

    function test_WithdrawWhileEpochPendingFinalize() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        _deposit(an, 5 * ONE);
        _warpToEpochEnd(0); // kỳ 0 đã hết hạn nhưng chưa chốt

        _withdraw(an, 5 * ONE); // ghi vào kỳ 1
        assertEq(vault.getEpochStatus(an, 1).withdrawn, 5 * ONE);
        assertEq(vault.getEpochStatus(an, 0).withdrawn, 0);

        _finalize(0);
        IStreakVault.EpochStatus memory s = vault.getEpochStatus(an, 0);
        assertTrue(s.qualified, "epoch 0 kept its result");
        assertEq(s.streakAtSettle, 1);
    }

    function test_EpochBoundary() public {
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        vm.warp(startAt + EPOCH - 1);
        _deposit(an, 2 * ONE); // kỳ 0
        vm.warp(startAt + EPOCH);
        _deposit(an, 3 * ONE); // kỳ 1
        assertEq(vault.getEpochStatus(an, 0).deposited, 2 * ONE);
        assertEq(vault.getEpochStatus(an, 1).deposited, 3 * ONE);
    }

    function test_RevertSettleNotDistributor() public {
        _warpToEpochEnd(0);
        vm.expectRevert(IStreakVault.NotDistributor.selector);
        vault.settleEpoch(0);
    }

    function test_RevertSetDistributorTwice() public {
        vm.prank(deployer);
        vm.expectRevert(IStreakVault.DistributorAlreadySet.selector);
        vault.setDistributor(address(1));

        vm.prank(an);
        vm.expectRevert(IStreakVault.NotInitializer.selector);
        vault.setDistributor(address(1));
    }

    function testFuzz_TotalPrincipalMatchesBalance(uint96[6] memory amounts, bool[6] memory isWithdraw) public {
        _warpToEpoch(0);
        address[3] memory users = [an, binh, chi];
        for (uint256 i; i < amounts.length; ++i) {
            address u = users[i % 3];
            uint256 amt = bound(uint256(amounts[i]), 1, 100 * ONE);
            if (isWithdraw[i]) {
                uint256 p = vault.getAccount(u).principal;
                if (p == 0) continue;
                _withdraw(u, bound(amt, 1, p));
            } else {
                _deposit(u, amt);
            }
        }
        uint256 sum =
            vault.getAccount(an).principal + vault.getAccount(binh).principal + vault.getAccount(chi).principal;
        assertEq(sum, vault.totalPrincipal());
        assertEq(token.balanceOf(address(vault)), vault.totalPrincipal());
    }
}
