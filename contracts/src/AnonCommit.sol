// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title AnonCommit (Tính năng 18)
/// @notice Cam kết ẩn danh: hash(cam kết + salt) trước kỳ, reveal sau khi chốt.
///         Ngườ hoàn thành đúng cam kết được ghi nhận (cơ sở cho giải thưởng ẩn danh).
/// @dev Chống front-running: commit trước kỳ, reveal sau khi kỳ chốt.
contract AnonCommit {
    struct Commitment {
        bytes32 hash;
        uint256 epoch;
        bool revealed;
    }

    IStreakVault public immutable vault;

    mapping(address => Commitment) public commits;
    mapping(uint256 => mapping(address => bool)) public fulfilled; // epoch -> wallet -> đúng hẹn

    event Committed(address indexed wallet, uint256 indexed epoch, bytes32 hash);
    event Revealed(address indexed wallet, uint256 indexed epoch, uint256 committedAmount, bool fulfilled);

    error AlreadyCommitted();
    error NothingCommitted();
    error WrongReveal();
    error EpochNotSettled();
    error AlreadyRevealed();

    constructor(IStreakVault vault_) {
        vault = vault_;
    }

    /// @notice Commit trước/d trong kỳ: keccak256(abi.encode(wallet, amount, salt)).
    function commit(uint256 epoch, bytes32 hash) external {
        if (commits[msg.sender].hash != 0) revert AlreadyCommitted();
        commits[msg.sender] = Commitment({hash: hash, epoch: epoch, revealed: false});
        emit Committed(msg.sender, epoch, hash);
    }

    /// @notice Reveal sau khi kỳ đã chốt; hợp lệ nếu progress >= amount đã cam kết.
    function reveal(uint256 epoch, uint256 amount, bytes32 salt) external {
        Commitment storage c = commits[msg.sender];
        if (c.hash == 0) revert NothingCommitted();
        if (c.revealed) revert AlreadyRevealed();
        if (c.epoch != epoch) revert WrongReveal();
        if (vault.nextEpochToSettle() <= epoch) revert EpochNotSettled();
        if (keccak256(abi.encode(msg.sender, amount, salt)) != c.hash) revert WrongReveal();

        c.revealed = true;
        uint256 progress = vault.getEpochStatus(msg.sender, epoch).progress;
        bool ok = progress >= amount && amount > 0;
        if (ok) fulfilled[epoch][msg.sender] = true;
        emit Revealed(msg.sender, epoch, amount, ok);
        delete commits[msg.sender];
    }
}
