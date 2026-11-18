// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title Bingo (Tính năng 27)
/// @notice Bingo tiết kiệm: mỗi kỳ đạt target đánh dấu một ô; hoàn thành hàng/diagonal
///         trên lưới 3x3 nhận thưởng. Mỗi ví một bảng.
contract Bingo is Ownable {
    uint256 public constant GRID = 3; // 3x3
    uint256 public constant CELLS = 9;

    IStreakVault public immutable vault;

    /// @dev wallet -> ô đã đánh (bitmask 9 bit, index = epoch % 9 theo mapping riêng).
    mapping(address => uint256) public markedMask;
    mapping(address => mapping(uint256 => bool)) public cellMarked; // wallet -> cellIndex -> đã dùng
    mapping(address => bool) public bingoClaimed;

    uint256 public bingoReward = 5 * 1e6; // 5 mUSDC (owner nạp bằng hàm fund)
    uint256 public rewardPool;

    event CellMarked(address indexed wallet, uint256 indexed epoch, uint256 cellIndex);
    event BingoClaimed(address indexed wallet, uint256 reward);

    error CellOccupied();
    error EpochNotSettled();
    error NotQualified();
    error NotBingo();
    error AlreadyClaimed();
    error NoBudget();

    constructor(IStreakVault vault_) Ownable(msg.sender) {
        vault = vault_;
    }

    function fund(uint256 amount) external {
        IERC20(vault.token()).transferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
    }

    function setBingoReward(uint256 reward) external onlyOwner {
        bingoReward = reward;
    }

    /// @notice Đánh dấu ô cho kỳ đã chốt và đạt target; ô = epoch % 9 (bảng xoay vòng).
    function mark(uint256 epoch) external {
        IStreakVault.EpochStatus memory s = vault.getEpochStatus(msg.sender, epoch);
        if (!s.settled) revert EpochNotSettled();
        if (!s.qualified) revert NotQualified();
        uint256 cell = epoch % CELLS;
        if (cellMarked[msg.sender][cell]) revert CellOccupied();
        cellMarked[msg.sender][cell] = true;
        markedMask[msg.sender] |= (1 << cell);
        emit CellMarked(msg.sender, epoch, cell);
    }

    function hasBingo(address wallet) public view returns (bool) {
        uint256 m = markedMask[wallet];
        if (m == 0) return false;
        uint256[8] memory lines = [
            uint256(0x1C0), // hàng 0: 111000000
            uint256(0x038), // hàng 1: 000111000
            uint256(0x007), // hàng 2: 000000111
            uint256(0x124), // cột 0: 100100100
            uint256(0x092), // cột 1: 010010010
            uint256(0x049), // cột 2: 001001001
            uint256(0x111), // chéo chính: 100010001
            uint256(0x054) // chéo phụ: 001010100
        ];
        for (uint256 i; i < 8; ++i) {
            if ((m & lines[i]) == lines[i]) return true;
        }
        return false;
    }

    function claimBingo() external {
        if (bingoClaimed[msg.sender]) revert AlreadyClaimed();
        if (!hasBingo(msg.sender)) revert NotBingo();
        if (rewardPool < bingoReward) revert NoBudget();
        bingoClaimed[msg.sender] = true;
        rewardPool -= bingoReward;
        // Chuyển token cho ngườ thắng (token nằm trong contract từ fund())
        address wallet = msg.sender;
        _transferReward(wallet);
        emit BingoClaimed(wallet, bingoReward);
    }

    function _transferReward(address wallet) internal {
        // ERC-20 transfer trực tiếp — token phải được nạp vào địa chỉ contract trước.
        // Tránh import SafeERC20 lặp: dùng low-level call chuẩn ERC-20.
        (bool ok,) = tokenAddress().call(abi.encodeWithSignature("transfer(address,uint256)", wallet, bingoReward));
        require(ok, "reward transfer failed");
    }

    function tokenAddress() internal view returns (address) {
        return address(vault.token());
    }
}
