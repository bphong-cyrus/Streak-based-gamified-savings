// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Hook tính hệ số nhân trọng số streak (boost). Trả về bps, 10_000 = 1x.
/// @dev Nhóm C - Tính năng 26: hệ thống boost multiplier mở cho nhiều nguồn
///      (voucher, hạng, sự kiện). Vault gọi ở _settleWallet nếu đã gắn.
interface IBoostProvider {
    function weightMultiplier(address wallet, uint256 epoch) external view returns (uint256 bps);
}
