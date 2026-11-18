// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title SavingCircle (Tính năng 54 + 55 + 56)
/// @notice 54. Hụi điện tử (ROSCA): nhóm 3-12 ngườ, mỗi kỳ mọi ngườ góp cố định,
///         một thành viên nhận pool theo lượt.
///         55. Kỷ luật đóng hụi: ai đóng muộn (kỳ chốt rồi mới đóng) trả phí trễ,
///             ai không đóng mất lượt nhận vòng đó.
///         56. Vòng tự tái lập: hết vòng, nhóm tự chuyển lượt về đầu chơi vòng mới.
/// @dev Vòng r thuộc kỳ startEpoch + r; mỗi vòng đúng 1 lần nhận (payout idempotence).
contract SavingCircle is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_MEMBERS = 12;
    uint256 public constant LATE_FEE_BPS = 1_000; // 10% phí đóng muộn cho ngườ nhận vòng
    uint256 public constant BPS = 10_000;

    struct Circle {
        uint256 id;
        string name;
        uint256 commitAmount; // mỗi thành viên mỗi vòng
        uint256 startEpoch; // vòng 0 thuộc kỳ này
        address[] members;
        uint256 nextPayoutRound; // vòng kế tiếp cần giải ngân
        bool active;
    }

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    uint256 public circleCount;
    mapping(uint256 => Circle) internal _circles;
    mapping(uint256 => mapping(uint256 => uint256)) public potOf; // circleId -> round -> tổng đã đóng
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public contributed; // circle -> round -> member
    mapping(uint256 => mapping(uint256 => bool)) public paidOut; // circle -> round đã giải ngân

    event CircleCreated(uint256 indexed circleId, string name, uint256 commitAmount, uint256 startEpoch);
    event MemberJoined(uint256 indexed circleId, address indexed member);
    event Contributed(uint256 indexed circleId, uint256 indexed round, address indexed member, uint256 amount, bool late);
    event RoundPaidOut(uint256 indexed circleId, uint256 indexed round, address indexed receiver, uint256 amount);
    event CircleClosed(uint256 indexed circleId);

    error BadCircle();
    error NotMember();
    error AlreadyJoined();
    error CircleFull();
    error NotStarted();
    error AlreadyContributed();
    error WrongAmount();
    error RoundNotEnded();
    error RoundNotStarted();
    error AlreadyPaidOut();

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    /// @notice Tính năng 54: tạo hụi, ngườ tạo là thành viên đầu tiên.
    function createCircle(string memory name, uint256 commitAmount, uint256 startEpoch) external returns (uint256 circleId) {
        if (!vault.hasStarted()) revert NotStarted();
        if (commitAmount == 0 || startEpoch < vault.currentEpoch()) revert BadCircle();
        circleId = ++circleCount;
        Circle storage c = _circles[circleId];
        c.id = circleId;
        c.name = name;
        c.commitAmount = commitAmount;
        c.startEpoch = startEpoch;
        c.members.push(msg.sender);
        c.active = true;
        emit CircleCreated(circleId, name, commitAmount, startEpoch);
        emit MemberJoined(circleId, msg.sender);
    }

    function joinCircle(uint256 circleId) external {
        Circle storage c = _circles[circleId];
        if (!c.active || c.id == 0) revert BadCircle();
        if (c.members.length >= MAX_MEMBERS) revert CircleFull();
        for (uint256 i; i < c.members.length; ++i) {
            if (c.members[i] == msg.sender) revert AlreadyJoined();
        }
        c.members.push(msg.sender);
        emit MemberJoined(circleId, msg.sender);
    }

    /// @notice Đóng phần của mình cho vòng đang chờ giải ngân. Đóng trong kỳ của vòng -> đúng hạn.
    /// @dev Tính năng 55: đóng muộn (sau khi kỳ vòng đã kết thúc nhưng trước payout)
    ///      vẫn được nhận nhưng trả thêm LATE_FEE_BPS cho ngườ nhận vòng.
    function contribute(uint256 circleId) external nonReentrant {
        Circle storage c = _circles[circleId];
        if (!c.active) revert BadCircle();
        uint256 round = c.nextPayoutRound;
        if (block.timestamp < vault.epochStart(c.startEpoch + round)) revert RoundNotStarted();
        if (!_isMember(c, msg.sender)) revert NotMember();
        if (contributed[circleId][round][msg.sender]) revert AlreadyContributed();

        bool late = block.timestamp >= vault.epochEnd(c.startEpoch + round);
        uint256 fee = late ? (c.commitAmount * LATE_FEE_BPS) / BPS : 0;
        token.safeTransferFrom(msg.sender, address(this), c.commitAmount + fee);

        contributed[circleId][round][msg.sender] = true;
        potOf[circleId][round] += c.commitAmount + fee;
        emit Contributed(circleId, round, msg.sender, c.commitAmount, late);
    }

    /// @notice Giải ngân vòng: chuyển pool cho thành viên theo lượt (round % members.length).
    /// @dev Tính năng 55: ai không đóng không được hoàn — phần họ mất luôn khỏi vòng.
    ///      Tính năng 56: khi giải ngân vòng cuối, nextPayoutRound về 0 = vòng mới.
    function payout(uint256 circleId) external nonReentrant {
        Circle storage c = _circles[circleId];
        if (!c.active) revert BadCircle();
        uint256 round = c.nextPayoutRound;
        uint256 roundEpoch = c.startEpoch + round;
        if (block.timestamp < vault.epochEnd(roundEpoch)) revert RoundNotEnded();
        if (paidOut[circleId][round]) revert AlreadyPaidOut();

        paidOut[circleId][round] = true;
        address receiver = c.members[round % c.members.length];
        uint256 amount = potOf[circleId][round];
        if (round + 1 >= c.members.length) {
            c.nextPayoutRound = 0; // Tính năng 56: tái lập vòng
            c.startEpoch = roundEpoch + 1;
        } else {
            c.nextPayoutRound = round + 1;
        }
        if (amount > 0) token.safeTransfer(receiver, amount);
        emit RoundPaidOut(circleId, round, receiver, amount);
    }

    function closeCircle(uint256 circleId) external {
        Circle storage c = _circles[circleId];
        if (msg.sender != owner() && !_isMember(c, msg.sender)) revert NotMember();
        c.active = false;
        emit CircleClosed(circleId);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function _currentRound(Circle storage c) internal view returns (uint256) {
        uint256 epoch = vault.currentEpoch();
        if (epoch < c.startEpoch) revert RoundNotStarted();
        return epoch - c.startEpoch;
    }

    function _isMember(Circle storage c, address who) internal view returns (bool) {
        for (uint256 i; i < c.members.length; ++i) {
            if (c.members[i] == who) return true;
        }
        return false;
    }

    function getCircle(uint256 circleId)
        external
        view
        returns (uint256 id, string memory name, uint256 commitAmount, uint256 startEpoch, address[] memory members, uint256 nextPayoutRound, bool active)
    {
        Circle storage c = _circles[circleId];
        return (c.id, c.name, c.commitAmount, c.startEpoch, c.members, c.nextPayoutRound, c.active);
    }
}
