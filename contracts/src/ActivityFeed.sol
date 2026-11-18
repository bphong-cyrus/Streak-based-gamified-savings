// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ActivityFeed (Tính năng 16)
/// @notice Theo dõi ví: follow/unfollow on-chain + sự kiện hoạt động.
/// @dev Frontend subscribe event; feed tổng hợp từ danh sách đang follow.
contract ActivityFeed {
    mapping(address => mapping(address => bool)) public isFollowing;
    mapping(address => uint256) public followerCount;
    mapping(address => uint256) public followingCount;

    event Followed(address indexed follower, address indexed followed);
    event Unfollowed(address indexed follower, address indexed unfollowed);
    event Activity(address indexed wallet, string kind, uint256 value);

    error SelfFollow();
    error NotFollowing();

    function follow(address wallet) external {
        if (wallet == msg.sender) revert SelfFollow();
        if (isFollowing[msg.sender][wallet]) return;
        isFollowing[msg.sender][wallet] = true;
        followerCount[wallet] += 1;
        followingCount[msg.sender] += 1;
        emit Followed(msg.sender, wallet);
    }

    function unfollow(address wallet) external {
        if (!isFollowing[msg.sender][wallet]) revert NotFollowing();
        isFollowing[msg.sender][wallet] = false;
        followerCount[wallet] -= 1;
        followingCount[msg.sender] -= 1;
        emit Unfollowed(msg.sender, wallet);
    }

    /// @notice Bot/UI log hoạt động (deposit, streak, claim...) để feed hiển thị.
    function logActivity(string calldata kind, uint256 value) external {
        emit Activity(msg.sender, kind, value);
    }
}
