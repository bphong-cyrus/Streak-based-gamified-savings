// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title YieldRouter (Tính năng 42 + 47)
/// @notice 42. Điều phối yield: so sánh APY các pool (mock lending) và đề xuất nguồn tối ưu.
///         47. APY oracle: lưu trữ APY các nguồn cho frontend/hợp đồng khác đọc.
/// @dev Chỉ là router/oracle view — không giữ tiền.
contract YieldRouter is Ownable {
    struct Source {
        address pool;
        uint256 apyBps;
        bool active;
        string name;
    }

    IERC20 public immutable token;
    Source[] public sources;

    event SourceAdded(address indexed pool, string name, uint256 apyBps);
    event SourceUpdated(address indexed pool, uint256 apyBps, bool active);

    error NotFound();

    constructor(IERC20 token_) Ownable(msg.sender) {
        token = token_;
    }

    function addSource(address pool, string calldata name, uint256 apyBps) external onlyOwner {
        sources.push(Source({pool: pool, apyBps: apyBps, active: true, name: name}));
        emit SourceAdded(pool, name, apyBps);
    }

    function updateSource(uint256 index, uint256 apyBps, bool active) external onlyOwner {
        if (index >= sources.length) revert NotFound();
        sources[index].apyBps = apyBps;
        sources[index].active = active;
        emit SourceUpdated(sources[index].pool, apyBps, active);
    }

    /// @notice Tính năng 42: nguồn tối ưu hiện tại (APY cao nhất còn hoạt động).
    function bestSource() external view returns (address pool, uint256 apyBps, string memory name) {
        uint256 best;
        for (uint256 i; i < sources.length; ++i) {
            if (sources[i].active && sources[i].apyBps > best) {
                best = sources[i].apyBps;
                pool = sources[i].pool;
                name = sources[i].name;
            }
        }
        apyBps = best;
    }

    /// @notice Tính năng 47: APY oracle view cho frontend.
    function apyOf(address pool) external view returns (uint256 apyBps, bool active) {
        for (uint256 i; i < sources.length; ++i) {
            if (sources[i].pool == pool) return (sources[i].apyBps, sources[i].active);
        }
        revert NotFound();
    }

    function sourceCount() external view returns (uint256) {
        return sources.length;
    }
}
