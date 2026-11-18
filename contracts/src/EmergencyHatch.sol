// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title EmergencyHatch (Tính năng 105 + 106 + 107)
/// @notice 105. Rút khẩn có trễ: mọi lệnh rút từ hũ hatch phải chờ `delay` mới nhận được tiền.
///         106. Huỷ lệnh trong thờ gian chờ, nhận lại ngay không mất phí.
///         107. Báo động on-chain: event cảnh báo guardian/anh em nhóm khi có lệnh rút khẩn.
/// @dev Ví dùng như ví phụ "chống xúc động": nạp vào hatch, rút phải chờ.
contract EmergencyHatch is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct WithdrawalRequest {
        uint256 id;
        address owner;
        uint256 amount;
        uint256 executableAt;
        bool executed;
        bool cancelled;
    }

    IERC20 public immutable token;

    uint256 public delay = 24 hours;
    uint256 public requestCount;
    mapping(uint256 => WithdrawalRequest) public requests;
    mapping(address => uint256) public balanceOf;

    event Deposited(address indexed wallet, uint256 amount);
    event WithdrawalRequested(uint256 indexed id, address indexed wallet, uint256 amount, uint256 executableAt);
    event WithdrawalExecuted(uint256 indexed id, address indexed wallet, uint256 amount);
    event WithdrawalCancelled(uint256 indexed id, address indexed wallet, uint256 amount);
    /// @dev Tính năng 107: off-chain watcher (GroupAlerts) bắt event này để báo guardian.
    event EmergencyAlert(address indexed wallet, uint256 indexed requestId, uint256 amount);

    error BadAmount();
    error NotOwner();
    error NotExecutable();
    error AlreadyDone();

    constructor(IERC20 token_) Ownable(msg.sender) {
        token = token_;
    }

    function setDelay(uint256 d) external onlyOwner {
        delay = d;
    }

    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert BadAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        balanceOf[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Tính năng 105: yêu cầu rút, tiền giữ lại trong hatch tới `executableAt`.
    function requestWithdrawal(uint256 amount) external returns (uint256 requestId) {
        if (amount == 0 || balanceOf[msg.sender] < amount) revert BadAmount();
        balanceOf[msg.sender] -= amount;
        requestId = ++requestCount;
        requests[requestId] = WithdrawalRequest({
            id: requestId,
            owner: msg.sender,
            amount: amount,
            executableAt: block.timestamp + delay,
            executed: false,
            cancelled: false
        });
        emit WithdrawalRequested(requestId, msg.sender, amount, block.timestamp + delay);
        emit EmergencyAlert(msg.sender, requestId, amount);
    }

    function executeWithdrawal(uint256 requestId) external nonReentrant {
        WithdrawalRequest storage r = requests[requestId];
        if (r.id == 0 || r.executed || r.cancelled) revert AlreadyDone();
        if (r.owner != msg.sender) revert NotOwner();
        if (block.timestamp < r.executableAt) revert NotExecutable();
        r.executed = true;
        token.safeTransfer(msg.sender, r.amount);
        emit WithdrawalExecuted(requestId, msg.sender, r.amount);
    }

    /// @notice Tính năng 106: huỷ lệnh rút, tiền quay lại số dư hatch.
    function cancelWithdrawal(uint256 requestId) external {
        WithdrawalRequest storage r = requests[requestId];
        if (r.id == 0 || r.executed || r.cancelled) revert AlreadyDone();
        if (r.owner != msg.sender) revert NotOwner();
        r.cancelled = true;
        balanceOf[msg.sender] += r.amount;
        emit WithdrawalCancelled(requestId, msg.sender, r.amount);
    }
}
