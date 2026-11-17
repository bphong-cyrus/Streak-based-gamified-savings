// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {StreakVault} from "../src/StreakVault.sol";
import {MockYieldSource} from "../src/MockYieldSource.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";

/// @notice Deploy token -> vault -> mock source -> distributor, rồi đăng ký distributor.
/// Env:
///   EPOCH_SECONDS        (mặc định 604800; demo dùng 180)
///   START_DELAY_SECONDS  (mặc định 0)
/// Ghi địa chỉ ra deployments/<chainId>.json
contract Deploy is Script {
    function run()
        external
        returns (MockUSDC token, StreakVault vault, MockYieldSource source, YieldDistributor distributor)
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
        vm.stopBroadcast();

        console2.log("chainId          ", block.chainid);
        console2.log("deployer         ", deployer);
        console2.log("MockUSDC         ", address(token));
        console2.log("StreakVault      ", address(vault));
        console2.log("MockYieldSource  ", address(source));
        console2.log("YieldDistributor ", address(distributor));
        console2.log("startAt          ", startAt);
        console2.log("epochSeconds     ", epochSeconds);

        _writeDeployment(deployer, token, vault, source, distributor, startAt, epochSeconds);
    }

    function _writeDeployment(
        address deployer,
        MockUSDC token,
        StreakVault vault,
        MockYieldSource source,
        YieldDistributor distributor,
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
