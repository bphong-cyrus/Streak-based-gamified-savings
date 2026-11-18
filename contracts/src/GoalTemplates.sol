// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {Gems} from "./Gems.sol";

/// @title GoalTemplates (Tính năng 114 + 115 + 116)
/// @notice 114. Mẫu mục tiêu có sẵn (du lịch, học phí, điện thoại...): áp ngay vào vault.
///         115. Theo dõi tiến độ theo mẫu: % hoàn thành góp vào mục tiêu lớn của mẫu.
///         116. Chia sẻ mẫu: ai dùng mẫu của bạn, bạn nhận hoa hồng Gems từ pool.
/// @dev Mẫu = (tên, mục tiêu tuần, tổng mục tiêu). Ngườ dùng "start" để đặt target vault ngay.
contract GoalTemplates is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Template {
        uint256 id;
        address author;
        string name;
        uint256 weeklyTarget;
        uint256 totalGoal; // tổng tiền cần góp
        uint256 useCount;
    }

    IStreakVault public immutable vault;
    Gems public immutable gems;

    uint256 public templateCount;
    mapping(uint256 => Template) public templates;
    mapping(address => uint256) public authorRewardPool; // pool hoa hồng chờ nhận (Gems)

    uint256 public usageReward = 5 * 1e18; // 5 Gems mỗi lượt dùng mẫu

    event TemplateCreated(uint256 indexed id, address indexed author, string name, uint256 weeklyTarget);
    event TemplateUsed(uint256 indexed id, address indexed user);
    event AuthorRewarded(address indexed author, uint256 gems);

    error BadTemplate();
    error BadAmount();

    constructor(IStreakVault vault_, Gems gems_) Ownable(msg.sender) {
        vault = vault_;
        gems = gems_;
    }

    function setUsageReward(uint256 reward) external onlyOwner {
        usageReward = reward;
    }

    /// @notice Tính năng 114: tạo mẫu mục tiêu chia sẻ.
    function createTemplate(string memory name, uint256 weeklyTarget, uint256 totalGoal) external returns (uint256 id) {
        if (weeklyTarget == 0 || totalGoal < weeklyTarget) revert BadTemplate();
        id = ++templateCount;
        templates[id] = Template({id: id, author: msg.sender, name: name, weeklyTarget: weeklyTarget, totalGoal: totalGoal, useCount: 0});
        emit TemplateCreated(id, msg.sender, name, weeklyTarget);
    }

    /// @notice Tính năng 114 + 115: dùng mẫu — đặt target vault ngay và bắt đầu theo dõi.
    /// @dev Contract là operator của vault nên đặt mục tiêu hộ cho ngườ dùng.
    function useTemplate(uint256 id) external {
        Template storage t = templates[id];
        if (t.id == 0) revert BadTemplate();
        require(vault.hasStarted(), "not started");
        vault.setWeeklyTargetFor(msg.sender, t.weeklyTarget);
        t.useCount += 1;
        emit TemplateUsed(id, msg.sender);
    }

    /// @notice Tính năng 115: % tiến độ góp của ví theo mẫu (dựa trên gốc hiện tại).
    function progressOf(address wallet, uint256 id) external view returns (uint256 bps) {
        Template storage t = templates[id];
        uint256 principal = vault.getAccount(wallet).principal;
        if (t.totalGoal == 0) return 0;
        bps = (principal * 10_000) / t.totalGoal;
        if (bps > 10_000) bps = 10_000;
    }

    /// @notice Tính năng 116: trả thưởng Gems cho tác giả mẫu (owner nạp pool bằng cách gọi trực tiếp).
    function rewardAuthor(uint256 id) external onlyOwner {
        Template storage t = templates[id];
        if (t.id == 0) revert BadTemplate();
        uint256 pending = authorRewardPool[t.author];
        if (pending == 0) revert BadAmount();
        authorRewardPool[t.author] = 0;
        gems.mint(t.author, pending);
        emit AuthorRewarded(t.author, pending);
    }

    /// @notice Cộng dồn hoa hồng cho tác giả (owner gọi sau mỗi lượt dùng mẫu, off-chain bot).
    function creditAuthor(uint256 id) external onlyOwner {
        Template storage t = templates[id];
        if (t.id == 0) revert BadTemplate();
        authorRewardPool[t.author] += usageReward;
    }
}
