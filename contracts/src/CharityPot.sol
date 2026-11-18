// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CharityPot (Tính năng 126 + 127 + 128)
/// @notice 126. Quyên góp % yield cho thiện nguyện: dùng donate() trực tiếp hoặc đăng ký auto-donate.
///         127. Danh sách tổ chức duyệt bởi owner; ngườ chơi chọn tổ chức mình tin.
///         128. Chứng nhận đóng góp: đếm on-chain + event làm bằng chứng công khai.
/// @dev autoDonateBps: khi user tự claim yield xong, gọi settleAutoDonate(amount) để contract
///      khấu trừ từ ví ngườ chơi (đã approve) tương ứng % cam kết.
contract CharityPot is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    struct Charity {
        uint256 id;
        string name;
        address wallet;
        bool active;
        uint256 totalReceived;
    }

    uint256 public charityCount;
    mapping(uint256 => Charity) public charities;
    mapping(address => uint256) public chosenCharityOf; // donor -> charityId
    mapping(address => uint256) public autoDonateBps; // donor -> % cam kết (Tính năng 126)
    mapping(address => uint256) public lifetimeDonated; // Tính năng 128

    event CharityRegistered(uint256 indexed id, string name, address wallet);
    event Donated(address indexed donor, uint256 indexed charityId, uint256 amount);
    event AutoDonateSet(address indexed donor, uint256 bps);
    event AutoDonateSettled(address indexed donor, uint256 indexed charityId, uint256 amount);

    error BadCharity();
    error BadBps();

    constructor(IERC20 token_) Ownable(msg.sender) {
        token = token_;
    }

    /// @notice Tính năng 127: đăng ký tổ chức thiện nguyện (owner duyệt).
    function registerCharity(string memory name, address wallet) external onlyOwner returns (uint256 id) {
        if (wallet == address(0)) revert BadCharity();
        id = ++charityCount;
        charities[id] = Charity({id: id, name: name, wallet: wallet, active: true, totalReceived: 0});
        emit CharityRegistered(id, name, wallet);
    }

    function setCharityActive(uint256 id, bool active) external onlyOwner {
        if (charities[id].id == 0) revert BadCharity();
        charities[id].active = active;
    }

    /// @notice Chọn tổ chức nhận quyên góp của mình.
    function chooseCharity(uint256 id) external {
        if (charities[id].id == 0 || !charities[id].active) revert BadCharity();
        chosenCharityOf[msg.sender] = id;
    }

    /// @notice Tính năng 126: đăng ký tự động quyên góp % sau mỗi lần claim yield.
    function setAutoDonate(uint256 bps) external {
        if (bps > 10_000) revert BadBps();
        autoDonateBps[msg.sender] = bps;
        emit AutoDonateSet(msg.sender, bps);
    }

    /// @notice Quyên góp trực tiếp.
    function donate(uint256 amount) external nonReentrant {
        uint256 id = chosenCharityOf[msg.sender];
        if (id == 0) revert BadCharity();
        _donate(msg.sender, id, amount);
    }

    /// @notice Tính năng 126: khấu trừ % cam kết từ số tiền vừa claim (đã approve contract).
    function settleAutoDonate(uint256 claimedAmount) external nonReentrant {
        uint256 bps = autoDonateBps[msg.sender];
        uint256 id = chosenCharityOf[msg.sender];
        if (bps == 0 || id == 0) revert BadCharity();
        uint256 amount = (claimedAmount * bps) / 10_000;
        if (amount == 0) revert BadCharity();
        _donate(msg.sender, id, amount);
        emit AutoDonateSettled(msg.sender, id, amount);
    }

    function _donate(address donor, uint256 id, uint256 amount) internal {
        Charity storage c = charities[id];
        if (!c.active) revert BadCharity();
        token.safeTransferFrom(donor, c.wallet, amount);
        c.totalReceived += amount;
        lifetimeDonated[donor] += amount; // Tính năng 128
        emit Donated(donor, id, amount);
    }
}
