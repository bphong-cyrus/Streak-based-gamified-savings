// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title MysteryBox (Tính năng 23)
/// @notice Hộp quà bí ẩn: đạt streak mốc được cấp hộp (ERC-1159); mở hộp nhận
///         ngẫu nhiên phần thưởng từ pool (blockhash — demo testnet).
contract MysteryBox is ERC1155, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BOX_ID = 1;

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    /// @dev wallet -> epoch đã cấp hộp (+1), tối đa 1 hộp mỗi kỳ.
    mapping(address => uint256) internal _grantedEpoch;
    uint256[] public prizeAmounts; // các mức thưởng
    uint256 public prizePool;

    event BoxGranted(address indexed wallet, uint256 indexed epoch);
    event BoxOpened(address indexed wallet, uint256 prize);

    error StreakTooLow();
    error NoBox();
    error NoPrizeConfigured();

    constructor(IERC20 token_, IStreakVault vault_, string memory uri_) ERC1155(uri_) Ownable(msg.sender) {
        token = token_;
        vault = vault_;
    }

    function fundPrizes(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        prizePool += amount;
    }

    function setPrizes(uint256[] calldata amounts) external onlyOwner {
        require(amounts.length > 0, "empty");
        delete prizeAmounts;
        for (uint256 i; i < amounts.length; ++i) prizeAmounts.push(amounts[i]);
    }

    /// @notice Cấp hộp khi streak >= 3 (1 hộp mỗi kỳ).
    function grantBox() external {
        uint256 streak = vault.getAccount(msg.sender).streak;
        if (streak < 3) revert StreakTooLow();
        uint256 epoch = vault.hasStarted() ? vault.currentEpoch() : 0;
        if (_grantedEpoch[msg.sender] == epoch + 1) return; // đã cấp kỳ này
        _grantedEpoch[msg.sender] = epoch + 1;
        _mint(msg.sender, BOX_ID, 1, "");
        emit BoxGranted(msg.sender, epoch);
    }

    /// @notice Mở hộp: đốt 1 BOX, trả thưởng ngẫu nhiên từ prizeAmounts.
    function openBox() external nonReentrant {
        if (balanceOf(msg.sender, BOX_ID) == 0) revert NoBox();
        if (prizeAmounts.length == 0) revert NoPrizeConfigured();
        _burn(msg.sender, BOX_ID, 1);

        uint256 rand = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), msg.sender))) % prizeAmounts.length;
        uint256 prize = prizeAmounts[rand];
        if (prize > prizePool) prize = prizePool;
        if (prize > 0) {
            prizePool -= prize;
            token.safeTransfer(msg.sender, prize);
        }
        emit BoxOpened(msg.sender, prize);
    }
}
