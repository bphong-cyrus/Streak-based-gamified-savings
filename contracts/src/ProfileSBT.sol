// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title ProfileSBT (Tính năng 15)
/// @notice Hồ sơ công khai dạng soulbound: ví đã kích hoạt tiết kiệm mint 1 NFT
///         chứa tên hiển thị. Không chuyển được. Tên do chủ sở hữu tự đặt.
contract ProfileSBT is ERC721 {
    IStreakVault public immutable vault;

    uint256 public nextTokenId = 1;
    mapping(uint256 => string) public displayNames; // tokenId -> tên
    mapping(address => uint256) public tokenOf; // wallet -> tokenId

    event ProfileMinted(address indexed wallet, uint256 indexed tokenId, string name);
    event NameUpdated(uint256 indexed tokenId, string newName);

    error NotActivated();
    error AlreadyMinted();
    error NotOwner();
    error TransfersDisabled();

    constructor(IStreakVault vault_) ERC721("StreakSaver Profile", "SSPROFILE") {
        vault = vault_;
    }

    function mint(string calldata name) external returns (uint256 tokenId) {
        if (!vault.getAccount(msg.sender).activated) revert NotActivated();
        if (tokenOf[msg.sender] != 0) revert AlreadyMinted();
        tokenId = nextTokenId++;
        tokenOf[msg.sender] = tokenId;
        displayNames[tokenId] = name;
        _mint(msg.sender, tokenId);
        emit ProfileMinted(msg.sender, tokenId, name);
    }

    function setName(string calldata newName) external {
        uint256 tokenId = tokenOf[msg.sender];
        if (tokenId == 0) revert NotOwner();
        displayNames[tokenId] = newName;
        emit NameUpdated(tokenId, newName);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert TransfersDisabled();
        return super._update(to, tokenId, auth);
    }
}
