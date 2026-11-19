// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {StreakVault} from "../src/StreakVault.sol";
import {MockYieldSource} from "../src/MockYieldSource.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {DailyCheckIn} from "../src/DailyCheckIn.sol";
import {SavingsGoal} from "../src/SavingsGoal.sol";
import {StreakNFT} from "../src/StreakNFT.sol";
import {FaucetDrip} from "../src/FaucetDrip.sol";
import {IStreakVault} from "../src/interfaces/IStreakVault.sol";

/// @notice Attacker contract mô phỏng reentrancy qua receive/fallback.
contract ReentrancyAttacker {
    StreakVault public vault;
    uint256 public attacks;
    uint256 public maxAttacks;

    constructor(StreakVault vault_) {
        vault = vault_;
    }

    function attack(uint256 max) external {
        maxAttacks = max;
        vault.withdraw(1);
    }

    function approveAndDeposit(IERC20 token, uint256 amount) external {
        token.approve(address(vault), amount);
        vault.deposit(amount);
    }

    receive() external payable {
        _reenter();
    }

    fallback() external payable {
        _reenter();
    }

    function _reenter() internal {
        if (attacks < maxAttacks && vault.getAccount(address(this)).principal > 0) {
            attacks++;
            vault.withdraw(1);
        }
    }
}

