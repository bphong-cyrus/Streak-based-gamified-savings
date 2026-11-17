// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BaseTest} from "./BaseTest.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {StreakVault} from "../src/StreakVault.sol";
import {MockYieldSource} from "../src/MockYieldSource.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";

contract Handler is Test {
    uint256 internal constant ONE = 1_000_000;

    MockUSDC public token;
    StreakVault public vault;
    MockYieldSource public source;
    YieldDistributor public distributor;
    address public funder;
    address[] public actors;

    constructor(MockUSDC t, StreakVault v, MockYieldSource s, YieldDistributor d, address f, address[] memory a) {
        token = t;
        vault = v;
        source = s;
        distributor = d;
        funder = f;
        actors = a;
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function setTarget(uint256 seed, uint256 amount) external {
        amount = bound(amount, 1, 20 * ONE);
        vm.prank(_actor(seed));
        vault.setWeeklyTarget(amount);
    }

    function deposit(uint256 seed, uint256 amount) external {
        amount = bound(amount, 1, 20 * ONE);
        vm.prank(_actor(seed));
        vault.deposit(amount);
    }

    function withdraw(uint256 seed, uint256 amount) external {
        address a = _actor(seed);
        uint256 p = vault.getAccount(a).principal;
        if (p == 0) return;
        amount = bound(amount, 1, p);
        vm.prank(a);
        vault.withdraw(amount);
    }

    function fund(uint256 amount) external {
        amount = bound(amount, 1, 10 * ONE);
        uint256 e = vault.currentEpoch();
        vm.startPrank(funder);
        token.mint(funder, amount);
        token.approve(address(source), amount);
        source.fundEpoch(e, amount);
        vm.stopPrank();
    }

    function warp(uint256 secs) external {
        secs = bound(secs, 1, 3 days);
        vm.warp(block.timestamp + secs);
    }

    function finalize() external {
        if (!distributor.canFinalize()) return;
        distributor.finalizeEpoch(distributor.nextEpochToFinalize());
    }

    function claim(uint256 seed) external {
        address a = _actor(seed);
        if (distributor.claimableYield(a) == 0) return;
        vm.prank(a);
        distributor.claimYield();
    }
}

contract InvariantTest is BaseTest {
    Handler internal handler;

    function setUp() public override {
        super.setUp();
        _warpToEpoch(0);
        address[] memory actors = new address[](3);
        actors[0] = an;
        actors[1] = binh;
        actors[2] = chi;

        vm.startPrank(deployer);
        handler = new Handler(token, vault, source, distributor, deployer, actors);
        token.grantRole(token.MINTER_ROLE(), address(handler));
        vm.stopPrank();
        // Handler dùng prank deployer cho fund; deployer đã có MINTER_ROLE.

        targetContract(address(handler));
    }

    function invariant_VaultSolvent() public view {
        assertGe(token.balanceOf(address(vault)), vault.totalPrincipal());
    }

    function invariant_DistributorSolvent() public view {
        assertGe(token.balanceOf(address(distributor)), distributor.totalClaimable() + distributor.rollover());
    }

    function invariant_PrincipalSum() public view {
        uint256 sum =
            vault.getAccount(an).principal + vault.getAccount(binh).principal + vault.getAccount(chi).principal;
        assertEq(sum, vault.totalPrincipal());
    }
}
