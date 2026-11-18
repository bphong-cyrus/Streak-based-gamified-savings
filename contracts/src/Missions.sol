// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {Gems} from "./Gems.sol";

/// @title Missions
/// @notice Hệ thống nhiệm vụ: hoàn thành mục tiêu on-chain được chứng thực bởi StreakVault
///         thì nhận Gems. Hỗ trợ nhiệm vụ lặp theo kỳ và một lần duy nhất.
/// @dev Các loại:
///      - WeeklyTarget: gửi đủ mục tiêu trong kỳ hiện tại (lặp lại mỗi kỳ).
///      - StreakMilestone: streak đã chốt >= param (một lần).
///      - DepositCount: tổng số lần gửi >= param (một lần).
///      - TotalSaved: gốc hiện tại >= param (một lần).
contract Missions is AccessControl {
    enum Kind {
        WeeklyTarget,
        StreakMilestone,
        DepositCount,
        TotalSaved
    }

    struct Mission {
        Kind kind;
        uint256 param; // ngưỡng: streak / số lần gửi / số tiền gốc (đơn vị nhỏ nhất)
        uint256 gemReward;
        bool recurring; // true: nhận lại được mỗi kỳ (chỉ áp dụng WeeklyTarget)
        bool active;
    }

    IStreakVault public immutable vault;
    Gems public immutable gems;

    Mission[] public missions;
    /// @dev Với nhiệm vụ lặp: kỳ đã nhận + 1 (0 = chưa nhận kỳ nào). Với nhiệm vụ một lần: 1 = đã nhận.
    mapping(uint256 => mapping(address => uint256)) public claimState;

    event MissionAdded(uint256 indexed missionId, Kind kind, uint256 param, uint256 gemReward, bool recurring);
    event MissionSetActive(uint256 indexed missionId, bool active);
    event MissionClaimed(uint256 indexed missionId, address indexed wallet, uint256 epoch, uint256 gemReward);

    error MissionNotFound();
    error MissionInactive();
    error NotEligible();
    error AlreadyClaimed();

    constructor(IStreakVault vault_, Gems gems_, address admin) {
        vault = vault_;
        gems = gems_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Thêm nhiệm vụ mới. Trả về missionId.
    function addMission(Kind kind, uint256 param, uint256 gemReward, bool recurring) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 missionId) {
        if (gemReward == 0) revert NotEligible();
        if (kind == Kind.WeeklyTarget && !recurring) revert NotEligible();
        if (recurring && kind != Kind.WeeklyTarget) revert NotEligible();
        missionId = missions.length;
        missions.push(Mission({kind: kind, param: param, gemReward: gemReward, recurring: recurring, active: true}));
        emit MissionAdded(missionId, kind, param, gemReward, recurring);
    }

    function setActive(uint256 missionId, bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _mission(missionId).active = active;
        emit MissionSetActive(missionId, active);
    }

    function setGemReward(uint256 missionId, uint256 gemReward) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (gemReward == 0) revert NotEligible();
        _mission(missionId).gemReward = gemReward;
    }

    /// @notice Nhận thưởng nhiệm vụ. Mints Gems cho msg.sender nếu đủ điều kiện.
    function claim(uint256 missionId) external {
        Mission storage m = _mission(missionId);
        if (!m.active) revert MissionInactive();

        uint256 epoch = vault.currentEpoch();
        if (!m.recurring) {
            if (claimState[missionId][msg.sender] != 0) revert AlreadyClaimed();
        } else if (claimState[missionId][msg.sender] == epoch + 1) {
            revert AlreadyClaimed();
        }

        if (!_eligible(m, msg.sender)) revert NotEligible();

        if (m.recurring) {
            claimState[missionId][msg.sender] = epoch + 1;
        } else {
            claimState[missionId][msg.sender] = 1;
        }
        gems.mint(msg.sender, m.gemReward);
        emit MissionClaimed(missionId, msg.sender, epoch, m.gemReward);
    }

    /// @notice Xem trước: ví có đủ điều kiện và chưa nhận nhiệm vụ này không.
    function canClaim(uint256 missionId, address wallet) external view returns (bool) {
        Mission storage m = _mission(missionId);
        if (!m.active || !vault.hasStarted()) return false;
        if (!m.recurring && claimState[missionId][wallet] != 0) return false;
        if (m.recurring && claimState[missionId][wallet] == vault.currentEpoch() + 1) return false;
        return _eligible(m, wallet);
    }

    function missionCount() external view returns (uint256) {
        return missions.length;
    }

    // ------------------------------------------------------------------ internal

    function _mission(uint256 missionId) internal view returns (Mission storage) {
        if (missionId >= missions.length) revert MissionNotFound();
        return missions[missionId];
    }

    function _eligible(Mission storage m, address wallet) internal view returns (bool) {
        IStreakVault.AccountView memory a = vault.getAccount(wallet);
        if (m.kind == Kind.WeeklyTarget) {
            return a.activated && a.currentTarget > 0 && a.currentProgress >= a.currentTarget;
        }
        if (!a.activated) return false;
        if (m.kind == Kind.StreakMilestone) return a.streak >= m.param;
        if (m.kind == Kind.DepositCount) return a.depositCount >= m.param;
        return a.principal >= m.param; // TotalSaved
    }
}
