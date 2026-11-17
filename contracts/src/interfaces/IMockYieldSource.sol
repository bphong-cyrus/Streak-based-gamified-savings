// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMockYieldSource {
    event EpochFunded(uint256 indexed epoch, address indexed funder, uint256 amount, uint256 newBudget);
    event EpochReleased(uint256 indexed epoch, uint256 amount);
    event DistributorSet(address indexed distributor);

    error ZeroAmount();
    error ZeroAddress();
    error NotDistributor();
    error NotInitializer();
    error DistributorAlreadySet();
    error FundingClosed(uint256 epoch, uint256 endsAt);
    error AlreadyReleased(uint256 epoch);

    function fundEpoch(uint256 epoch, uint256 amount) external;
    function release(uint256 epoch) external returns (uint256 amount);
    function budgetOf(uint256 epoch) external view returns (uint256);
    function released(uint256 epoch) external view returns (bool);
}
