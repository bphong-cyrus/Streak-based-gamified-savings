// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title BuddyPact (Tính năng 17)
/// @notice Cam kết cặp đôi: hai ví stake chung; nếu CẢ HAI cùng đạt target trong
///         cùng một kỳ đã chốt, mỗi ngườ nhận lại stake + thưởng từ pool.
///         Nếu một ngườ fail, stake chuyển cho ngườ còn lại (động lực hỗ trợ nhau).
contract BuddyPact is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Pact {
        uint256 id;
        address a;
        address b;
        uint256 epoch; // kỳ cam kết
        uint256 stake;
        uint256 reward;
        bool resolved;
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;

    uint256 public nextPactId = 1;
    mapping(uint256 => Pact) public pacts;
    uint256 public rewardPool;

    event PactCreated(uint256 indexed pactId, address indexed a, address indexed b, uint256 epoch, uint256 stake);
    event PactResolved(uint256 indexed pactId, address winnerA, address winnerB, uint256 reward);

    error NotParty();
    error BadState();
    error EpochNotSettled();
    error ZeroStake();

    constructor(IERC20 token_, IStreakVault vault_) {
        token = token_;
        vault = vault_;
    }

    function fundRewards(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
    }

    function createPact(address buddy, uint256 epoch, uint256 stake) external returns (uint256 pactId) {
        if (stake == 0) revert ZeroStake();
        if (buddy == msg.sender) revert NotParty();
        token.safeTransferFrom(msg.sender, address(this), stake);
        pactId = nextPactId++;
        pacts[pactId] = Pact({
            id: pactId,
            a: msg.sender,
            b: buddy,
            epoch: epoch,
            stake: stake,
            reward: 0,
            resolved: false
        });
        emit PactCreated(pactId, msg.sender, buddy, epoch, stake);
    }

    function joinPact(uint256 pactId) external nonReentrant {
        Pact storage p = pacts[pactId];
        if (p.b != msg.sender || p.id == 0) revert NotParty();
        if (p.reward != 0) revert BadState(); // đã join (reward dùng làm cờ)
        token.safeTransferFrom(msg.sender, address(this), p.stake);
        uint256 bonus = rewardPool / 10 > 0 ? rewardPool / 10 : 0; // thưởng tối đa 10% pool
        p.reward = bonus;
        rewardPool -= bonus;
    }

    /// @notice Resolve sau khi kỳ cam kết đã chốt.
    function resolvePact(uint256 pactId) external nonReentrant {
        Pact storage p = pacts[pactId];
        if (p.id == 0 || p.resolved) revert BadState();
        if (vault.nextEpochToSettle() <= p.epoch) revert EpochNotSettled();

        bool aOk = vault.getEpochStatus(p.a, p.epoch).qualified;
        bool bOk = vault.getEpochStatus(p.b, p.epoch).qualified;
        p.resolved = true;

        uint256 total = p.stake * 2;
        if (aOk && bOk) {
            // Cả hai đạt: mỗi ngườ nhận stake + chia đều thưởng
            uint256 each = total / 2 + p.reward / 2;
            token.safeTransfer(p.a, each);
            token.safeTransfer(p.b, each);
        } else if (aOk) {
            token.safeTransfer(p.a, total);
        } else if (bOk) {
            token.safeTransfer(p.b, total);
        } else {
            // Cả hai fail: hoàn stake
            token.safeTransfer(p.a, p.stake);
            token.safeTransfer(p.b, p.stake);
        }
        emit PactResolved(pactId, p.a, p.b, p.reward);
    }
}
