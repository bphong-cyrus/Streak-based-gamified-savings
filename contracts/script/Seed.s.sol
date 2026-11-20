// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MockYieldSource} from "../src/MockYieldSource.sol";
import {DailyCheckIn} from "../src/DailyCheckIn.sol";
import {FaucetDrip} from "../src/FaucetDrip.sol";
import {StreakVault} from "../src/StreakVault.sol";

/// @notice Seed demo: mint mUSDC cho ví demo, nạp pool yield 3 kỳ liên tiếp bắt đầu từ
///         KỲ HIỆN TẠI (đọc on-chain, không hardcode kỳ 0–2) + pool điểm danh + faucet.
/// Đọc địa chỉ từ deployments/<chainId>.json.
/// Env:
///   DEMO_WALLETS       địa chỉ phân tách dấu phẩy
///   DEMO_MINT_AMOUNT   mỗi ví, đơn vị nhỏ nhất (mặc định 100_000_000 = 100 mUSDC)
///   FUND_EPOCH0/EPOCH1/EPOCH2  ngân sách yield cho kỳ hiện tại / +1 / +2 (mặc định 2/3/5 mUSDC)
///   FUND_CHECKIN       pool thưởng điểm danh (mặc định 10 mUSDC)
///   FUND_FAUCET        pool vòi nước (mặc định 100 mUSDC)
contract Seed is Script {
    function run() external {
        string memory path = string.concat(vm.projectRoot(), "/deployments/", vm.toString(block.chainid), ".json");
        string memory json = vm.readFile(path);
        MockUSDC token = MockUSDC(vm.parseJsonAddress(json, ".token"));
        StreakVault vault = StreakVault(vm.parseJsonAddress(json, ".vault"));
        MockYieldSource source = MockYieldSource(vm.parseJsonAddress(json, ".yieldSource"));
        DailyCheckIn checkIn = DailyCheckIn(vm.parseJsonAddress(json, ".dailyCheckIn"));
        FaucetDrip faucet = FaucetDrip(vm.parseJsonAddress(json, ".faucetDrip"));

        address[] memory wallets = vm.envOr("DEMO_WALLETS", ",", new address[](0));
        uint256 mintAmount = vm.envOr("DEMO_MINT_AMOUNT", uint256(100_000_000));
        uint256 fundCheckIn = vm.envOr("FUND_CHECKIN", uint256(10_000_000));
        uint256 fundFaucet = vm.envOr("FUND_FAUCET", uint256(100_000_000));
        uint256[3] memory funds = [
            vm.envOr("FUND_EPOCH0", uint256(2_000_000)),
            vm.envOr("FUND_EPOCH1", uint256(3_000_000)),
            vm.envOr("FUND_EPOCH2", uint256(5_000_000))
        ];

        // Ngân sách gắn vào kỳ hiện tại trên chain — chạy script này bất kỳ lúc nào
        // trên deployment mới đều đúng, không bị kẹt vì kỳ 0–2 đã kết thúc.
        uint256 startEpoch = vault.currentEpoch();
        console2.log("Funding yield starting at current epoch:", startEpoch);

        vm.startBroadcast();
        for (uint256 i; i < wallets.length; ++i) {
            token.mint(wallets[i], mintAmount);
            console2.log("Minted to", wallets[i], mintAmount);
        }

        uint256 totalYield = funds[0] + funds[1] + funds[2];
        uint256 total = totalYield + fundCheckIn + fundFaucet;
        if (total > 0) {
            token.mint(msg.sender, total);
            if (totalYield > 0) {
                token.approve(address(source), totalYield);
                if (funds[0] > 0) source.fundEpoch(startEpoch, funds[0]);
                if (funds[1] > 0) source.fundEpoch(startEpoch + 1, funds[1]);
                if (funds[2] > 0) source.fundEpoch(startEpoch + 2, funds[2]);
                console2.log("Funded yield epochs:", totalYield);
            }
            if (fundCheckIn > 0) {
                token.approve(address(checkIn), fundCheckIn);
                checkIn.fund(fundCheckIn);
                console2.log("Funded check-in pool:", fundCheckIn);
            }
            if (fundFaucet > 0) {
                token.approve(address(faucet), fundFaucet);
                faucet.fund(fundFaucet);
                console2.log("Funded faucet:", fundFaucet);
            }
        }
        vm.stopBroadcast();
    }
}
