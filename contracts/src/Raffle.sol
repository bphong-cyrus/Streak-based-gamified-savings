// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title Raffle (Tính năng 24)
/// @notice Xổ số theo kỳ: mua vé bằng mUSDC; cuối kỳ owner quay, ngườ trúng nhận pool.
/// @dev Random bằng blockhash (demo testnet). Vé gắn với kỳ mua.
contract Raffle is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    IStreakVault public immutable vault;

    uint256 public ticketPrice = 1 * 1e6; // 1 mUSDC / vé
    uint256 public constant MAX_WINNERS = 3;

    /// @dev epoch -> ví -> số vé.
    mapping(uint256 => mapping(address => uint256)) public tickets;
    mapping(uint256 => address[]) internal _buyers;
    mapping(uint256 => uint256) public totalTickets;
    mapping(uint256 => uint256) public poolOf;
    mapping(uint256 => bool) public drawn;
    mapping(uint256 => uint256) public drawCount;

    event TicketBought(address indexed wallet, uint256 indexed epoch, uint256 count);
    event RaffleDrawn(uint256 indexed epoch, address indexed winner, uint256 prize);

    error EpochNotSettled();
    error AlreadyDrawn();
    error DrawsExhausted();
    error NoTickets();

    constructor(IERC20 token_, IStreakVault vault_) Ownable(msg.sender) {
        token = token_;
        vault = vault_;
    }

    function setTicketPrice(uint256 price) external onlyOwner {
        ticketPrice = price;
    }

    function buyTickets(uint256 count) external {
        require(vault.hasStarted(), "not started");
        require(count > 0, "zero");
        uint256 epoch = vault.currentEpoch();
        uint256 cost = ticketPrice * count;
        if (tickets[epoch][msg.sender] == 0) _buyers[epoch].push(msg.sender);
        tickets[epoch][msg.sender] += count;
        totalTickets[epoch] += count;
        poolOf[epoch] += cost;
        token.safeTransferFrom(msg.sender, address(this), cost);
        emit TicketBought(msg.sender, epoch, count);
    }

    /// @notice Quay xổ số một kỳ đã chốt. Có thể quay tối đa MAX_WINNERS lần,
    ///         mỗi lần chọn một ngườ trúng nhận pool / (số lần quay còn lại).
    function draw(uint256 epoch) external onlyOwner nonReentrant {
        if (drawn[epoch]) revert AlreadyDrawn();
        if (vault.nextEpochToSettle() <= epoch) revert EpochNotEndedError();
        if (totalTickets[epoch] == 0) revert NoTickets();
        drawn[epoch] = true;
        _pickWinners(epoch, 1);
    }

    function drawBatch(uint256 epoch, uint256 count) external onlyOwner nonReentrant {
        if (drawn[epoch]) revert AlreadyDrawn();
        if (vault.nextEpochToSettle() <= epoch) revert EpochNotEndedError();
        if (totalTickets[epoch] == 0) revert NoTickets();
        if (count == 0 || count > MAX_WINNERS) revert DrawsExhausted();
        drawn[epoch] = true;
        _pickWinners(epoch, count);
    }

    function _pickWinners(uint256 epoch, uint256 count) internal {
        address[] storage buyers = _buyers[epoch];
        uint256 total = totalTickets[epoch];
        for (uint256 d; d < count; ++d) {
            uint256 rand = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1 - d), epoch, d))) % total;
            // Chọn ngườ trúng theo trọng số số vé
            uint256 acc;
            address winner;
            for (uint256 i; i < buyers.length; ++i) {
                acc += tickets[epoch][buyers[i]];
                if (rand < acc) {
                    winner = buyers[i];
                    break;
                }
            }
            uint256 prize = poolOf[epoch] / (count - d);
            poolOf[epoch] -= prize;
            drawCount[epoch] += 1;
            if (winner != address(0) && prize > 0) {
                token.safeTransfer(winner, prize);
                emit RaffleDrawn(epoch, winner, prize);
            }
        }
    }

    error EpochNotEndedError();
}
