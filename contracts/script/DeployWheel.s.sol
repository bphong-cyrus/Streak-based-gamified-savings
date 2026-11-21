// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {LuckyWheel} from "../src/LuckyWheel.sol";

/// @notice Deploy LuckyWheel gắn vào deployment hiện có và ghi địa chỉ vào deployments/<chainId>.json.
/// Chạy (ví deployer có quyền không yêu cầu — ai cũng deploy được, owner = msg.sender):
///   forge script script/DeployWheel.s.sol --rpc-url $RPC --broadcast --private-key $KEY -vvvv
/// Env:
///   SPIN_FEE   phí mỗi lượt (mặc định 1_000_000 = 1 mUSDC)
///   COOLDOWN   giây giữa 2 lượt (mặc định 60)
///   FUND_POOL  nạp pool ngay sau deploy (đơn vị nhỏ nhất; 0 = bỏ qua)
contract DeployWheel is Script {
    function run() external {
        string memory path = string.concat(vm.projectRoot(), "/deployments/", vm.toString(block.chainid), ".json");
        string memory json = vm.readFile(path);
        MockUSDC token = MockUSDC(vm.parseJsonAddress(json, ".token"));

        uint256 spinFee = vm.envOr("SPIN_FEE", uint256(1_000_000));
        uint256 cooldown = vm.envOr("COOLDOWN", uint256(60));
        uint256 fundPool = vm.envOr("FUND_POOL", uint256(0));

        vm.startBroadcast();
        LuckyWheel wheel = new LuckyWheel(token, spinFee, cooldown);
        if (fundPool > 0) {
            token.approve(address(wheel), fundPool);
            wheel.fund(fundPool);
        }
        vm.stopBroadcast();

        // NOTE: forge-std hiện tại không có stdJson.set — file deployment được cập nhật
        // bằng script ngoài (python) sau khi deploy; địa chỉ in ra dưới đây.
        console2.log("LuckyWheel deployed at:", address(wheel));
        console2.log("Hay them dia chi vao deployments json:", path);
    }
}
