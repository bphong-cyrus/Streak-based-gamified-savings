// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MockYieldSource} from "../src/MockYieldSource.sol";

/// @notice Seed demo: mint mUSDC cho các ví demo và nạp ngân sách mock yield cho kỳ 0, 1.
/// Đọc địa chỉ từ deployments/<chainId>.json.
/// Env:
///   DEMO_WALLETS       danh sách địa chỉ, phân tách bằng dấu phẩy (An,Bình,Chi)
///   DEMO_MINT_AMOUNT   số mUSDC mint cho mỗi ví, đơn vị nhỏ nhất (mặc định 100_000_000 = 100 mUSDC)
///   FUND_EPOCH0        mặc định 2_000_000 (2 mUSDC)
///   FUND_EPOCH1        mặc định 3_000_000 (3 mUSDC)
contract Seed is Script {
    function run() external {
        string memory path = string.concat(vm.projectRoot(), "/deployments/", vm.toString(block.chainid), ".json");
        string memory json = vm.readFile(path);
        MockUSDC token = MockUSDC(vm.parseJsonAddress(json, ".token"));
        MockYieldSource source = MockYieldSource(vm.parseJsonAddress(json, ".yieldSource"));

        address[] memory wallets = vm.envOr("DEMO_WALLETS", ",", new address[](0));
        uint256 mintAmount = vm.envOr("DEMO_MINT_AMOUNT", uint256(100_000_000));
        uint256 fund0 = vm.envOr("FUND_EPOCH0", uint256(2_000_000));
        uint256 fund1 = vm.envOr("FUND_EPOCH1", uint256(3_000_000));

        vm.startBroadcast();
        for (uint256 i; i < wallets.length; ++i) {
            token.mint(wallets[i], mintAmount);
            console2.log("Minted to", wallets[i], mintAmount);
        }

        uint256 totalFund = fund0 + fund1;
        if (totalFund > 0) {
            token.mint(msg.sender, totalFund);
            token.approve(address(source), totalFund);
            if (fund0 > 0) source.fundEpoch(0, fund0);
            if (fund1 > 0) source.fundEpoch(1, fund1);
            console2.log("Funded epoch 0:", fund0);
            console2.log("Funded epoch 1:", fund1);
        }
        vm.stopBroadcast();
    }
}
