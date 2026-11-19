// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {StreakVault} from "../src/StreakVault.sol";
import {MockYieldSource} from "../src/MockYieldSource.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {DailyCheckIn} from "../src/DailyCheckIn.sol";
import {SavingsGoal} from "../src/SavingsGoal.sol";
import {StreakNFT} from "../src/StreakNFT.sol";
import {FaucetDrip} from "../src/FaucetDrip.sol";

/// @notice Deploy 8 core contract: token -> vault -> yield -> distributor -> check-in -> goal -> NFT -> faucet.
/// Env:
///   EPOCH_SECONDS        (mặc định 604800 = 1 tuần; demo dùng 180)
///   START_DELAY_SECONDS  (mặc định 0)
///   NFT_URI              (mặc định ipfs://cozy-save/badges/{id}.json)
/// Ghi địa chỉ ra deployments/<chainId>.json
contract Deploy is Script {
    function run()
        external
        returns (
            MockUSDC token,
            StreakVault vault,
            MockYieldSource source,
            YieldDistributor distributor,
            DailyCheckIn checkIn,
            SavingsGoal goal,
            StreakNFT nft,
            FaucetDrip faucet
        )
    {
        uint256 epochSeconds = vm.envOr("EPOCH_SECONDS", uint256(604800));
        uint256 startDelay = vm.envOr("START_DELAY_SECONDS", uint256(0));
        string memory nftUri = vm.envOr("NFT_URI", string("ipfs://cozy-save/badges/{id}.json"));
        uint256 startAt = block.timestamp + startDelay;

        vm.startBroadcast();
        address deployer = msg.sender;

        token = new MockUSDC(deployer);
        vault = new StreakVault(token, startAt, epochSeconds);
        source = new MockYieldSource(token, vault);
        distributor = new YieldDistributor(token, vault, source);
        checkIn = new DailyCheckIn(token);
        goal = new SavingsGoal(vault);
        nft = new StreakNFT(vault, nftUri);
        faucet = new FaucetDrip(vault, token);

        vault.setDistributor(address(distributor));
        source.setDistributor(address(distributor));
        vault.setOperator(address(faucet), true); // FaucetDrip tu cấp mục tiêu kỳ đầu
        vm.stopBroadcast();

        console2.log("chainId         ", block.chainid);
        console2.log("deployer        ", deployer);
        console2.log("MockUSDC        ", address(token));
        console2.log("StreakVault     ", address(vault));
        console2.log("MockYieldSource ", address(source));
        console2.log("YieldDistributor", address(distributor));
        console2.log("DailyCheckIn    ", address(checkIn));
        console2.log("SavingsGoal     ", address(goal));
        console2.log("StreakNFT       ", address(nft));
        console2.log("FaucetDrip      ", address(faucet));
        console2.log("startAt         ", startAt);
        console2.log("epochSeconds    ", epochSeconds);

        _writeDeployment(deployer, token, vault, source, distributor, checkIn, goal, nft, faucet, startAt, epochSeconds);
    }

    function _writeDeployment(
        address deployer,
        MockUSDC token,
        StreakVault vault,
        MockYieldSource source,
        YieldDistributor distributor,
        DailyCheckIn checkIn,
        SavingsGoal goal,
        StreakNFT nft,
        FaucetDrip faucet,
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
        vm.serializeAddress(k, "dailyCheckIn", address(checkIn));
        vm.serializeAddress(k, "goal", address(goal));
        vm.serializeAddress(k, "nft", address(nft));
        vm.serializeAddress(k, "faucetDrip", address(faucet));
        vm.serializeUint(k, "startAt", startAt);
        vm.serializeUint(k, "epochSeconds", epochSeconds);
        vm.serializeUint(k, "deployBlock", block.number);
        string memory out = vm.serializeString(k, "note", "Cozy Save core 8");
        vm.writeJson(out, string.concat("deployments/", vm.toString(block.chainid), ".json"));
    }
}
