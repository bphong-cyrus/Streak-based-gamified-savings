// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./BaseTest.sol";

/// @notice Kịch bản demo trong README mục 6 (An, Bình, Chi).
contract DemoScenarioTest is BaseTest {
    function test_DemoScenario() public {
        _fundEpoch(0, 2 * ONE);
        _fundEpoch(1, 3 * ONE);

        // ---- Kỳ 0: An, Bình đặt mục tiêu 5, mỗi người gửi 5. Chi chưa tham gia.
        _warpToEpoch(0);
        _setTarget(an, 5 * ONE);
        _setTarget(binh, 5 * ONE);
        _deposit(an, 5 * ONE);
        _deposit(binh, 5 * ONE);

        // ---- Kỳ 1: An gửi 5. Bình bỏ kỳ. Chi đặt mục tiêu 5 và gửi 5.
        _warpToEpoch(1);
        _finalize(0);
        assertEq(vault.getAccount(an).streak, 1);
        assertEq(vault.getAccount(binh).streak, 1);
        assertEq(vault.getAccount(chi).streak, 0);
        assertEq(distributor.rewardOf(an, 0), 1 * ONE);
        assertEq(distributor.rewardOf(binh, 0), 1 * ONE);
        assertEq(distributor.rewardOf(chi, 0), 0);

        _deposit(an, 5 * ONE);
        _setTarget(chi, 5 * ONE);
        _deposit(chi, 5 * ONE);

        _warpToEpochEnd(1);
        _finalize(1);
        assertEq(vault.getAccount(an).streak, 2);
        assertEq(vault.getAccount(binh).streak, 0);
        assertEq(vault.getAccount(chi).streak, 1);
        assertEq(distributor.rewardOf(an, 1), 2 * ONE);
        assertEq(distributor.rewardOf(binh, 1), 0);
        assertEq(distributor.rewardOf(chi, 1), 1 * ONE);

        // ---- Sau kỳ 1: Bình rút 5 gốc và claim 1; An claim 3.
        uint256 binhBefore = token.balanceOf(binh);
        _withdraw(binh, 5 * ONE);
        assertEq(_claim(binh), 1 * ONE);
        assertEq(token.balanceOf(binh), binhBefore + 6 * ONE);

        uint256 anBefore = token.balanceOf(an);
        assertEq(_claim(an), 3 * ONE);
        assertEq(token.balanceOf(an), anBefore + 3 * ONE);
        assertEq(distributor.claimedYield(an), 3 * ONE);

        assertEq(distributor.claimableYield(chi), 1 * ONE);
        assertEq(vault.totalPrincipal(), 15 * ONE);
        _assertSolvency();
    }
}
