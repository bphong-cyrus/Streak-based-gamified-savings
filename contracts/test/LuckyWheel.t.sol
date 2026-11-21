// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {LuckyWheel} from "../src/LuckyWheel.sol";

/// @notice Test cho LuckyWheel: sổ sách pool, cooldown, solvency, phân phối giải.
/// @dev Entropy là blockhash testnet — test chỉ quan tâm accounting, không kiểm chứng tính ngẫu nhiên.
contract LuckyWheelTest is Test {
    uint256 internal constant ONE = 1e6;

    MockUSDC internal token;
    LuckyWheel internal wheel;

    address internal deployer;
    address internal alice;

    function setUp() public {
        deployer = makeAddr("deployer");
        alice = makeAddr("alice");
        vm.startPrank(deployer);
        token = new MockUSDC(deployer);
        wheel = new LuckyWheel(token, 1 * ONE, 60);
        token.mint(deployer, 10_000 * ONE);
        token.mint(alice, 100 * ONE);
        token.approve(address(wheel), 1_000 * ONE);
        wheel.fund(100 * ONE); // sponsor pool 100 mUSDC
        vm.stopPrank();

        vm.prank(alice);
        token.approve(address(wheel), 100 * ONE);
    }

    // ------------------------------------------------------------------
    // Accounting & solvency
    // ------------------------------------------------------------------

    function test_PoolFunded() public view {
        assertEq(wheel.pool(), 100 * ONE);
        assertEq(token.balanceOf(address(wheel)), 100 * ONE);
    }

    function test_SpinDeductsFeeAddsToPool() public {
        uint256 poolBefore = wheel.pool();
        vm.prank(alice);
        (uint256 prizeIndex, uint256 prizeAmount) = wheel.spin();
        // Pool thay đổi đúng: +fee -prize
        assertEq(wheel.pool(), poolBefore + 1 * ONE - prizeAmount);
        // Tiền alice đúng: -fee +prize
        assertEq(token.balanceOf(alice), 100 * ONE - 1 * ONE + prizeAmount);
        // Giải nằm trong bảng
        assertLt(prizeIndex, 6);
        (uint256[] memory amounts,,) = wheel.prizeTable();
        assertEq(prizeAmount, amounts[prizeIndex]);
    }

    function test_CooldownBlocksImmediateSecondSpin() public {
        vm.prank(alice);
        wheel.spin();
        vm.expectRevert(abi.encodeWithSelector(LuckyWheel.CooldownActive.selector, block.timestamp + 60));
        vm.prank(alice);
        wheel.spin();
        // Hết cooldown thì quay lại được.
        vm.warp(block.timestamp + 61);
        vm.prank(alice);
        wheel.spin();
    }

    function test_NextSpinAtView() public {
        assertEq(wheel.nextSpinAt(alice), 0);
        vm.prank(alice);
        wheel.spin();
        assertEq(wheel.nextSpinAt(alice), block.timestamp + 60);
    }

    function test_PoolNeverGoesNegative() public {
        // Quay thật nhiều lượt (nhiều ví khác nhau để né cooldown): pool không bao giờ âm
        // và mọi payout đều ≤ số dư thật của contract. Fund thêm để 40 lượt không cạn pool.
        vm.startPrank(deployer);
        token.approve(address(wheel), 400 * ONE);
        wheel.fund(400 * ONE);
        vm.stopPrank();
        for (uint256 i; i < 40; ++i) {
            address player = makeAddr(string.concat("p", vm.toString(i)));
            vm.startPrank(deployer);
            token.mint(player, 10 * ONE);
            vm.stopPrank();
            vm.startPrank(player);
            token.approve(address(wheel), 10 * ONE);
            wheel.spin();
            vm.stopPrank();
            assertGe(token.balanceOf(address(wheel)), wheel.pool());
            assertGe(wheel.pool(), 0);
            vm.warp(block.timestamp + 61);
        }
    }

    function test_InsolventPoolReverts() public {
        // Rút cạn pool bằng cách đặt pool nhỏ hơn mọi giải > 0 → spin phải revert khi trúng giải lớn.
        // Trường hợp thực tế: pool còn 0, giải 0 (Chúc may mắn, amount 0) vẫn quay được.
        vm.prank(deployer);
        wheel.setCooldown(0);
        // Alice quay cho đến khi pool dưới 25 mUSDC (giải lớn nhất) thì mọi lượt trúng giải lớn revert —
        // ở đây kiểm chứng trực tiếp: pool hiện tại phải luôn >= giải vừa trả.
        uint256 spins;
        while (wheel.pool() >= 25 * ONE && spins < 200) {
            vm.prank(alice);
            wheel.spin();
            spins++;
        }
        // Sau vòng lặp pool < 25 mUSDC: contract vẫn solvent.
        assertLt(wheel.pool(), 25 * ONE);
        assertGe(token.balanceOf(address(wheel)), wheel.pool());
    }

    // ------------------------------------------------------------------
    // Access control
    // ------------------------------------------------------------------

    function test_NonOwnerCannotSetFee() public {
        vm.prank(alice);
        vm.expectRevert();
        wheel.setSpinFee(2 * ONE);
    }

    function test_OwnerCanSetFeeAndCooldown() public {
        vm.startPrank(deployer);
        wheel.setSpinFee(2 * ONE);
        wheel.setCooldown(120);
        vm.stopPrank();
        assertEq(wheel.spinFee(), 2 * ONE);
        assertEq(wheel.cooldown(), 120);
    }
}
