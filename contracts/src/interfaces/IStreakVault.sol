// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Kiểu dữ liệu và interface của StreakVault dùng chung cho distributor, mock source và frontend.
interface IStreakVault {
    /// @notice Dữ liệu tài khoản trả về cho dashboard.
    /// @dev Mọi số tiền tính theo đơn vị nhỏ nhất của token (mUSDC 6 decimals).
    struct AccountView {
        uint256 principal; // Số dư gốc hiện tại của ví
        uint256 currentTarget; // Mục tiêu có hiệu lực trong kỳ hiện tại (0 nếu chưa có)
        uint256 pendingTarget; // Mục tiêu sẽ áp dụng từ kỳ kế tiếp (0 nếu không có thay đổi chờ)
        uint256 pendingTargetEpoch; // Kỳ bắt đầu áp dụng pendingTarget (0 nếu không có)
        uint256 streak; // Streak tính đến kỳ đã chốt gần nhất
        bool activated; // Ví đã đặt mục tiêu lần đầu chưa
        uint256 activationEpoch; // Kỳ ví kích hoạt mục tiêu
        uint256 currentEpoch; // Kỳ hiện tại theo block.timestamp
        uint256 currentDeposited; // Tổng gửi trong kỳ hiện tại
        uint256 currentWithdrawn; // Tổng rút gốc trong kỳ hiện tại
        uint256 currentProgress; // max(0, gửi - rút) trong kỳ hiện tại
        uint256 depositCount; // Tổng số lần gửi qua vault (mọi kỳ)
    }

    /// @notice Trạng thái của một ví trong một kỳ.
    struct EpochStatus {
        uint256 target; // Mục tiêu có hiệu lực ở kỳ đó
        uint256 deposited; // Tổng gửi trong kỳ
        uint256 withdrawn; // Tổng rút gốc trong kỳ
        uint256 progress; // max(0, deposited - withdrawn)
        bool settled; // Kỳ đã được chốt cho ví này
        bool qualified; // Đạt mục tiêu lúc chốt
        uint256 streakAtSettle; // Streak (= weight) sau khi chốt kỳ
    }

    event TargetScheduled(address indexed wallet, uint256 amount, uint256 indexed effectiveEpoch);
    event Deposited(address indexed wallet, uint256 indexed epoch, uint256 amount, uint256 newPrincipal);
    event Withdrawn(address indexed wallet, uint256 indexed epoch, uint256 amount, uint256 newPrincipal);
    event AccountEpochSettled(address indexed wallet, uint256 indexed epoch, bool qualified, uint256 streak);
    event DistributorSet(address indexed distributor);
    event DepositedFor(address indexed operator, address indexed wallet, uint256 indexed epoch, uint256 amount);
    event Frozen(address indexed wallet, uint256 indexed epoch, uint256 fee);
    event Insured(address indexed wallet, uint256 indexed epoch, uint256 premium);
    event Revived(address indexed wallet, uint256 indexed failedEpoch, uint256 restoredStreak, uint256 fee);
    event WithdrawFeeCharged(address indexed wallet, uint256 amount, uint256 fee);
    event EmergencyWithdrawn(address indexed wallet, uint256 principal, uint256 penalty);
    event TreasurySet(address indexed treasury);

    error ZeroAmount();
    error ZeroAddress();
    error NotStarted();
    error InsufficientPrincipal(uint256 requested, uint256 available);
    error MaxParticipantsReached();
    error NotDistributor();
    error NotInitializer();
    error DistributorAlreadySet();
    error EpochNotEnded(uint256 epoch, uint256 endsAt);
    error EpochOutOfOrder(uint256 expected, uint256 got);
    error DepositBelowMinimum(uint256 amount, uint256 minDeposit);
    error DepositOverEpochLimit(uint256 amount, uint256 limit);
    error NotActivated();
    error AlreadyFrozen(uint256 epoch);
    error AlreadyInsured(uint256 epoch);
    error NothingToRevive();
    error ReviveWindowClosed(uint256 failedEpoch, uint256 deadlineEpoch);

    function startAt() external view returns (uint256);
    function epochDuration() external view returns (uint256);
    function hasStarted() external view returns (bool);
    function currentEpoch() external view returns (uint256);
    function epochStart(uint256 epoch) external view returns (uint256);
    function epochEnd(uint256 epoch) external view returns (uint256);

    function setWeeklyTarget(uint256 amount) external;
    function setWeeklyTargetFor(address wallet, uint256 amount) external;
    function deposit(uint256 amount) external;
    function depositFor(address wallet, uint256 amount) external;
    function withdraw(uint256 amount) external;
    function emergencyWithdraw() external;

    function freezeCurrentEpoch() external;
    function insureCurrentEpoch() external;
    function revive() external;

    function getAccount(address wallet) external view returns (AccountView memory);
    function getEpochStatus(address wallet, uint256 epoch) external view returns (EpochStatus memory);
    function targetAt(address wallet, uint256 epoch) external view returns (uint256);
    function getParticipants() external view returns (address[] memory);
    function totalPrincipal() external view returns (uint256);
    function nextEpochToSettle() external view returns (uint256);
    function token() external view returns (IERC20);
    function lastFailedEpoch(address wallet) external view returns (uint256);
    function streakBeforeFail(address wallet) external view returns (uint256);
    function depositCount(address wallet) external view returns (uint256);
    function frozenUntilEpoch(address wallet) external view returns (uint256);
    function hasInsurance(address wallet) external view returns (bool);
    function freezeFee() external view returns (uint256);
    function insurancePremium() external view returns (uint256);
    function freezeFor(address wallet) external;
    function insureFor(address wallet) external;

    /// @notice Chỉ distributor gọi. Chốt streak cho mọi ví đã kích hoạt tại `epoch`.
    /// @return wallets Danh sách ví được xét
    /// @return weights Trọng số tương ứng (= streak nếu đạt/giữ, 0 nếu không)
    /// @return principals Gốc của ví tại thởi điểm chốt (dùng cho lãi cơ bản)
    /// @return totalWeight Tổng trọng số
    function settleEpoch(uint256 epoch)
        external
        returns (address[] memory wallets, uint256[] memory weights, uint256[] memory principals, uint256 totalWeight);
}