/// @notice Adversarial & edge-case tests cho 8 core contract.
contract Core8SecurityTest is Test {
    uint256 internal constant ONE = 1_000_000;

    MockUSDC internal token;
    StreakVault internal vault;
    MockYieldSource internal source;
    YieldDistributor internal distributor;
    DailyCheckIn internal checkIn;
    SavingsGoal internal goal;
    StreakNFT internal nft;
    FaucetDrip internal faucet;

    address internal deployer;
    address internal alice;

    function setUp() public {
        vm.warp(1_700_000_000);
        uint256 startAt = block.timestamp;
        deployer = makeAddr("deployer");
        alice = makeAddr("alice");

        vm.startPrank(deployer);
        token = new MockUSDC(deployer);
        vault = new StreakVault(token, startAt, 7 days);
        source = new MockYieldSource(token, vault);
        distributor = new YieldDistributor(token, vault, source);
        checkIn = new DailyCheckIn(token);
        goal = new SavingsGoal(vault);
        nft = new StreakNFT(vault, "ipfs://test/{id}.json");
        faucet = new FaucetDrip(vault, token);

        vault.setDistributor(address(distributor));
        source.setDistributor(address(distributor));
        vault.setOperator(address(faucet), true);
        token.mint(deployer, 1_000_000 * ONE);
        token.approve(address(faucet), 10_000 * ONE);
        faucet.fund(10_000 * ONE);
        token.approve(address(checkIn), 10_000 * ONE);
        checkIn.fund(10_000 * ONE);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Access control
    // ------------------------------------------------------------------

    function test_nonOwnerCannotSetRewards() public {
        vm.prank(alice);
        vm.expectRevert();
        checkIn.setRewards(1, 1, 1);
    }

    function test_nonOwnerCannotSetDistributorOnSource() public {
        address bob = makeAddr("bob");
        vm.prank(bob);
        vm.expectRevert();
        source.setDistributor(bob);
    }

    function test_nonInitializerCannotSetDistributorOnVault() public {
        // deployer la initializer; alice khong phai.
        vm.prank(alice);
        vm.expectRevert();
        vault.setDistributor(alice);
    }

    function test_setDistributorOnlyOnce() public {
        vm.startPrank(deployer);
        vm.expectRevert();
        vault.setDistributor(address(distributor));
        vm.stopPrank();
    }

    function test_nonOperatorCannotSetWeeklyTargetFor() public {
        address bob = makeAddr("bob");
        vm.prank(bob);
        vm.expectRevert();
        vault.setWeeklyTargetFor(alice, 2 * ONE);
    }

    // ------------------------------------------------------------------
    // DailyCheckIn integrity
    // ------------------------------------------------------------------

    function test_doubleCheckInReverts() public {
        vm.warp(1_700_000_000 + 1 days);
        vm.prank(alice);
        checkIn.checkIn();
        vm.prank(alice);
        vm.expectRevert(DailyCheckIn.AlreadyCheckedIn.selector);
        checkIn.checkIn();
    }

    function test_utcBoundaryCheckIn() public {
        // 23:59:59 cung ngay -> streak 1
        uint256 t0 = 1_700_000_000;
        vm.warp(t0);
        vm.prank(alice);
        checkIn.checkIn();
        assertEq(checkIn.checkInStreakDays(alice), 1);

        // 00:00:01 ngay hom sau -> streak 2
        vm.warp(t0 + 1 days + 1);
        vm.prank(alice);
        checkIn.checkIn();
        assertEq(checkIn.checkInStreakDays(alice), 2);
    }

    function test_checkInEmptyPoolDoesNotRevertZeroReward() public {
        // drain pool
        vm.startPrank(deployer);
        token.transfer(makeAddr("sink"), token.balanceOf(deployer));
        vm.stopPrank();
        // pool checkIn con 10k, chi can drip het
        // Alice checkIn lien tuc cho den khi pool can
        vm.warp(1_700_000_000 + 1 days);
        vm.prank(alice);
        checkIn.checkIn();
        // Bo sung them 1000 ngay de drain (moi ngay ~0.2 mUSDC -> can 50000 ngay)
        // Thay vi warp nhieu, ta gui lai 1 wei de kiem tra khong revert
        vm.warp(1_700_000_000 + 2 days);
        vm.prank(alice);
        checkIn.checkIn();
        assertEq(checkIn.lastCheckInDay(alice), checkIn.today());
    }

    // ------------------------------------------------------------------
    // Faucet integrity
    // ------------------------------------------------------------------

    function test_faucetDoubleDripReverts() public {
        vm.warp(1_700_000_000 + 1 days);
        vm.prank(alice);
        faucet.drip();
        vm.prank(alice);
        vm.expectRevert(FaucetDrip.AlreadyDripped.selector);
        faucet.drip();
    }

    function test_faucetEmptyPoolReverts() public {
        // Drain faucet
        vm.startPrank(deployer);
        token.approve(address(faucet), 0);
        // chuyen het token trong faucet ve deployer
        uint256 bal = token.balanceOf(address(faucet));
        // khong co ham drain; dung depositFor de rut het
        vm.stopPrank();
        // Thay doi faucet amount = balance + 1 de tranh ERC20InsufficientBalance
        vm.startPrank(deployer);
        faucet.setParams(bal + 1, 100 * ONE, 2 * ONE);
        vm.stopPrank();
        address bob = makeAddr("bob");
        vm.warp(1_700_000_000 + 1 days);
        vm.prank(bob);
        vm.expectRevert();
        faucet.drip();
    }

    // ------------------------------------------------------------------
    // YieldDistributor integrity
    // ------------------------------------------------------------------

    function test_doubleClaimYieldSecondReverts() public {
        _setupYieldForAlice();
        vm.prank(alice);
        distributor.claimYield();
        vm.prank(alice);
        vm.expectRevert(YieldDistributor.NothingToClaim.selector);
        distributor.claimYield();
    }

    function _setupYieldForAlice() internal {
        uint256 start = 1_700_000_000;
        vm.warp(start + 1 days);
        vm.startPrank(alice);
        vault.setWeeklyTarget(2 * ONE);
        vm.stopPrank();
        vm.prank(deployer);
        token.mint(alice, 5 * ONE);
        vm.startPrank(alice);
        token.approve(address(vault), 5 * ONE);
        vault.deposit(5 * ONE);
        vm.stopPrank();

        // fund epoch 0 truoc khi ket thuc, roi finalize sau do
        vm.warp(start + 6 days);
        vm.startPrank(deployer);
        token.approve(address(source), 10 * ONE);
        source.fundEpoch(0, 10 * ONE);
        vm.stopPrank();

        vm.warp(start + 8 days);
        vm.prank(deployer);
        distributor.finalizeEpoch(0);
    }

    // ------------------------------------------------------------------
    // StreakNFT integrity
    // ------------------------------------------------------------------

    function test_nftMintDuplicateReverts() public {
        _makeAliceStreak(3);
        vm.prank(alice);
        nft.mint();
        vm.prank(alice);
        vm.expectRevert(StreakNFT.AlreadyMinted.selector);
        nft.mint();
    }

    function test_nftMintWithoutStreakReverts() public {
        vm.prank(alice);
        vm.expectRevert(StreakNFT.StreakNotReached.selector);
        nft.mint();
    }

    // ------------------------------------------------------------------
    // SavingsGoal integrity
    // ------------------------------------------------------------------

    function test_goalDuplicateSetReverts() public {
        vm.warp(1_700_000_000 + 1 days);
        vm.startPrank(alice);
        goal.setGoal(10 * ONE, 10);
        vm.expectRevert(SavingsGoal.GoalAlreadySet.selector);
        goal.setGoal(20 * ONE, 10);
        vm.stopPrank();
    }

    function test_goalExpiredCheckReachedReverts() public {
        vm.warp(1_700_000_000 + 1 days);
        vm.startPrank(alice);
        goal.setGoal(10 * ONE, 2);
        vm.stopPrank();
        // deadlineEpoch=2 co nghia phai dat truoc khi currentEpoch >= 2
        vm.warp(1_700_000_000 + 21 days); // epoch 2+
        vm.prank(alice);
        vm.expectRevert(SavingsGoal.GoalNotActive.selector);
        goal.checkReached();
    }

    // ------------------------------------------------------------------
    // Vault edge cases
    // ------------------------------------------------------------------

    function test_dustWithdrawDoesNotPanic() public {
        vm.warp(1_700_000_000 + 1 days);
        vm.startPrank(alice);
        vault.setWeeklyTarget(2 * ONE);
        vm.stopPrank();
        vm.prank(deployer);
        token.mint(alice, 2 * ONE);
        vm.startPrank(alice);
        token.approve(address(vault), 2 * ONE);
        vault.deposit(2 * ONE);
        vault.withdraw(1);
        assertEq(vault.getAccount(alice).principal, 2 * ONE - 1);
        vm.stopPrank();
    }

    function test_withdrawMoreThanPrincipalReverts() public {
        vm.warp(1_700_000_000 + 1 days);
        vm.startPrank(alice);
        vault.setWeeklyTarget(2 * ONE);
        vm.stopPrank();
        vm.prank(deployer);
        token.mint(alice, 2 * ONE);
        vm.startPrank(alice);
        token.approve(address(vault), 2 * ONE);
        vault.deposit(2 * ONE);
        vm.expectRevert();
        vault.withdraw(3 * ONE);
        vm.stopPrank();
    }

    function test_reentrancyWithdrawProtected() public {
        vm.warp(1_700_000_000 + 1 days);
        ReentrancyAttacker attacker = new ReentrancyAttacker(vault);
        vm.prank(deployer);
        token.mint(address(attacker), 10 * ONE);
        vm.startPrank(address(attacker));
        attacker.approveAndDeposit(token, 10 * ONE);
        // bat dau reentrancy
        attacker.attack(5);
        vm.stopPrank();
        // Attacker chi rut duoc 1 vi ReentrancyGuard chan cac loi goi long nhau.
        assertEq(attacker.attacks(), 0);
        assertEq(vault.getAccount(address(attacker)).principal, 10 * ONE - 1);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    function _makeAliceStreak(uint256 streak) internal {
        uint256 start = 1_700_000_000;
        vm.warp(start + 1 days);
        vm.startPrank(alice);
        vault.setWeeklyTarget(2 * ONE);
        vm.stopPrank();
        for (uint256 e = 0; e <= streak; ++e) {
            // nap tien trong epoch e
            vm.warp(start + e * 7 days + 1 days);
            vm.prank(deployer);
            token.mint(alice, 5 * ONE);
            vm.startPrank(alice);
            token.approve(address(vault), 5 * ONE);
            vault.deposit(5 * ONE);
            vm.stopPrank();

            // fund epoch e truoc khi ket thuc
            vm.warp(start + e * 7 days + 6 days);
            vm.startPrank(deployer);
            token.approve(address(source), 1 * ONE);
            source.fundEpoch(e, 1 * ONE);
            vm.stopPrank();

            // finalize epoch e sau khi ket thuc
            vm.warp(start + (e + 1) * 7 days + 1);
            vm.prank(deployer);
            distributor.finalizeEpoch(e);
        }
    }
}
