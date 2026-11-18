// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title PaycheckSplitter (Tính năng 75 + 76 + 77)
/// @notice 75. Chia khoản thu nhập theo tỷ lệ: một phần gửi vault, phần còn lại chuyển ví/tài khoản khác.
///         76. Lịch chia theo kỳ: mỗi kỳ chỉ cần gọi execute() một lần, tự tính tỷ lệ đang hiệu lực.
///         77. Đổi tỷ lệ có hiệu lực từ kỳ kế tiếp (checkpoint theo kỳ như mục tiêu vault).
/// @dev Đích "vault" = gửi vào StreakVault cho chính ngườ chơi; đích "wallet" = chuyển token thẳng.
contract PaycheckSplitter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_DEST = 5;

    struct Dest {
        address to;
        uint256 bps;
        bool toVault; // true = depositFor vào vault (to bị bỏ qua)
    }

    struct SplitPlan {
        Dest[] dests;
        uint256 effectiveEpoch;
    }

    IStreakVault public immutable vault;
    IERC20 public immutable token;

    mapping(address => SplitPlan[]) internal _plans;

    event SplitExecuted(address indexed wallet, uint256 indexed epoch, uint256 amount);
    event PlanScheduled(address indexed wallet, uint256 effectiveEpoch);

    error BadPlan();
    error NoPlan();

    constructor(IStreakVault vault_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        token = token_;
    }

    /// @notice Tính năng 77: đặt lịch chia mới, có hiệu lực từ kỳ kế tiếp.
    /// @dev Gọi lại trong cùng kỳ ghi đè lần cuối (khớp luật đổi mục tiêu của vault).
    function setPlan(Dest[] calldata dests) external {
        require(vault.hasStarted(), "not started");
        require(dests.length > 0 && dests.length <= MAX_DEST, "bad plan");
        uint256 totalBps;
        for (uint256 i; i < dests.length; ++i) {
            if (!dests[i].toVault && dests[i].to == address(0)) revert BadPlan();
            totalBps += dests[i].bps;
        }
        if (totalBps > BPS) revert BadPlan();

        uint256 epoch = vault.currentEpoch();
        SplitPlan[] storage plans = _plans[msg.sender];
        if (plans.length > 0 && plans[plans.length - 1].effectiveEpoch == epoch + 1) {
            delete plans[plans.length - 1].dests; // ghi đè lần cuối trong cùng kỳ
            for (uint256 i; i < dests.length; ++i) plans[plans.length - 1].dests.push(dests[i]);
        } else {
            plans.push();
            SplitPlan storage p = plans[plans.length - 1];
            p.effectiveEpoch = epoch + 1;
            for (uint256 i; i < dests.length; ++i) p.dests.push(dests[i]);
        }
        emit PlanScheduled(msg.sender, epoch + 1);
    }

    /// @notice Tính năng 75 + 76: thực hiện chia `amount` theo plan đang hiệu lực cho kỳ hiện tại.
    function execute(uint256 amount) external nonReentrant {
        Dest[] memory dests = _activePlan(msg.sender);
        if (dests.length == 0) revert NoPlan();

        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 remainder = amount;
        for (uint256 i; i < dests.length; ++i) {
            uint256 part = (amount * dests[i].bps) / BPS;
            if (i == dests.length - 1) part = remainder; // tránh làm tròn rò rỉ
            remainder -= part;
            if (part == 0) continue;
            if (dests[i].toVault) {
                token.approve(address(vault), part);
                vault.depositFor(msg.sender, part);
            } else {
                token.safeTransfer(dests[i].to, part);
            }
        }
        emit SplitExecuted(msg.sender, vault.hasStarted() ? vault.currentEpoch() : 0, amount);
    }

    function _activePlan(address wallet) internal view returns (Dest[] memory) {
        SplitPlan[] storage plans = _plans[wallet];
        if (plans.length == 0) return new Dest[](0);
        uint256 epoch = vault.hasStarted() ? vault.currentEpoch() : 0;
        for (uint256 i = plans.length; i > 0; --i) {
            if (plans[i - 1].effectiveEpoch <= epoch) return plans[i - 1].dests;
        }
        return new Dest[](0);
    }

    function planCount(address wallet) external view returns (uint256) {
        return _plans[wallet].length;
    }

    function getPlan(address wallet, uint256 idx)
        external
        view
        returns (Dest[] memory dests, uint256 effectiveEpoch)
    {
        SplitPlan storage p = _plans[wallet][idx];
        return (p.dests, p.effectiveEpoch);
    }
}
