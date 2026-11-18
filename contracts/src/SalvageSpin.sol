// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title SalvageSpin (Tính năng 29)
/// @notice Vòng quay cứu trợ: khi vừa mất streak (kỳ chốt thất bại gần nhất),
///         ngườ chơi được quay một lần nhận phần thưởng an ủi từ pool.
contract SalvageSpin is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public consolationPrize = 1 * 1e6; // 1 mUSDC
    uint256 public prizePool;

    /// @dev wallet -> epoch thất bại đã quay (+1).
    mapping(address => uint256) internal _spunFailEpoch;

    event SalvageSpun(address indexed wallet, uint256 indexed failedEpoch, uint256 prize);

    error NoRecentFail();
    error AlreadySpun();
    error NoBudget();

    constructor(IERC20 token_, IStreakVault vault_) Ownable(msg.sender) {
        token = token_;
        vault = vault_;
    }

    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        prizePool += amount;
    }

    function setConsolationPrize(uint256 prize) external onlyOwner {
        consolationPrize = prize;
    }

    function spin() external nonReentrant {
        uint256 failedEpoch = vault.lastFailedEpoch(msg.sender);
        if (failedEpoch == 0 || vault.getAccount(msg.sender).streak != 0) revert NoRecentFail();
        if (_spunFailEpoch[msg.sender] == failedEpoch + 1) revert AlreadySpun();
        if (consolationPrize > prizePool) revert NoBudget();

        _spunFailEpoch[msg.sender] = failedEpoch + 1;
        prizePool -= consolationPrize;
        token.safeTransfer(msg.sender, consolationPrize);
        emit SalvageSpun(msg.sender, failedEpoch, consolationPrize);
    }

    function spinAvailable(address wallet) external view returns (bool) {
        uint256 failedEpoch = vault.lastFailedEpoch(wallet);
        if (failedEpoch == 0 || vault.getAccount(wallet).streak != 0) return false;
        if (_spunFailEpoch[wallet] == failedEpoch + 1) return false;
        return consolationPrize <= prizePool;
    }
}
