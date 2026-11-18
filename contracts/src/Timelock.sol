// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Timelock (Tính năng 40)
/// @notice Khóa thờ gian: thay đổi tham số nhạy cảm phải chờ `delay` mới thực thi.
contract Timelock is Ownable {
    uint256 public delay;
    mapping(bytes32 => uint256) public etaOf;

    event Queued(bytes32 indexed action, uint256 eta);
    error TooEarly(uint256 eta);
    error NotQueued();

    constructor(uint256 delay_) Ownable(msg.sender) {
        delay = delay_;
    }

    function setDelay(uint256 newDelay) external onlyOwner {
        delay = newDelay;
    }

    function _action(address target, bytes memory data) internal pure returns (bytes32) {
        return keccak256(abi.encode(target, data));
    }

    /// @notice Xếp lịch một lệnh gọi tới target.
    function queue(address target, bytes calldata data) external onlyOwner returns (bytes32 action, uint256 eta) {
        action = _action(target, data);
        eta = block.timestamp + delay;
        etaOf[action] = eta;
        emit Queued(action, eta);
    }

    /// @notice Thực thi sau khi đã qua delay.
    function execute(address target, bytes calldata data) external onlyOwner {
        bytes32 action = _action(target, data);
        uint256 eta = etaOf[action];
        if (eta == 0) revert NotQueued();
        if (block.timestamp < eta) revert TooEarly(eta);
        etaOf[action] = 0;
        (bool ok,) = target.call(data);
        require(ok, "execute failed");
    }

    function cancel(address target, bytes calldata data) external onlyOwner {
        etaOf[_action(target, data)] = 0;
    }
}
