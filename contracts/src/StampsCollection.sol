// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title StampsCollection (Tính năng 108 + 109 + 110)
/// @notice 108. Tem kỷ niệm: mỗi kỳ đạt mục tiêu được đóng 1 tem (ERC-1155, id = mùa*1000 + kỳ-trong-mùa).
///         109. Bộ sưu tập theo mùa: 1 mùa = `seasonLength` kỳ, tem cùng mùa cùng series.
///         110. Thưởng đủ bộ: sở hữu đủ tem một mùa nhận thưởng từ pool (một lần/mùa).
/// @dev Đóng tem là pull: ai cũng gọi stamp() để đúc tem cho ví đủ điều kiện.
contract StampsCollection is ERC1155, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant SEASON_LENGTH = 12; // 1 mùa = 12 kỳ (gần 3 tháng nếu kỳ tuần)
    uint256 public constant BONUS_PER_SEASON = 5 * 1e6; // 5 mUSDC

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public prizePool;
    mapping(address => mapping(uint256 => bool)) public seasonBonusClaimed;

    event Stamped(address indexed wallet, uint256 indexed epoch, uint256 tokenId, uint256 season);
    event SeasonBonusClaimed(address indexed wallet, uint256 season, uint256 bonus);

    error NotQualified();
    error AlreadyStamped();
    error SeasonIncomplete();
    error BonusClaimed();

    constructor(IStreakVault vault_, IERC20 token_, string memory uri_) ERC1155(uri_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    function fundPrizes(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        prizePool += amount;
    }

    function tokenIdOf(uint256 epoch) public pure returns (uint256) {
        uint256 season = epoch / SEASON_LENGTH;
        uint256 slot = epoch % SEASON_LENGTH;
        return season * 1000 + slot + 1;
    }

    /// @notice Tính năng 108 + 109: đóng tem cho ví đạt mục tiêu ở kỳ đã chốt.
    function stamp(address wallet, uint256 epoch) external {
        IStreakVault.EpochStatus memory s = vault.getEpochStatus(wallet, epoch);
        if (!s.settled || !s.qualified) revert NotQualified();
        uint256 tokenId = tokenIdOf(epoch);
        if (balanceOf(wallet, tokenId) > 0) revert AlreadyStamped();
        _mint(wallet, tokenId, 1, "");
        emit Stamped(wallet, epoch, tokenId, epoch / SEASON_LENGTH);
    }

    /// @notice Tính năng 110: đủ bộ tem một mùa nhận thưởng.
    function claimSeasonBonus(uint256 season) external nonReentrant {
        if (seasonBonusClaimed[msg.sender][season]) revert BonusClaimed();
        for (uint256 slot; slot < SEASON_LENGTH; ++slot) {
            if (balanceOf(msg.sender, season * 1000 + slot + 1) == 0) revert SeasonIncomplete();
        }
        seasonBonusClaimed[msg.sender][season] = true;
        uint256 bonus = BONUS_PER_SEASON;
        if (bonus > prizePool) bonus = prizePool;
        prizePool -= bonus;
        if (bonus > 0) token.safeTransfer(msg.sender, bonus);
        emit SeasonBonusClaimed(msg.sender, season, bonus);
    }
}
