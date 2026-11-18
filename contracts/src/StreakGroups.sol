// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title StreakGroups (Friend Groups)
/// @notice Nhóm bạn bè: tạo nhóm với mã mờ, thành viên tham gia bằng mã,
///         streak nhóm = số kỳ liên tiếp TẤT CẢ thành viên đạt mục tiêu.
/// @dev Thành viên mới chỉ được tính từ kỳ sau kỳ tham gia (theo đặc tả BA).
///      Quyền truy cập nhóm & hiển thị tên ví thuộc lớp ứng dụng (không on-chain).
contract StreakGroups {
    uint256 public constant MAX_MEMBERS = 10;
    uint256 public constant MAX_GROUP_STREAK_SCAN = 100; // giới hạn quét lịch sử

    struct Group {
        uint256 id;
        string name;
        address creator;
        uint256 createdAtEpoch;
        bytes32 inviteHash; // keccak256(mã mờ) — mã thật chỉ lưu ở app/backend
        address[] members;
    }

    IStreakVault public immutable vault;

    uint256 public nextGroupId;
    mapping(uint256 => Group) internal _groups;
    // epoch có hiệu lực + 1 (0 = chưa tham gia). Creator = createdAtEpoch + 1.
    mapping(uint256 => mapping(address => uint256)) internal _effectiveFromEpoch;

    event GroupCreated(uint256 indexed groupId, string name, address indexed creator);
    event MemberJoined(uint256 indexed groupId, address indexed member, uint256 effectiveEpoch);

    error GroupNotFound();
    error InvalidInviteCode();
    error AlreadyMember();
    error GroupFull();
    error NotMember();

    constructor(IStreakVault vault_) {
        vault = vault_;
    }

    function _currentEpoch() internal view returns (uint256) {
        return vault.hasStarted() ? vault.currentEpoch() : 0;
    }

    /// @notice Tạo nhóm. `inviteCode` là mã gốc (plaintext) — contract chỉ lưu hash.
    function createGroup(string calldata name, string calldata inviteCode) external returns (uint256 groupId) {
        require(bytes(inviteCode).length >= 4, "code too short");
        groupId = nextGroupId++;
        Group storage g = _groups[groupId];
        g.id = groupId;
        g.name = name;
        g.creator = msg.sender;
        g.createdAtEpoch = _currentEpoch();
        g.inviteHash = keccak256(bytes(inviteCode));
        g.members.push(msg.sender);
        _effectiveFromEpoch[groupId][msg.sender] = g.createdAtEpoch + 1;
        emit GroupCreated(groupId, name, msg.sender);
    }

    /// @notice Tham gia nhóm bằng mã mờ. Thành viên được tính từ kỳ tiếp theo.
    function joinGroup(uint256 groupId, string calldata inviteCode) external {
        Group storage g = _groups[groupId];
        if (g.creator == address(0)) revert GroupNotFound();
        if (_effectiveFromEpoch[groupId][msg.sender] != 0) revert AlreadyMember();
        if (g.inviteHash != keccak256(bytes(inviteCode))) revert InvalidInviteCode();
        if (g.members.length >= MAX_MEMBERS) revert GroupFull();

        uint256 effective = _currentEpoch() + 1; // tính từ kỳ tiếp theo
        _effectiveFromEpoch[groupId][msg.sender] = effective + 1;
        g.members.push(msg.sender);
        emit MemberJoined(groupId, msg.sender, effective);
    }

    function isMember(uint256 groupId, address wallet) public view returns (bool) {
        return _effectiveFromEpoch[groupId][wallet] != 0;
    }

    /// @notice Trả về epoch mà `wallet` bắt đầu được tính trong nhóm.
    function effectiveEpochOf(uint256 groupId, address wallet) external view returns (uint256) {
        uint256 raw = _effectiveFromEpoch[groupId][wallet];
        if (raw == 0) revert NotMember();
        return raw - 1;
    }

    function getGroup(uint256 groupId)
        external
        view
        returns (uint256 id, string memory name, address creator, uint256 createdAtEpoch, address[] memory members)
    {
        Group storage g = _groups[groupId];
        if (g.creator == address(0)) revert GroupNotFound();
        return (g.id, g.name, g.creator, g.createdAtEpoch, g.members);
    }

    function groupCount() external view returns (uint256) {
        return nextGroupId;
    }

    /// @notice Streak nhóm: số kỳ liên tiếp gần nhất mà tất cả thành viên đều qualified.
    /// @dev Chỉ xét các kỳ đã chốt; thành viên phải có hiệu lực tại kỳ đó.
    function groupStreak(uint256 groupId) external view returns (uint256) {
        Group storage g = _groups[groupId];
        if (g.creator == address(0)) revert GroupNotFound();

        uint256 lastSettled = vault.nextEpochToSettle(); // kỳ đã chốt = [0, lastSettled)
        uint256 streak;
        for (uint256 e = lastSettled; e > 0 && streak < MAX_GROUP_STREAK_SCAN; --e) {
            uint256 epoch = e - 1;
            if (!_allQualified(g, epoch)) break;
            ++streak;
        }
        return streak;
    }

    /// @notice Tiến độ kỳ hiện tại của từng thành viên (cho UI hiển thị).
    function memberProgress(uint256 groupId)
        external
        view
        returns (address[] memory members, uint256[] memory progresses, uint256[] memory targets)
    {
        Group storage g = _groups[groupId];
        if (g.creator == address(0)) revert GroupNotFound();
        uint256 n = g.members.length;
        members = g.members;
        progresses = new uint256[](n);
        targets = new uint256[](n);
        uint256 epoch = _currentEpoch();
        for (uint256 i; i < n; ++i) {
            IStreakVault.AccountView memory a = vault.getAccount(g.members[i]);
            IStreakVault.EpochStatus memory s = vault.getEpochStatus(g.members[i], epoch);
            progresses[i] = a.currentProgress;
            targets[i] = s.target;
        }
    }

    function _allQualified(Group storage g, uint256 epoch) internal view returns (bool) {
        for (uint256 i; i < g.members.length; ++i) {
            address m = g.members[i];
            uint256 effRaw = _effectiveFromEpoch[g.id][m];
            if (effRaw == 0) return false;
            if (effRaw - 1 > epoch) return false; // chưa có hiệu lực tại kỳ này
            IStreakVault.EpochStatus memory s = vault.getEpochStatus(m, epoch);
            if (!s.settled || !s.qualified) return false;
        }
        return true;
    }
}
