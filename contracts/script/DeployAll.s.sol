// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {StreakVault} from "../src/StreakVault.sol";
import {MockYieldSource} from "../src/MockYieldSource.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {Treasury} from "../src/Treasury.sol";
import {AutoSaver} from "../src/AutoSaver.sol";
import {StreakGroups} from "../src/StreakGroups.sol";
import {StreakNFT} from "../src/StreakNFT.sol";
import {Challenges} from "../src/Challenges.sol";
import {LuckyWheel} from "../src/LuckyWheel.sol";
import {SavingsGoal} from "../src/SavingsGoal.sol";
import {Leaderboard} from "../src/Leaderboard.sol";
import {ReminderCenter} from "../src/ReminderCenter.sol";

/// @notice Deploy toàn bộ hệ thống: 4 contracts lõi + 9 contracts mở rộng.
/// Env:
///   EPOCH_SECONDS        (mặc định 604800; demo dùng 180)
///   START_DELAY_SECONDS  (mặc định 0)
/// Ghi địa chỉ ra deployments/<chainId>.json
contract DeployAll is Script {
    function run()
        external
        returns (
            MockUSDC token,
            StreakVault vault,
            MockYieldSource source,
            YieldDistributor distributor,
            Treasury treasury,
            AutoSaver autoSaver,
            StreakGroups groups,
            StreakNFT nft,
            Challenges challenges,
            LuckyWheel wheel,
            SavingsGoal goal,
            Leaderboard leaderboard,
            ReminderCenter reminders
        )
    {
        uint256 epochSeconds = vm.envOr("EPOCH_SECONDS", uint256(604800));
        uint256 startDelay = vm.envOr("START_DELAY_SECONDS", uint256(0));
        uint256 startAt = block.timestamp + startDelay;

        vm.startBroadcast();
        address deployer = msg.sender;

        token = new MockUSDC(deployer);
        vault = new StreakVault(token, startAt, epochSeconds);
        source = new MockYieldSource(token, vault);
        distributor = new YieldDistributor(token, vault, source);
        vault.setDistributor(address(distributor));
        source.setDistributor(address(distributor));

        treasury = new Treasury();
        autoSaver = new AutoSaver(vault, token);
        groups = new StreakGroups(vault);
        nft = new StreakNFT(vault, "https://example.com/streak-nft/{id}.json");
        challenges = new Challenges(token, vault);
        wheel = new LuckyWheel(token);
        goal = new SavingsGoal(vault);
        leaderboard = new Leaderboard(vault);
        reminders = new ReminderCenter(vault);

        // Nối treasury cho vault + distributor (mọi phí mặc định = 0)
        vault.setTreasury(address(treasury));
        distributor.setTreasury(address(treasury));
        vm.stopBroadcast();

        console2.log("chainId          ", block.chainid);
        console2.log("deployer         ", deployer);
        console2.log("MockUSDC         ", address(token));
        console2.log("StreakVault      ", address(vault));
        console2.log("MockYieldSource  ", address(source));
        console2.log("YieldDistributor ", address(distributor));
        console2.log("Treasury         ", address(treasury));
        console2.log("AutoSaver        ", address(autoSaver));
        console2.log("StreakGroups     ", address(groups));
        console2.log("StreakNFT        ", address(nft));
        console2.log("Challenges       ", address(challenges));
        console2.log("LuckyWheel       ", address(wheel));
        console2.log("SavingsGoal      ", address(goal));
        console2.log("Leaderboard      ", address(leaderboard));
        console2.log("ReminderCenter   ", address(reminders));
        console2.log("startAt          ", startAt);
        console2.log("epochSeconds     ", epochSeconds);

        _writeDeployment(deployer, token, vault, source, distributor, treasury, autoSaver, groups, nft, challenges, wheel, goal, leaderboard, reminders, startAt, epochSeconds);
    }

    function _writeDeployment(
        address deployer,
        MockUSDC token,
        StreakVault vault,
        MockYieldSource source,
        YieldDistributor distributor,
        Treasury treasury,
        AutoSaver autoSaver,
        StreakGroups groups,
        StreakNFT nft,
        Challenges challenges,
        LuckyWheel wheel,
        SavingsGoal goal,
        Leaderboard leaderboard,
        ReminderCenter reminders,
        uint256 startAt,
        uint256 epochSeconds
    ) internal {
        string memory k = "deployment";
        vm.serializeUint(k, "chainId", block.chainid);
        vm.serializeAddress(k, "deployer", deployer);
        vm.serializeAddress(k, "token", address(token));
        vm.serializeAddress(k, "vault", address(vault));
        vm.serializeAddress(k, "yieldSource", address(source));
        vm.serializeAddress(k, "distributor", address(distributor));
        vm.serializeAddress(k, "treasury", address(treasury));
        vm.serializeAddress(k, "autoSaver", address(autoSaver));
        vm.serializeAddress(k, "groups", address(groups));
        vm.serializeAddress(k, "nft", address(nft));
        vm.serializeAddress(k, "challenges", address(challenges));
        vm.serializeAddress(k, "wheel", address(wheel));
        vm.serializeAddress(k, "goal", address(goal));
        vm.serializeAddress(k, "leaderboard", address(leaderboard));
        vm.serializeAddress(k, "reminders", address(reminders));
        vm.serializeUint(k, "startAt", startAt);
        vm.serializeUint(k, "deployBlock", block.number);
        string memory json = vm.serializeUint(k, "epochSeconds", epochSeconds);
        string memory dir = string.concat(vm.projectRoot(), "/deployments");
        vm.createDir(dir, true);
        string memory path = string.concat(dir, "/", vm.toString(block.chainid), ".json");
        vm.writeJson(json, path);
        console2.log("Saved deployment ->", path);
    }
}
