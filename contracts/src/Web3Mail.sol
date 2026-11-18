// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Web3Mail (Tính năng 63 + 64 + 65)
/// @notice 63. Hộp thư on-chain giữa các ví: gửi/nhận/dọc tin nhắn không cần server.
///         64. Gửi kèm tip nhỏ (mUSDC) — ngườ nhận nhận tiền cùng tin nhắn.
///         65. Tin nhắn có thể gắn nhóm/topic để lọc feed trong app.
/// @dev Lưu nội dung ngắn (<= 280 ký tự) on-chain cho demo; tip chuyển thẳng cho ngườ nhận.
contract Web3Mail is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_LEN = 280;

    struct Mail {
        uint256 id;
        address from;
        address to;
        uint256 at;
        uint256 tip; // mUSDC kèm tin nhắn
        string topic; // vd "group:1", "mentor", ""
        string body;
    }

    IERC20 public immutable token;

    uint256 public mailCount;
    mapping(uint256 => Mail) internal _mails;
    mapping(address => uint256) public inboxSize;

    event MailSent(uint256 indexed id, address indexed from, address indexed to, uint256 tip, string topic);
    error EmptyMail();
    error BadRecipient();

    constructor(IERC20 token_) Ownable(msg.sender) {
        token = token_;
    }

    /// @notice Tính năng 63 + 64: gửi thư, kèm tip tùy chọn (tip chuyển ngay cho ngườ nhận).
    function send(address to, string memory topic, string memory body, uint256 tipAmount) external nonReentrant {
        if (to == address(0) || to == msg.sender) revert BadRecipient();
        if (bytes(body).length == 0 || bytes(body).length > MAX_LEN) revert EmptyMail();

        if (tipAmount > 0) token.safeTransferFrom(msg.sender, to, tipAmount);

        mailCount += 1;
        _mails[mailCount] = Mail({id: mailCount, from: msg.sender, to: to, at: block.timestamp, tip: tipAmount, topic: topic, body: body});
        inboxSize[to] += 1;
        emit MailSent(mailCount, msg.sender, to, tipAmount, topic);
    }

    /// @notice Đọc một thư theo id.
    function getMail(uint256 id) external view returns (Mail memory) {
        return _mails[id];
    }

    /// @notice Tính năng 65: lấy hộp thư theo page; filterTopic = "" lấy tất cả.
    function inbox(address to, uint256 offset, uint256 limit, string memory filterTopic)
        external
        view
        returns (Mail[] memory out)
    {
        uint256 total = inboxSize[to];
        uint256 matched;
        // Đếm trước để cấp mảng (hộp thư demo giới hạn nhỏ).
        for (uint256 id = mailCount; id > 0 && matched < offset + limit; --id) {
            Mail storage m = _mails[id];
            if (m.to != to) continue;
            if (bytes(filterTopic).length > 0 && !_topicEq(m.topic, filterTopic)) continue;
            ++matched;
        }
        uint256 end = matched > offset ? matched - offset : 0;
        uint256 start = end > limit ? end - limit : 0;
        out = new Mail[](end - start);
        uint256 seen;
        uint256 written;
        for (uint256 id = mailCount; id > 0 && written < out.length; --id) {
            Mail storage m = _mails[id];
            if (m.to != to) continue;
            if (bytes(filterTopic).length > 0 && !_topicEq(m.topic, filterTopic)) continue;
            if (seen >= start && seen < end) {
                out[written] = m;
                ++written;
            }
            ++seen;
        }
    }

    function _topicEq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
