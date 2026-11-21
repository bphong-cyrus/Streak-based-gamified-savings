// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {StreakVault} from "../src/StreakVault.sol";
import {MockYieldSource} from "../src/MockYieldSource.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {DailyCheckIn} from "../src/DailyCheckIn.sol";
import {LuckyWheel} from "../src/LuckyWheel.sol";

/// @notice Test LuckyWheel v3: cấp lượt theo kỳ chốt đạt (chống farm), không thu phí,
///         dừng phục vụ khi quỹ thiếu, điểm trang trí, boundary bảng giải.
contract LuckyWheelTest is Test {
    uint256 internal constant ONE = 1e6;

    MockUSDC internal token;
    StreakVault internal vault;
    MockYieldSource internal source;
    YieldDistributor internal distributor;
    LuckyWheel internal wheel;

    address internal deployer;
    address internal alice;

    function setUp() public {
        deployer = makeAddr("deployer");
        alice = makeAddr("alice");
        vm.startPrank(deployer);
        token = new MockUSDC(deployer);
        vault = new StreakVault(token, block.timestamp, 180); // kỳ 180 giây như Fuji
        source = new MockYieldSource(token, vault);
        distributor = new YieldDistributor(token, vault, source);
        vault.setDistributor(address(distributor));
        source.setDistributor(address(distributor));
        wheel = new LuckyWheel(token, vault, 10);
        token.mint(deployer, 10_000 * ONE);
        token.mint(alice, 100 * ONE);
        token.approve(address(wheel), 500 * ONE);
        wheel.fund(50 * ONE); // quỹ 50 mUSDC
        vm.stopPrank();
    }

    /// @dev Cho alice đặt target + gửi đủ trong kỳ `e`, rồi chốt kỳ đó (sponsor fund + finalize).
    function _qualifyAlice(uint256 e) internal {
        uint256 start = vault.startAt();
        vm.warp(start + e * 180 + 10); // đầu kỳ e
        vm.startPrank(alice);
        vault.setWeeklyTarget(2 * ONE);
        token.approve(address(vault), 10 * ONE);
        vault.deposit(2 * ONE);
        vm.stopPrank();

        vm.startPrank(deployer);
        token.approve(address(source), 1 * ONE);
        source.fundEpoch(e, 1 * ONE);
        vm.stopPrank();

        vm.warp(start + (e + 1) * 180 + 1); // hết kỳ
        distributor.finalizeEpoch(e);
    }

    // ------------------------------------------------------------------
    // Cấp lượt theo kỳ đạt
    // ------------------------------------------------------------------

    function test_ClaimEpochAfterSettledQualified() public {
        _qualifyAlice(0);
        vm.prank(alice);
        wheel.claimEpoch(0);
        assertEq(wheel.freeSpins(alice), 1);

        // Trùng kỳ → từ chối.
        vm.expectRevert(abi.encodeWithSelector(LuckyWheel.EpochAlreadyGranted.selector, alice, 0));
        vm.prank(alice);
        wheel.claimEpoch(0);
    }

    function test_ClaimRevertsBeforeSettledOrWhenMissed() public {
        // Kỳ 0 chưa chốt → chưa được cấp.
        uint256 start = vault.startAt();
        vm.warp(start + 10);
        vm.startPrank(alice);
        vault.setWeeklyTarget(2 * ONE);
        token.approve(address(vault), 10 * ONE);
        vault.deposit(2 * ONE);
        vm.expectRevert(abi.encodeWithSelector(LuckyWheel.EpochNotQualified.selector, alice, 0));
        wheel.claimEpoch(0);
        vm.stopPrank();

        // Kỳ 1: alice gửi rồi RÚT HẾT trong kỳ → không đạt → không có lượt (chống farm).
        vm.warp(start + 180 + 10);
        vm.startPrank(alice);
        vault.deposit(2 * ONE);
        vault.withdraw(2 * ONE);
        vm.stopPrank();
        vm.startPrank(deployer);
        token.approve(address(source), 1 * ONE);
        source.fundEpoch(1, 1 * ONE);
        vm.stopPrank();
        vm.warp(start + 1 * 180 + 1);
        distributor.finalizeEpoch(0); // chốt tuần tự — kỳ 0 trước
        vm.warp(start + 2 * 180 + 1);
        distributor.finalizeEpoch(1);
        vm.expectRevert(abi.encodeWithSelector(LuckyWheel.EpochNotQualified.selector, alice, 1));
        vm.prank(alice);
        wheel.claimEpoch(1);
    }

    function test_TwoQualifiedEpochsTwoGrants() public {
        _qualifyAlice(0);
        _qualifyAlice(1);
        vm.startPrank(alice);
        wheel.claimEpoch(0);
        wheel.claimEpoch(1);
        assertEq(wheel.freeSpins(alice), 2);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Spin miễn phí + quỹ
    // ------------------------------------------------------------------

    function test_SpinIsFreeAndConsumesGrant() public {
        _qualifyAlice(0);
        vm.startPrank(alice);
        wheel.claimEpoch(0);
        uint256 balBefore = token.balanceOf(alice);
        wheel.spin();
        assertEq(wheel.freeSpins(alice), 0);
        assertGe(token.balanceOf(alice), balBefore); // không tốn phí; trúng thì tăng
        vm.stopPrank();
    }

    function test_SpinWithoutGrantReverts() public {
        vm.prank(alice);
        vm.expectRevert(LuckyWheel.NoFreeSpin.selector);
        wheel.spin();
    }

    function test_WheelExhaustedWhenPoolBelowMaxPrize() public {
        // Wheel quỹ thiếu ngay từ đầu (5 < giải lớn nhất 10): cấp lượt vẫn được nhưng spin từ chối.
        vm.startPrank(deployer);
        LuckyWheel wheelLow = new LuckyWheel(token, vault, 10);
        token.approve(address(wheelLow), 10 * ONE);
        wheelLow.fund(5 * ONE);
        vm.stopPrank();

        _qualifyAlice(0);
        vm.startPrank(alice);
        wheelLow.claimEpoch(0);
        assertFalse(wheelLow.canServe());
        vm.expectRevert(LuckyWheel.WheelExhausted.selector);
        wheelLow.spin();
        vm.stopPrank();
    }

    function test_CanServeReflectsPool() public view {
        assertTrue(wheel.canServe()); // pool 50 >= maxPrize 10
    }

    function test_PrizeBoundaryMapping() public view {
        // totalWeight = 100: 0(50) 1(35) 2(12) 5(2) 10(1)
        (uint256 i0,,,) = wheel.previewPrize(0);
        (uint256 i49,,,) = wheel.previewPrize(49);
        (uint256 i50,,,) = wheel.previewPrize(50);
        (uint256 i84,,,) = wheel.previewPrize(84);
        (uint256 i85,,,) = wheel.previewPrize(85);
        (uint256 i96,,,) = wheel.previewPrize(96);
        (uint256 i98,,,) = wheel.previewPrize(98);
        (uint256 i99,,,) = wheel.previewPrize(99);
        assertEq(i0, 0);
        assertEq(i49, 0);
        assertEq(i50, 1);
        assertEq(i84, 1);
        assertEq(i85, 2);
        assertEq(i96, 2);
        assertEq(i98, 3);
        assertEq(i99, 4);
        // Giải 0 kèm 10 điểm trang trí.
        (, uint256 amt0, uint256 decor0,) = wheel.previewPrize(10);
        assertEq(amt0, 0);
        assertEq(decor0, 10);
        // EV = 0,79 mUSDC/lượt theo bảng.
        uint256 ev = (0 * 50 + 1 * 35 + 2 * 12 + 5 * 2 + 10 * 1); // 79
        assertEq(ev, 79);
    }

    function test_CooldownBetweenSpins() public {
        _qualifyAlice(0);
        _qualifyAlice(1);
        vm.startPrank(alice);
        wheel.claimEpoch(0);
        wheel.claimEpoch(1);
        wheel.spin();
        vm.expectRevert(abi.encodeWithSelector(LuckyWheel.CooldownActive.selector, block.timestamp + 10));
        wheel.spin(); // cooldown 10s chưa hết
        vm.warp(block.timestamp + 11);
        wheel.spin(); // hết cooldown, quay lượt thứ hai
        assertEq(wheel.freeSpins(alice), 0);
        vm.stopPrank();
    }
}
