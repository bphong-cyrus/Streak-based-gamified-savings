// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {YieldDistributor} from "./YieldDistributor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Watchtower (Tính năng 47 — giám sát)
/// @notice Bot giám sát: kiểm tra các bất biến an toàn (vault solvency,
///         distributor solvency) và phát sự kiện cảnh báo khi vi phạm.
/// @dev Chỉ view + emit; không can thiệp trạng thái.
contract Watchtower {
    IStreakVault public immutable vault;
    YieldDistributor public immutable distributor;
    IERC20 public immutable token;

    event VaultInsolvencyRisk(uint256 balance, uint256 totalPrincipal);
    event DistributorInsolvencyRisk(uint256 balance, uint256 claimablePlusRollover);

    constructor(IStreakVault vault_, YieldDistributor distributor_) {
        vault = vault_;
        distributor = distributor_;
        token = IERC20(vault.token());
    }

    function vaultSolvent() public view returns (bool) {
        return token.balanceOf(address(vault)) >= vault.totalPrincipal();
    }

    function distributorSolvent() public view returns (bool) {
        return token.balanceOf(address(distributor)) >= distributor.totalClaimable() + distributor.rollover();
    }

    function systemHealthy() external view returns (bool) {
        return vaultSolvent() && distributorSolvent();
    }

    /// @notice Bot gọi định kỳ; phát event nếu phát hiện rủi ro.
    function check() external returns (bool healthy) {
        healthy = true;
        if (!vaultSolvent()) {
            healthy = false;
            emit VaultInsolvencyRisk(token.balanceOf(address(vault)), vault.totalPrincipal());
        }
        if (!distributorSolvent()) {
            healthy = false;
            emit DistributorInsolvencyRisk(token.balanceOf(address(distributor)), distributor.totalClaimable() + distributor.rollover());
        }
    }
}
