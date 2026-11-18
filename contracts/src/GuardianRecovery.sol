// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title GuardianRecovery (Tính năng 96 + 97 + 98)
/// @notice 96. Đăng ký 2-3 ngườ bạn làm guardian khôi phục tài khoản.
///         97. Ví mất truy cập tạo yêu cầu recovery sang ví mới; guardian ký xác nhận.
///         98. Đủ ngưỡng guardian xác nhận -> recovery hoàn tất, hồ sơ ví mới được gắn cờ
///             để các dịch vụ (sắp xếp lại hồ sơ game, badges...) tin cậy.
/// @dev Contract chỉ làm registry xác thực xã hội; tiền gốc vẫn thuộc ví cũ (không thể di chuyển
///      on-chain thuần tuý). Ví cũ có thể tự rút gốc của mình như luật vault.
contract GuardianRecovery is ReentrancyGuard, Ownable {
    uint256 public constant MAX_GUARDIANS = 3;
    uint256 public constant THRESHOLD = 2;

    struct RecoveryRequest {
        address oldWallet;
        address newWallet;
        uint256 approvals;
        bool executed;
    }

    mapping(address => address[]) internal _guardiansOf;
    mapping(address => mapping(address => bool)) public isGuardian; // old -> guardian -> true

    uint256 public requestCount;
    mapping(uint256 => RecoveryRequest) public requests;
    mapping(uint256 => mapping(address => bool)) public approved;
    /// @dev ví cũ -> ví mới đã recovery thành công.
    mapping(address => address) public recoveredTo;
    /// @dev ví mới đã từng là target recovery (chống dùng ví mất luôn).
    mapping(address => bool) public wasRecoveryTarget;

    event GuardiansSet(address indexed wallet, address[] guardians);
    event RecoveryRequested(uint256 indexed requestId, address indexed oldWallet, address indexed newWallet);
    event RecoveryApproved(uint256 indexed requestId, address indexed guardian);
    event RecoveryExecuted(uint256 indexed requestId, address indexed oldWallet, address indexed newWallet);

    error BadGuardian();
    error NotGuardian();
    error NotOldWallet();
    error AlreadyRequested();
    error AlreadyApproved();
    error AlreadyExecuted();
    error AlreadyRecovered();

    /// @notice Vòng đờ guardian: contract không nhận constructor arg, dùng Ownable mặc định.
    constructor() Ownable(msg.sender) {}

    /// @notice Tính năng 96: đặt danh sách guardian (2-3 ví, không trùng ví gốc).
    function setGuardians(address[] memory guardians) external {
        if (guardians.length < THRESHOLD || guardians.length > MAX_GUARDIANS) revert BadGuardian();
        delete _guardiansOf[msg.sender];
        for (uint256 i; i < guardians.length; ++i) {
            address g = guardians[i];
            if (g == address(0) || g == msg.sender || isGuardian[msg.sender][g]) revert BadGuardian();
            isGuardian[msg.sender][g] = true;
            _guardiansOf[msg.sender].push(g);
        }
        emit GuardiansSet(msg.sender, guardians);
    }

    /// @notice Tính năng 97: (ví cũ) tạo yêu cầu recovery sang ví mới.
    function requestRecovery(address newWallet) external returns (uint256 requestId) {
        if (newWallet == address(0) || newWallet == msg.sender) revert BadGuardian();
        if (recoveredTo[msg.sender] != address(0)) revert AlreadyRecovered();
        if (wasRecoveryTarget[newWallet]) revert BadGuardian();
        if (_guardiansOf[msg.sender].length < THRESHOLD) revert BadGuardian();

        requestId = ++requestCount;
        requests[requestId] = RecoveryRequest({oldWallet: msg.sender, newWallet: newWallet, approvals: 0, executed: false});
        emit RecoveryRequested(requestId, msg.sender, newWallet);
    }

    /// @notice Tính năng 98: guardian xác nhận yêu cầu.
    function approve(uint256 requestId) external {
        RecoveryRequest storage r = requests[requestId];
        if (r.oldWallet == address(0) || r.executed) revert AlreadyExecuted();
        if (!isGuardian[r.oldWallet][msg.sender]) revert NotGuardian();
        if (approved[requestId][msg.sender]) revert AlreadyApproved();
        approved[requestId][msg.sender] = true;
        r.approvals += 1;
        emit RecoveryApproved(requestId, msg.sender);
    }

    /// @notice Hoàn tất recovery khi đủ ngưỡng guardian.
    function execute(uint256 requestId) external {
        RecoveryRequest storage r = requests[requestId];
        if (r.oldWallet == address(0) || r.executed) revert AlreadyExecuted();
        if (r.approvals < THRESHOLD) revert NotGuardian();
        r.executed = true;
        recoveredTo[r.oldWallet] = r.newWallet;
        wasRecoveryTarget[r.newWallet] = true;
        emit RecoveryExecuted(requestId, r.oldWallet, r.newWallet);
    }
}
