// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Tính năng 35: version tracking cho từng hợp đồng (tra cứu UI/audit).
abstract contract Versioned {
    function version() external pure virtual returns (string memory);
}
