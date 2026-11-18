// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title TimeCapsule (Tính năng 93 + 94 + 95)
/// @notice 93. Gửi tiền + thư cho tương lai: mở được sau N kỳ (theo epoch vault).
///         94. Capsule có id riêng làm kỷ vật số (dùng làm huy hiệu trong UI).
///         95. Hủy trước hạn được hoàn gốc trừ phí hủy; đúng hạn nhận đủ 100%.
/// @dev Phí hủy + phí tạo capsule nộp về owner (vận hành).
contract TimeCapsule is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_MESSAGE = 500;

    struct Capsule {
        uint256 id;
        address owner;
        uint256 amount;
        uint256 createdEpoch;
        uint256 unlockEpoch;
        string message;
        bool opened;
        bool cancelled;
    }

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public capsuleCount;
    mapping(uint256 => Capsule) public capsules;
    mapping(address => uint256) public capsuleCountOf;

    uint256 public creationFee = 1e5; // 0.1 mUSDC
    uint256 public cancelFeeBps = 2_000; // 20% phí hủy

    event CapsuleCreated(uint256 indexed capsuleId, address indexed owner, uint256 amount, uint256 unlockEpoch);
    event CapsuleOpened(uint256 indexed capsuleId, address indexed owner, uint256 amount);
    event CapsuleCancelled(uint256 indexed capsuleId, address indexed owner, uint256 refund, uint256 fee);

    error BadCapsule();
    error NotOwner();
    error NotUnlocked();
    error AlreadyDone();
    error MessageTooLong();

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    function setFees(uint256 fee, uint256 cancelBps) external onlyOwner {
        creationFee = fee;
        cancelFeeBps = cancelBps;
    }

    /// @notice Tính năng 93 + 94: tạo capsule kèm thư gửi tương lai.
    function create(uint256 amount, uint256 lockEpochs, string memory message) external nonReentrant returns (uint256 capsuleId) {
        if (!vault.hasStarted()) revert BadCapsule();
        if (bytes(message).length > MAX_MESSAGE) revert MessageTooLong();
        if (amount == 0 || lockEpochs == 0) revert BadCapsule();
        uint256 epoch = vault.currentEpoch();

        token.safeTransferFrom(msg.sender, address(this), amount + creationFee);
        if (creationFee > 0) token.safeTransfer(owner(), creationFee);

        capsuleId = ++capsuleCount;
        capsules[capsuleId] = Capsule({
            id: capsuleId,
            owner: msg.sender,
            amount: amount,
            createdEpoch: epoch,
            unlockEpoch: epoch + lockEpochs,
            message: message,
            opened: false,
            cancelled: false
        });
        capsuleCountOf[msg.sender] += 1;
        emit CapsuleCreated(capsuleId, msg.sender, amount, epoch + lockEpochs);
    }

    /// @notice Mở capsule sau khi unlockEpoch kết thúc, nhận đủ tiền.
    function open(uint256 capsuleId) external nonReentrant {
        Capsule storage c = capsules[capsuleId];
        if (c.id == 0 || c.opened || c.cancelled) revert AlreadyDone();
        if (c.owner != msg.sender) revert NotOwner();
        uint256 epoch = vault.hasStarted() ? vault.currentEpoch() : 0;
        if (epoch < c.unlockEpoch) revert NotUnlocked();
        c.opened = true;
        token.safeTransfer(msg.sender, c.amount);
        emit CapsuleOpened(capsuleId, msg.sender, c.amount);
    }

    /// @notice Tính năng 95: hủy trước hạn, nhận lại gốc trừ phí hủy.
    function cancel(uint256 capsuleId) external nonReentrant {
        Capsule storage c = capsules[capsuleId];
        if (c.id == 0 || c.opened || c.cancelled) revert AlreadyDone();
        if (c.owner != msg.sender) revert NotOwner();
        c.cancelled = true;
        uint256 fee = Math.mulDiv(c.amount, cancelFeeBps, BPS);
        if (fee > 0) token.safeTransfer(owner(), fee);
        token.safeTransfer(msg.sender, c.amount - fee);
        emit CapsuleCancelled(capsuleId, msg.sender, c.amount - fee, fee);
    }
}
