// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {StreakVault} from "../src/StreakVault.sol";
import {MockYieldSource} from "../src/MockYieldSource.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";

abstract contract BaseTest is Test {
    uint256 internal constant ONE = 1_000_000; // 1 mUSDC
    uint256 internal constant EPOCH = 7 days;
    uint256 internal constant START_DELAY = 1 hours;

    MockUSDC internal token;
    StreakVault internal vault;
    MockYieldSource internal source;
    YieldDistributor internal distributor;

    address internal deployer = makeAddr("deployer");
    address internal an = makeAddr("an");
    address internal binh = makeAddr("binh");
    address internal chi = makeAddr("chi");

    uint256 internal startAt;

    function setUp() public virtual {
        vm.warp(1_700_000_000);
        startAt = block.timestamp + START_DELAY;

        vm.startPrank(deployer);
        token = new MockUSDC(deployer);
        vault = new StreakVault(token, startAt, EPOCH);
        source = new MockYieldSource(token, vault);
        distributor = new YieldDistributor(token, vault, source);
        vault.setDistributor(address(distributor));
        source.setDistributor(address(distributor));
        vm.stopPrank();

        _fundWallet(an, 1_000 * ONE);
        _fundWallet(binh, 1_000 * ONE);
        _fundWallet(chi, 1_000 * ONE);
    }

    // ------------------------------------------------------------------ helpers

    function _fundWallet(address who, uint256 amount) internal {
        vm.prank(deployer);
        token.mint(who, amount);
        vm.prank(who);
        token.approve(address(vault), type(uint256).max);
    }

    function _warpToEpoch(uint256 epoch) internal {
        vm.warp(startAt + epoch * EPOCH);
    }

    function _warpToEpochEnd(uint256 epoch) internal {
        vm.warp(startAt + (epoch + 1) * EPOCH);
    }

    function _setTarget(address who, uint256 amount) internal {
        vm.prank(who);
        vault.setWeeklyTarget(amount);
    }

    function _deposit(address who, uint256 amount) internal {
        vm.prank(who);
        vault.deposit(amount);
    }

    function _withdraw(address who, uint256 amount) internal {
        vm.prank(who);
        vault.withdraw(amount);
    }

    function _fundEpoch(uint256 epoch, uint256 amount) internal {
        vm.startPrank(deployer);
        token.mint(deployer, amount);
        token.approve(address(source), amount);
        source.fundEpoch(epoch, amount);
        vm.stopPrank();
    }

    function _finalize(uint256 epoch) internal {
        distributor.finalizeEpoch(epoch);
    }

    function _claim(address who) internal returns (uint256) {
        vm.prank(who);
        return distributor.claimYield();
    }

    function _assertSolvency() internal view {
        assertGe(token.balanceOf(address(vault)), vault.totalPrincipal(), "vault insolvent");
        assertGe(
            token.balanceOf(address(distributor)),
            distributor.totalClaimable() + distributor.rollover(),
            "distributor insolvent"
        );
    }
}
