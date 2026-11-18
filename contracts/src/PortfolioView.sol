// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {YieldDistributor} from "./YieldDistributor.sol";
import {SavingsPots} from "./SavingsPots.sol";
import {MockLendingPool} from "./MockLendingPool.sol";

/// @title PortfolioView (Tính năng 49 — tổng hợp danh mục)
/// @notice Một view duy nhất tổng hợp: gốc vault, tiến độ kỳ, thưởng chờ/đã nhận,
///         hũ tiết kiệm, lãi lending. Frontend gọi 1 lần thay vì nhiều lần.
contract PortfolioView {
    struct Portfolio {
        uint256 principal;
        uint256 currentProgress;
        uint256 currentTarget;
        uint256 streak;
        uint256 claimable;
        uint256 claimed;
        uint256 potted;
        uint256 lendingPrincipal;
        uint256 lendingInterest;
    }

    IStreakVault public immutable vault;
    YieldDistributor public immutable distributor;

    constructor(IStreakVault vault_, YieldDistributor distributor_) {
        vault = vault_;
        distributor = distributor_;
    }

    function portfolioOf(address wallet, SavingsPots pots, MockLendingPool pool)
        external
        view
        returns (Portfolio memory p)
    {
        IStreakVault.AccountView memory a = vault.getAccount(wallet);
        p.principal = a.principal;
        p.currentProgress = a.currentProgress;
        p.currentTarget = a.currentTarget;
        p.streak = a.streak;
        p.claimable = distributor.claimableYield(wallet);
        p.claimed = distributor.claimedYield(wallet);
        p.potted = address(pots) != address(0) ? pots.totalPotted(wallet) : 0;
        p.lendingPrincipal = address(pool) != address(0) ? pool.principalOf(wallet) : 0;
        p.lendingInterest = address(pool) != address(0) ? pool.interestOf(wallet) : 0;
    }
}
