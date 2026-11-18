// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title YieldSmoother (Tính năng 46)
/// @notice Trải đều yield biến động: nhận yield thật không đều, trả cho vault một
///         khoản đều đặn mỗi kỳ (trung bình trượt N kỳ), giữ phần chênh làm dự phòng.
/// @dev Demo: yield vào `depositSurplus`, `releaseToSource` gửi trung bình vào MockYieldSource.
contract YieldSmoother is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant WINDOW = 4; // trung bình trượt 4 kỳ

    IERC20 public immutable token;
    address public immutable yieldSource; // MockYieldSource

    uint256 public surplus;
    uint256[WINDOW] public history; // vòng tròn
    uint256 public historyIndex;
    uint256 public releasedTotal;

    event SurplusDeposited(uint256 amount, uint256 newSurplus);
    event SmoothedRelease(uint256 epoch, uint256 amount);

    constructor(IERC20 token_, address yieldSource_) Ownable(msg.sender) {
        token = token_;
        yieldSource = yieldSource_;
        token.approve(yieldSource_, type(uint256).max);
    }

    function depositSurplus(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        surplus += amount;
        emit SurplusDeposited(amount, surplus);
    }

    /// @notice Khoản đều đặn = trung bình WINDOW kỳ gần nhất của tổng surplus còn lại / WINDOW.
    function smoothedAmount() public view returns (uint256) {
        return surplus / WINDOW;
    }

    /// @notice Bot gọi mỗi kỳ: chuyển khoản đều vào MockYieldSource.fundEpoch.
    function release(uint256 epoch, uint256 amount) external {
        require(amount <= surplus, "amount>surplus");
        surplus -= amount;
        history[historyIndex % WINDOW] = amount;
        historyIndex += 1;
        releasedTotal += amount;
        // Gọi fundEpoch trên mock source (phải trước khi kỳ kết thúc)
        (bool ok,) = yieldSource.call(abi.encodeWithSignature("fundEpoch(uint256,uint256)", epoch, amount));
        require(ok, "fundEpoch failed");
        emit SmoothedRelease(epoch, amount);
    }
}
