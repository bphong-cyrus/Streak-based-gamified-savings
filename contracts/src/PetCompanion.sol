// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {Gems} from "./Gems.sol";

/// @title PetCompanion (Tính năng 87 + 88 + 89)
/// @notice 87. Thú cưng đồng hành: nuôi bằng hoạt động tiết kiệm (adopt miễn phí, 1 con/ví).
///         88. Pet lên cấp theo streak của chủ: level = streak/2 + lượt cho ăn.
///         89. Cho pet ăn bằng Gems: tiêu Gems (chuyển về hũ kho) để tăng độ no/experience.
/// @dev ERC-1155 với tokenId 1 = pet. Gems ăn vào chuyển cho owner hũ (không đốt).
contract PetCompanion is ERC1155, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant PET_ID = 1;
    uint256 public constant FEED_COST = 5 * 1e18; // 5 Gems/lượt

    IStreakVault public immutable vault;
    Gems public immutable gems;
    address public gemSink; // hũ nhận Gems cho pet ăn (treasury game)

    mapping(address => uint256) public feedCount;
    mapping(address => uint256) public adoptedAtEpoch;

    event PetAdopted(address indexed owner, uint256 epoch);
    event PetFed(address indexed owner, uint256 feedCount, uint256 level);

    error AlreadyAdopted();
    error NoPet();

    constructor(IStreakVault vault_, Gems gems_, address gemSink_, string memory uri_)
        ERC1155(uri_)
        Ownable(msg.sender)
    {
        vault = vault_;
        gems = gems_;
        gemSink = gemSink_;
    }

    /// @notice Tính năng 87: nhận pet miễn phí (phải đã kích hoạt vault).
    function adopt() external {
        if (balanceOf(msg.sender, PET_ID) > 0) revert AlreadyAdopted();
        if (!vault.getAccount(msg.sender).activated) revert NoPet();
        adoptedAtEpoch[msg.sender] = vault.hasStarted() ? vault.currentEpoch() : 0;
        _mint(msg.sender, PET_ID, 1, "");
        emit PetAdopted(msg.sender, adoptedAtEpoch[msg.sender]);
    }

    /// @notice Tính năng 89: cho pet ăn 5 Gems, tăng experience.
    function feed() external {
        if (balanceOf(msg.sender, PET_ID) == 0) revert NoPet();
        gems.transferFrom(msg.sender, gemSink, FEED_COST);
        feedCount[msg.sender] += 1;
        emit PetFed(msg.sender, feedCount[msg.sender], levelOf(msg.sender));
    }

    /// @notice Tính năng 88: cấp pet = streak chủ / 2 + lượt cho ăn.
    function levelOf(address owner) public view returns (uint256) {
        if (balanceOf(owner, PET_ID) == 0) return 0;
        uint256 streak = vault.getAccount(owner).streak;
        return streak / 2 + feedCount[owner];
    }
}
