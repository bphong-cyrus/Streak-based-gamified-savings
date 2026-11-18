// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title SavingsPots
/// @notice Tính năng 31 + 32: nhiều "hũ" tiết kiệm đặt tên với kỳ hạn.
///         Gửi vào hũ bị khóa đến unlockEpoch; rút trước hạn bị phạt (về treasury).
contract SavingsPots is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Pot {
        uint256 id;
        string name;
        address owner;
        uint256 balance;
        uint256 unlockEpoch; // 0 = không khóa
        bool closed;
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;
    address public treasury;
    uint256 public earlyWithdrawPenaltyBps = 500; // Tính năng 32: phạt rút trước hạn 5%

    uint256 public nextPotId;
    mapping(uint256 => Pot) public pots;
    mapping(address => uint256[]) internal _ownedPots;

    event PotCreated(uint256 indexed potId, address indexed owner, string name, uint256 unlockEpoch);
    event PotFunded(uint256 indexed potId, uint256 amount);
    event PotWithdrawn(uint256 indexed potId, uint256 amount, uint256 penalty);

    error NotPotOwner();
    error PotClosed();
    error StillLocked(uint256 unlockEpoch);

    constructor(IERC20 token_, IStreakVault vault_) Ownable(msg.sender) {
        token = token_;
        vault = vault_;
    }

    function setTreasury(address t) external onlyOwner {
        treasury = t;
    }

    function setEarlyWithdrawPenaltyBps(uint256 bps) external onlyOwner {
        require(bps <= 10_000, "penalty>100%");
        earlyWithdrawPenaltyBps = bps;
    }

    /// @notice Tạo hũ. unlockEpoch = 0 nếu không khóa; >0 là kỳ mở khóa.
    function createPot(string calldata name, uint256 unlockEpoch) external returns (uint256 potId) {
        potId = nextPotId++;
        pots[potId] = Pot({
            id: potId,
            name: name,
            owner: msg.sender,
            balance: 0,
            unlockEpoch: unlockEpoch,
            closed: false
        });
        _ownedPots[msg.sender].push(potId);
        emit PotCreated(potId, msg.sender, name, unlockEpoch);
    }

    function fundPot(uint256 potId, uint256 amount) external nonReentrant {
        Pot storage p = pots[potId];
        if (p.owner != msg.sender) revert NotPotOwner();
        if (p.closed) revert PotClosed();
        token.safeTransferFrom(msg.sender, address(this), amount);
        p.balance += amount;
        emit PotFunded(potId, amount);
    }

    /// @notice Rút hũ. Trước hạn bị phạt earlyWithdrawPenaltyBps (Tính năng 32).
    function withdrawPot(uint256 potId, uint256 amount) external nonReentrant {
        Pot storage p = pots[potId];
        if (p.owner != msg.sender) revert NotPotOwner();
        if (p.closed) revert PotClosed();
        if (amount > p.balance) amount = p.balance;
        if (amount == 0) return;

        uint256 current = vault.hasStarted() ? vault.currentEpoch() : 0;
        uint256 penalty;
        if (p.unlockEpoch > current) {
            penalty = (amount * earlyWithdrawPenaltyBps) / 10_000;
            if (penalty > 0 && treasury != address(0)) token.safeTransfer(treasury, penalty);
        }
        p.balance -= amount;
        if (p.balance == 0) p.closed = true;
        token.safeTransfer(msg.sender, amount - penalty);
        emit PotWithdrawn(potId, amount, penalty);
    }

    function potBalance(uint256 potId) external view returns (uint256) {
        return pots[potId].balance;
    }

    function ownedPots(address owner) external view returns (uint256[] memory) {
        return _ownedPots[owner];
    }

    function totalPotted(address owner) external view returns (uint256 sum) {
        uint256[] memory ids = _ownedPots[owner];
        for (uint256 i; i < ids.length; ++i) {
            sum += pots[ids[i]].balance;
        }
    }
}
