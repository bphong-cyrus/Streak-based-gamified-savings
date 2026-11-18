// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface IPausable {
    function pause() external;
    function unpause() external;
}

/// @title CouncilMultisig (Tính năng 39)
/// @notice Hội đồng 2/3 multisig: 3 thành viên, ít nhất 2 chữ ký để
///         tạm dừng/khôi phục hệ thống trong khủng hoảng.
/// @dev Mỗi hành động cần 2 approvals riêng; thực thi xong phải approve lại.
contract CouncilMultisig is Ownable {
    address[3] public members;
    mapping(bytes32 => mapping(address => bool)) public approvals;
    mapping(bytes32 => bool) public executed;

    event MemberSet(uint256 indexed index, address member);
    event Approved(bytes32 indexed action, address indexed member);
    error NotMember();
    error AlreadyApproved();
    error InsufficientApprovals();

    constructor(address a, address b, address c) Ownable(msg.sender) {
        members = [a, b, c];
    }

    function _isMember(address who) internal view returns (bool) {
        return who == members[0] || who == members[1] || who == members[2];
    }

    function setMember(uint256 index, address who) external onlyOwner {
        require(index < 3, "bad index");
        members[index] = who;
        emit MemberSet(index, who);
    }

    function _approve(bytes32 action) internal {
        if (!_isMember(msg.sender)) revert NotMember();
        if (approvals[action][msg.sender]) revert AlreadyApproved();
        approvals[action][msg.sender] = true;
        emit Approved(action, msg.sender);
    }

    function _approvedCount(bytes32 action) internal view returns (uint256 n) {
        for (uint256 i; i < 3; ++i) {
            if (approvals[action][members[i]]) ++n;
        }
    }

    /// @notice Thành viên phê duyệt pause một hợp đồng.
    function approvePause(address target) external returns (bytes32 action) {
        action = keccak256(abi.encode("pause", target));
        _approve(action);
    }

    /// @notice Thực thi pause khi đủ 2/3.
    function executePause(address target) external {
        bytes32 action = keccak256(abi.encode("pause", target));
        if (_approvedCount(action) < 2) revert InsufficientApprovals();
        executed[action] = true;
        IPausable(target).pause();
    }

    function approveUnpause(address target) external returns (bytes32 action) {
        action = keccak256(abi.encode("unpause", target));
        _approve(action);
    }

    function executeUnpause(address target) external {
        bytes32 action = keccak256(abi.encode("unpause", target));
        if (_approvedCount(action) < 2) revert InsufficientApprovals();
        executed[action] = true;
        IPausable(target).unpause();
    }
}
