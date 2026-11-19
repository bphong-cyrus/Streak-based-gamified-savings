// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, StdUtils} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {StreakVault} from "../src/StreakVault.sol";
import {MockYieldSource} from "../src/MockYieldSource.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {DailyCheckIn} from "../src/DailyCheckIn.sol";
import {SavingsGoal} from "../src/SavingsGoal.sol";
import {StreakNFT} from "../src/StreakNFT.sol";
import {FaucetDrip} from "../src/FaucetDrip.sol";
import {IStreakVault} from "../src/interfaces/IStreakVault.sol";

/// @notice Handler stateful: mo phong Alice/Bob/Charlie dung toan bo 8 core contract ngau nhien,
///         dong thoi tracking moi dong tien de chung minh bat bien he thong.
///         Khong ke thua Test de tranh xung dot voi forge invariant runner.
contract Core8Handler is StdUtils {
    Vm private constant VM = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    uint256 internal constant ONE = 1_000_000;
    uint256 internal constant EPOCH = 7 days;
    uint256 internal constant DAY = 86_400;

    MockUSDC internal token;
    StreakVault internal vault;
    MockYieldSource internal source;
    YieldDistributor internal distributor;
    DailyCheckIn internal checkIn;
    SavingsGoal internal goal;
    StreakNFT internal nft;
    FaucetDrip internal faucet;

    address public deployer;
    address[] public actors;
    uint256 public startAt;

    // tracking moi dong tien
    uint256 public nextFinalize;
    uint256 public fundedYield;
    uint256 public claimedYield;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    mapping(address => bool) public dripped;
    mapping(address => uint256) public principalOf;
    mapping(address => uint256) public goalDeadlineOf;
    mapping(address => bool) public hasGoal;
    mapping(address => uint256) public firstCheckInDay;
    mapping(address => bool) public hasCheckedInOnce;

    constructor(
        MockUSDC token_,
        StreakVault vault_,
        MockYieldSource source_,
        YieldDistributor distributor_,
        DailyCheckIn checkIn_,
        SavingsGoal goal_,
        StreakNFT nft_,
        FaucetDrip faucet_,
        address deployer_,
        uint256 startAt_
    ) {
        token = token_;
        vault = vault_;
        source = source_;
        distributor = distributor_;
        checkIn = checkIn_;
        goal = goal_;
        nft = nft_;
        faucet = faucet_;
        deployer = deployer_;
        startAt = startAt_;

        actors.push(address(uint160(uint256(keccak256("alice")))));
        actors.push(address(uint160(uint256(keccak256("bob")))));
        actors.push(address(uint160(uint256(keccak256("charlie")))));
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function warpTime(uint256 daysRaw) public {
        daysRaw = bound(daysRaw, 1, 3);
        VM.warp(block.timestamp + daysRaw * DAY);
    }

    function drip(uint256 seed) public {
        address a = _actor(seed);
        if (dripped[a]) return;
        dripped[a] = true;
        VM.prank(a);
        faucet.drip(); // 5 mUSDC vao thang vault + target 2
        principalOf[a] += 5 * ONE;
    }

    function deposit(uint256 seed, uint256 amount) public {
        address a = _actor(seed);
        amount = bound(amount, ONE / 10, 5 * ONE);
        IStreakVault.AccountView memory acc = vault.getAccount(a);
        if (acc.currentTarget == 0) {
            VM.prank(a);
            vault.setWeeklyTarget(2 * ONE);
        }
        VM.prank(deployer);
        token.mint(a, amount);
        VM.prank(a);
        token.approve(address(vault), amount);
        VM.prank(a);
        vault.deposit(amount);
        principalOf[a] += amount;
        totalDeposited += amount;
    }

    function withdraw(uint256 seed, uint256 amount) public {
        address a = _actor(seed);
        uint256 p = vault.getAccount(a).principal;
        if (p == 0) return;
        amount = bound(amount, 1, p);
        VM.prank(a);
        vault.withdraw(amount);
        principalOf[a] -= amount;
        totalWithdrawn += amount;
    }

    /// @notice Rut dust (1 wei) — khong duoc panic hay khoa quy.
    function withdrawDust(uint256 seed) public {
        address a = _actor(seed);
        uint256 p = vault.getAccount(a).principal;
        if (p == 0) return;
        VM.prank(a);
        vault.withdraw(1);
        principalOf[a] -= 1;
        totalWithdrawn += 1;
    }

    function checkInAction(uint256 seed) public {
        address a = _actor(seed);
        uint256 day = block.timestamp / DAY;
        if (checkIn.lastCheckInDay(a) == day) return;
        VM.prank(a);
        checkIn.checkIn();
        if (!hasCheckedInOnce[a]) {
            hasCheckedInOnce[a] = true;
            firstCheckInDay[a] = day;
        }
    }

    function setGoalAction(uint256 seed, uint256 amount) public {
        address a = _actor(seed);
        if (hasGoal[a]) return;
        amount = bound(amount, ONE, 50 * ONE);
        uint256 dl = vault.currentEpoch() + 4;
        VM.prank(a);
        goal.setGoal(amount, dl);
        hasGoal[a] = true;
        goalDeadlineOf[a] = dl;
    }

    function checkReachedAction(uint256 seed) public {
        address a = _actor(seed);
        if (!hasGoal[a]) return;
        (uint256 target, uint256 dl, uint256 progress, bool reached, bool active) = goal.statusOf(a);
        if (!active || reached || progress < target || vault.currentEpoch() >= dl) return;
        VM.prank(a);
        goal.checkReached();
    }

    function mintNFTAction(uint256 seed) public {
        address a = _actor(seed);
        uint256 tier = nft.eligibleTier(a);
        if (tier == 0 || nft.balanceOf(a, tier) > 0) return;
        VM.prank(a);
        nft.mint();
    }

    function fundEpochAction(uint256 amount) public {
        amount = bound(amount, ONE / 10, 5 * ONE);
        VM.prank(deployer);
        token.mint(deployer, amount);
        VM.prank(deployer);
        token.approve(address(source), amount);
        VM.prank(deployer);
        source.fundEpoch(nextFinalize, amount);
        fundedYield += amount;
    }

    function finalizeAction() public {
        if (vault.currentEpoch() <= nextFinalize) return;
        VM.prank(deployer);
        distributor.finalizeEpoch(nextFinalize);
        nextFinalize++;
    }

    function claimAction(uint256 seed) public {
        address a = _actor(seed);
        uint256 beforeBal = token.balanceOf(a);
        VM.prank(a);
        uint256 got = distributor.claimYield();
        uint256 afterBal = token.balanceOf(a);
        require(got == afterBal - beforeBal, "claimYield returns credited amount");
        claimedYield += got;
    }

    // ---- helper cho invariant ----
    function sumPrincipals() public view returns (uint256 s) {
        for (uint256 i; i < actors.length; ++i) s += principalOf[actors[i]];
    }
}

/// @notice Invariant suite cho 8 core contract. runs=256, depth=50 (cau hinh trong foundry.toml).
contract Core8InvariantTest is Test {
    Core8Handler internal h;
    MockUSDC internal token;
    StreakVault internal vault;
    DailyCheckIn internal checkIn;
    StreakNFT internal nft;

    function setUp() public {
        vm.warp(1_700_000_000);
        uint256 startAt = block.timestamp;
        address deployer = makeAddr("deployer");

        // Deploy core contracts tu deployer de StreakVault.initializer = deployer.
        vm.startPrank(deployer);
        token = new MockUSDC(deployer);
        vault = new StreakVault(token, startAt, 7 days);
        MockYieldSource source = new MockYieldSource(token, vault);
        YieldDistributor distributor = new YieldDistributor(token, vault, source);
        checkIn = new DailyCheckIn(token);
        SavingsGoal goal = new SavingsGoal(vault);
        nft = new StreakNFT(vault, "ipfs://test/{id}.json");
        FaucetDrip faucet = new FaucetDrip(vault, token);

        vault.setDistributor(address(distributor));
        source.setDistributor(address(distributor));
        vault.setOperator(address(faucet), true);
        token.mint(deployer, 1_000_000 * 1_000_000);
        token.approve(address(faucet), 10_000 * 1_000_000);
        faucet.fund(10_000 * 1_000_000);
        token.approve(address(checkIn), 10_000 * 1_000_000);
        checkIn.fund(10_000 * 1_000_000);
        vm.stopPrank();

        h = new Core8Handler(token, vault, source, distributor, checkIn, goal, nft, faucet, deployer, startAt);
        targetContract(address(h));
        bytes4[] memory selectors = new bytes4[](12);
        selectors[0] = Core8Handler.warpTime.selector;
        selectors[1] = Core8Handler.drip.selector;
        selectors[2] = Core8Handler.deposit.selector;
        selectors[3] = Core8Handler.withdraw.selector;
        selectors[4] = Core8Handler.withdrawDust.selector;
        selectors[5] = Core8Handler.checkInAction.selector;
        selectors[6] = Core8Handler.setGoalAction.selector;
        selectors[7] = Core8Handler.checkReachedAction.selector;
        selectors[8] = Core8Handler.mintNFTAction.selector;
        selectors[9] = Core8Handler.fundEpochAction.selector;
        selectors[10] = Core8Handler.finalizeAction.selector;
        selectors[11] = Core8Handler.claimAction.selector;
        targetSelector(FuzzSelector({ addr: address(h), selectors: selectors }));
    }

    /// @notice Invariant 1 — Solvency: vault luon giu du mUSDC cho tong goc nguoi dung.
    function invariant_vaultSolvency() public view {
        assertGe(token.balanceOf(address(vault)), vault.totalPrincipal(), "vault under-collateralized vs totalPrincipal");
    }

    /// @notice Invariant 2 — Accounting: tong goc tracking khop bien toan cuc cua vault.
    function invariant_accounting() public view {
        assertEq(h.sumPrincipals(), vault.totalPrincipal(), "principal accounting mismatch");
    }

    /// @notice Invariant 3 — Yield solvency: tong lai da claim khong vuot tong da fund.
    function invariant_yieldSolvency() public view {
        assertLe(h.claimedYield(), h.fundedYield(), "claimed yield exceeds funded yield");
    }

    /// @notice Invariant 4 — Streak integrity (savings): streak khong bao gio vuot so ky da chot.
    function invariant_streakBounded() public view {
        for (uint256 i; i < 3; ++i) {
            address a = h.actors(i);
            assertLe(vault.getAccount(a).streak, h.nextFinalize(), "streak exceeds finalized epochs");
        }
    }

    /// @notice Invariant 5 — Streak integrity (check-in): chuoi ngay khong vuot so ngay troi qua.
    function invariant_checkInBounded() public view {
        uint256 day = block.timestamp / 86_400;
        for (uint256 i; i < 3; ++i) {
            address a = h.actors(i);
            if (!h.hasCheckedInOnce(a)) continue;
            assertLe(checkIn.checkInStreakDays(a), day - h.firstCheckInDay(a) + 1, "check-in streak exceeds elapsed days");
        }
    }

    /// @notice Invariant 6 — No-dust-brick: tong gui luon >= tong rut (khong am tai san o tang tracking).
    function invariant_noNegativeAssets() public view {
        assertGe(h.totalDeposited() + 15_000_000, h.totalWithdrawn(), "withdrawn exceeds deposited in total");
    }
}
