// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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

    function startAt() external view returns (uint256);
    function epochDuration() external view returns (uint256);
    function hasStarted() external view returns (bool);
    function currentEpoch() external view returns (uint256);
    function epochStart(uint256 epoch) external view returns (uint256);
    function epochEnd(uint256 epoch) external view returns (uint256);

    function setWeeklyTarget(uint256 amount) external;
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;

    function getAccount(address wallet) external view returns (AccountView memory);
    function getEpochStatus(address wallet, uint256 epoch) external view returns (EpochStatus memory);
    function targetAt(address wallet, uint256 epoch) external view returns (uint256);
    function getParticipants() external view returns (address[] memory);
    function totalPrincipal() external view returns (uint256);

    /// @notice Chỉ distributor gọi. Chốt streak cho mọi ví đã kích hoạt tại `epoch`.
    /// @return wallets Danh sách ví được xét
    /// @return weights Trọng số tương ứng (= streak nếu đạt, 0 nếu không)
    /// @return totalWeight Tổng trọng số
    function settleEpoch(uint256 epoch)
        external
        returns (address[] memory wallets, uint256[] memory weights, uint256 totalWeight);
}
