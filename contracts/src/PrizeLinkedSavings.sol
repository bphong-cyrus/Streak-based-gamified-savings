// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {YieldDistributor} from "./YieldDistributor.sol";

/// @title PrizeLinkedSavings (Tính năng 69 + 70 + 71)
/// @notice 69. Xổ số không mất tiền (no-loss): tiền gốc luôn an toàn trong vault,
///         vé số đến từ yield ngườ chơi đã được chia trong kỳ.
///         70. Vé theo tiến độ: mỗi ticketSize mUSDC yield của một kỳ = 1 vé.
///         71. Giải jackpot tích lũy: không ai trúng thì cộng dồn kỳ sau.
/// @dev Ngẫu nhiên bằng blockhash (demo testnet). syncTickets pull dữ liệu từ distributor.
contract PrizeLinkedSavings is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IStreakVault public immutable vault;
    YieldDistributor public immutable distributor;
    IERC20 public immutable token;

    uint256 public ticketSize = 1e6; // 1 mUSDC yield = 1 vé
    uint256 public drawInterval = 4; // mỗi 4 kỳ quay một lần
    uint256 public firstPrizeBps = 7_000; // 70% pool giải cho giải nhất
    uint256 public jackpotRollover; // phần cộng dồn (Tính năng 71)

    /// @dev wallet -> epoch cuối đã đổi vé (+1, 0 = chưa).
    mapping(address => uint256) internal _syncedEpoch;
    mapping(address => uint256) public tickets;
    uint256 public totalTickets;

    mapping(uint256 => bool) public drawn; // drawIndex -> đã quay
    uint256 public drawCount;
    mapping(address => uint256) public winnings;

    event TicketsSynced(address indexed wallet, uint256 fromEpoch, uint256 toEpoch, uint256 newTickets);
    event Drawn(uint256 indexed drawIndex, uint256 epoch, address indexed winner, uint256 prize, uint256 rollover);
    event PrizeClaimed(address indexed wallet, uint256 amount);

    error NoTickets();
    error NothingToDraw();
    error AlreadyDrawn();

    constructor(IStreakVault vault_, YieldDistributor distributor_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        distributor = distributor_;
        token = token_;
    }

    /// @notice Tính năng 70: đổi yield các kỳ đã chốt thành vé (mỗi ticketSize = 1 vé).
    function syncTickets() external {
        uint256 to = vault.nextEpochToSettle();
        uint256 from = _syncedEpoch[msg.sender];
        uint256 gained;
        for (uint256 epoch = from; epoch < to; ++epoch) {
            uint256 reward = distributor.rewardOf(msg.sender, epoch);
            gained += reward / ticketSize;
        }
        if (gained == 0) revert NoTickets();
        _syncedEpoch[msg.sender] = to;
        tickets[msg.sender] += gained;
        totalTickets += gained;
        emit TicketsSynced(msg.sender, from, to, gained);
    }

    /// @notice Tính năng 69 + 71: quay giải. drawIndex thứ n quay sau kỳ (n+1)*drawInterval kết thúc.
    /// @dev Giải nhất = firstPrizeBps% pool (pool = số dư contract + jackpotRollover),
    ///      phần còn lại trừ rollover về pool kỳ sau.
    function draw(uint256 drawIndex) external nonReentrant {
        if (drawn[drawIndex]) revert AlreadyDrawn();
        uint256 epoch = (drawIndex + 1) * drawInterval - 1; // kỳ kết thúc mùa giải này
        if (block.timestamp < vault.epochEnd(epoch)) revert NothingToDraw();
        if (totalTickets == 0) revert NothingToDraw();

        drawn[drawIndex] = true;
        drawCount += 1;

        uint256 pool = token.balanceOf(address(this)) + jackpotRollover;
        uint256 prize = (pool * firstPrizeBps) / 10_000;
        uint256 rollover = pool - prize;
        jackpotRollover = rollover;

        uint256 rand = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), drawIndex, totalTickets))) % totalTickets;
        address winner = _pickWinner(rand);
        winnings[winner] += prize;
        emit Drawn(drawIndex, epoch, winner, prize, rollover);
    }

    function claimPrize() external nonReentrant {
        uint256 amount = winnings[msg.sender];
        if (amount == 0) revert NothingToDraw();
        winnings[msg.sender] = 0;
        if (jackpotRollover >= amount) jackpotRollover -= amount;
        token.safeTransfer(msg.sender, amount);
        emit PrizeClaimed(msg.sender, amount);
    }

    function _pickWinner(uint256 rand) internal view returns (address) {
        uint256 acc;
        // Duyệt participants của vault để tìm chủ vé thứ rand.
        address[] memory all = vault.getParticipants();
        for (uint256 i; i < all.length; ++i) {
            acc += tickets[all[i]];
            if (rand < acc) return all[i];
        }
        return all[all.length - 1];
    }

    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function setDrawInterval(uint256 interval) external onlyOwner {
        require(interval > 0, "bad interval");
        drawInterval = interval;
    }

    function setTicketSize(uint256 size) external onlyOwner {
        require(size > 0, "bad size");
        ticketSize = size;
    }
}
