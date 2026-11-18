// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title LuckyWheel
/// @notice Vòng quay may mắn: owner nạp prize pool, ngườ chơi quay mỗi kỳ một lần.
/// @dev Ngẫu nhiên bằng blockhash (đủ cho demo testnet; KHÔNG dùng mainnet).
contract LuckyWheel is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct PrizeTier {
        uint256 probabilityBps; // xác suất (tổng mọi tier <= 10000)
        uint256 prizeAmount; // mUSDC
    }

    IERC20 public immutable token;
    PrizeTier[] public tiers;

    /// @dev epoch+1 đã quay (0 = chưa quay kỳ nào).
    mapping(address => uint256) internal _spunAtEpoch;

    event WheelFunded(address indexed funder, uint256 amount);
    event WheelSpun(address indexed wallet, uint256 indexed epoch, uint256 tierIndex, uint256 prize);

    error NoPrize();
    error AlreadySpun(uint256 epoch);
    error EmptyPool();
    error InvalidTiers();

    constructor(IERC20 token_) Ownable(msg.sender) {
        token = token_;
    }

    /// @notice Owner nạp thêm giải.
    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit WheelFunded(msg.sender, amount);
    }

    /// @notice Owner cấu hình các tầng giải (xóa cấu hình cũ).
    function setTiers(uint256[] calldata probabilityBps, uint256[] calldata prizeAmounts) external onlyOwner {
        if (probabilityBps.length == 0 || probabilityBps.length != prizeAmounts.length) revert InvalidTiers();
        delete tiers;
        uint256 totalBps;
        for (uint256 i; i < probabilityBps.length; ++i) {
            totalBps += probabilityBps[i];
            tiers.push(PrizeTier({probabilityBps: probabilityBps[i], prizeAmount: prizeAmounts[i]}));
        }
        if (totalBps == 0 || totalBps > 10_000) revert InvalidTiers();
    }

    /// @notice Quay vòng quay. Mỗi ví một lần mỗi kỳ (epoch theo vault).
    function spin(uint256 epoch) external nonReentrant {
        uint256 raw = _spunAtEpoch[msg.sender];
        if (raw != 0 && raw - 1 == epoch) revert AlreadySpun(epoch);
        if (tiers.length == 0) revert InvalidTiers();
        uint256 pool = token.balanceOf(address(this));
        if (pool == 0) revert EmptyPool();

        _spunAtEpoch[msg.sender] = epoch + 1;

        uint256 rand = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), msg.sender, epoch))) % 10_000;
        uint256 acc;
        uint256 prize;
        uint256 tierIndex = type(uint256).max;
        for (uint256 i; i < tiers.length; ++i) {
            acc += tiers[i].probabilityBps;
            if (rand < acc) {
                prize = tiers[i].prizeAmount;
                tierIndex = i;
                break;
            }
        }
        if (prize == 0) revert NoPrize(); // tier "miss"
        if (prize > pool) prize = pool; // an toàn pool
        token.safeTransfer(msg.sender, prize);
        emit WheelSpun(msg.sender, epoch, tierIndex, prize);
    }

    function lastSpunEpoch(address wallet) external view returns (uint256) {
        uint256 raw = _spunAtEpoch[wallet];
        return raw == 0 ? 0 : raw - 1;
    }

    function canSpin(address wallet, uint256 epoch) external view returns (bool) {
        uint256 raw = _spunAtEpoch[wallet];
        return !(raw != 0 && raw - 1 == epoch) && tiers.length > 0 && token.balanceOf(address(this)) > 0;
    }

    function tierCount() external view returns (uint256) {
        return tiers.length;
    }
}
