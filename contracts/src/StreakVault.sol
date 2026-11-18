// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title StreakVault
/// @notice Giữ gốc của người dùng, lưu mục tiêu theo kỳ, tiền gửi/rút từng kỳ, streak,
///         và các tiện ích: freeze/revive/bảo hiểm streak, phí rút, giới hạn gửi, pause.
/// @dev Epoch e chiếm khoảng [startAt + e*epochDuration, startAt + (e+1)*epochDuration).
///      Mặc định mọi phí/giới hạn bằng 0 để tương thích ngược với bản MVP.
contract StreakVault is IStreakVault, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_PARTICIPANTS = 20;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    /// @notice Số kỳ tối đa sau kỳ thất bại để gọi revive.
    uint256 public constant REVIVE_WINDOW = 2;
    /// @notice Phí mặc định cho freeze/revive/bảo hiểm (owner có thể đổi).
    uint256 public freezeFee = 0.2 * 1e6;
    uint256 public reviveFee = 0.5 * 1e6;
    uint256 public insurancePremium = 0.3 * 1e6;

    IERC20 public immutable token;
    uint256 public immutable override startAt;
    uint256 public immutable override epochDuration;
    address public immutable initializer;

    address public distributor;
    address public treasury;
    uint256 public override totalPrincipal;
    /// @notice Kỳ kế tiếp cần chốt (phòng thủ thêm, distributor cũng kiểm tra thứ tự).
    uint256 public nextEpochToSettle;

    uint256 public minDeposit; // 0 = không giới hạn dưới
    uint256 public maxDepositPerEpoch; // 0 = không giới hạn trên
    uint256 public withdrawFeeBps; // Phí rút thường (về treasury)
    uint256 public emergencyPenaltyBps; // Phạt rút khẩn cấp

    struct TargetCheckpoint {
        uint64 fromEpoch;
        uint192 amount;
    }

    struct Account {
        uint256 principal;
        uint256 streak;
        uint256 activationEpoch;
        uint256 depositCount;
        bool activated;
    }

    struct EpochFlow {
        uint256 deposited;
        uint256 withdrawn;
    }

    struct EpochResult {
        bool settled;
        bool qualified;
        uint64 streak; // đóng gói cùng 2 bool trong 1 slot để giảm gas chốt kỳ
    }

    address[] internal _participants;
    mapping(address => Account) internal _accounts;
    mapping(address => TargetCheckpoint[]) internal _targets;
    mapping(address => mapping(uint256 => EpochFlow)) internal _flows;
    mapping(address => mapping(uint256 => EpochResult)) internal _results;

    // ---------------- streak bảo vệ ----------------
    mapping(address => uint256) public override frozenUntilEpoch; // kỳ cuối freeze còn hiệu lực
    mapping(address => bool) public override hasInsurance; // bảo hiểm cho kỳ hiện tại
    mapping(address => uint256) internal _insuredEpoch;
    mapping(address => uint256) internal _streakBeforeFail; // streak trước khi bị reset
    mapping(address => uint256) internal _lastFailedEpoch; // kỳ gần nhất chốt thất bại + 1 (0 = chưa từng)
    mapping(address => uint256) internal _revivedAtEpoch; // kỳ thất bại đã revive (tránh revive trùng)

    modifier onlyDistributor() {
        if (msg.sender != distributor) revert NotDistributor();
        _;
    }

    constructor(IERC20 token_, uint256 startAt_, uint256 epochDuration_)
        Ownable(msg.sender)
    {
        if (address(token_) == address(0)) revert ZeroAddress();
        if (epochDuration_ == 0) revert ZeroAmount();
        token = token_;
        startAt = startAt_;
        epochDuration = epochDuration_;
        initializer = msg.sender;
    }

    /// @notice Gắn distributor đúng một lần, chỉ deployer gọi.
    function setDistributor(address distributor_) external {
        if (msg.sender != initializer) revert NotInitializer();
        if (distributor != address(0)) revert DistributorAlreadySet();
        if (distributor_ == address(0)) revert ZeroAddress();
        distributor = distributor_;
        emit DistributorSet(distributor_);
    }

    // ---------------------------------------------------------------------
    // Admin config (owner)
    // ---------------------------------------------------------------------

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    function setMinDeposit(uint256 amount) external onlyOwner {
        minDeposit = amount;
    }

    function setMaxDepositPerEpoch(uint256 amount) external onlyOwner {
        maxDepositPerEpoch = amount;
    }

    function setWithdrawFeeBps(uint256 bps) external onlyOwner {
        require(bps <= BPS_DENOMINATOR, "fee>100%");
        withdrawFeeBps = bps;
    }

    function setEmergencyPenaltyBps(uint256 bps) external onlyOwner {
        require(bps <= BPS_DENOMINATOR, "penalty>100%");
        emergencyPenaltyBps = bps;
    }

    function setProtectionFees(uint256 freezeFee_, uint256 reviveFee_, uint256 premium_) external onlyOwner {
        freezeFee = freezeFee_;
        reviveFee = reviveFee_;
        insurancePremium = premium_;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Epoch helpers
    // ---------------------------------------------------------------------

    function hasStarted() public view override returns (bool) {
        return block.timestamp >= startAt;
    }

    /// @notice Kỳ hiện tại. Trả về 0 trước `startAt`; frontend dùng `hasStarted()` để phân biệt.
    function currentEpoch() public view override returns (uint256) {
        if (block.timestamp < startAt) return 0;
        return (block.timestamp - startAt) / epochDuration;
    }

    function epochStart(uint256 epoch) public view override returns (uint256) {
        return startAt + epoch * epochDuration;
    }

    function epochEnd(uint256 epoch) public view override returns (uint256) {
        return startAt + (epoch + 1) * epochDuration;
    }

    function _requireStartedEpoch() internal view returns (uint256) {
        if (block.timestamp < startAt) revert NotStarted();
        return (block.timestamp - startAt) / epochDuration;
    }

    // ---------------------------------------------------------------------
    // User actions
    // ---------------------------------------------------------------------

    /// @notice Đặt mục tiêu tuần. Lần đầu có hiệu lực ngay kỳ hiện tại; các lần sau áp dụng từ kỳ kế tiếp.
    function setWeeklyTarget(uint256 amount) external override whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        uint256 epoch = _requireStartedEpoch();
        Account storage acc = _accounts[msg.sender];
        TargetCheckpoint[] storage cps = _targets[msg.sender];

        uint256 effectiveEpoch;
        if (!acc.activated) {
            if (_participants.length >= MAX_PARTICIPANTS) revert MaxParticipantsReached();
            acc.activated = true;
            acc.activationEpoch = epoch;
            _participants.push(msg.sender);
            effectiveEpoch = epoch;
            cps.push(TargetCheckpoint({fromEpoch: SafeCast.toUint64(epoch), amount: SafeCast.toUint192(amount)}));
        } else {
            effectiveEpoch = epoch + 1;
            uint256 len = cps.length;
            if (cps[len - 1].fromEpoch == effectiveEpoch) {
                // Đổi nhiều lần trong cùng kỳ: lần cuối quyết định.
                cps[len - 1].amount = SafeCast.toUint192(amount);
            } else {
                cps.push(
                    TargetCheckpoint({fromEpoch: SafeCast.toUint64(effectiveEpoch), amount: SafeCast.toUint192(amount)})
                );
            }
        }
        emit TargetScheduled(msg.sender, amount, effectiveEpoch);
    }

    /// @notice Gửi token vào vault cho chính msg.sender. Cần approve trước.
    function deposit(uint256 amount) external override nonReentrant whenNotPaused {
        _deposit(msg.sender, msg.sender, amount);
    }

    /// @notice Gửi hộ: token kéo từ msg.sender, ghi gốc/tiến độ cho `wallet`.
    /// @dev Dùng cho auto-saving và nạp gasless; ghi cùng kỳ như deposit thường.
    function depositFor(address wallet, uint256 amount) external override nonReentrant whenNotPaused {
        if (wallet == address(0)) revert ZeroAddress();
        _deposit(wallet, msg.sender, amount);
        emit DepositedFor(msg.sender, wallet, currentEpoch(), amount);
    }

    function _deposit(address wallet, address payer, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();
        if (amount < minDeposit) revert DepositBelowMinimum(amount, minDeposit);
        uint256 epoch = _requireStartedEpoch();
        if (maxDepositPerEpoch > 0) {
            uint256 newDeposited = _flows[wallet][epoch].deposited + amount;
            if (newDeposited > maxDepositPerEpoch) revert DepositOverEpochLimit(newDeposited, maxDepositPerEpoch);
        }

        Account storage acc = _accounts[wallet];
        acc.principal += amount;
        acc.depositCount += 1;
        totalPrincipal += amount;
        _flows[wallet][epoch].deposited += amount;

        token.safeTransferFrom(payer, address(this), amount);
        emit Deposited(wallet, epoch, amount, acc.principal);
    }

    /// @notice Rút gốc của chính msg.sender, bất kỳ lúc nào. Trừ phí rút (nếu cấu hình) về treasury.
    function withdraw(uint256 amount) external override nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        uint256 epoch = _requireStartedEpoch();

        Account storage acc = _accounts[msg.sender];
        if (amount > acc.principal) revert InsufficientPrincipal(amount, acc.principal);
        acc.principal -= amount;
        totalPrincipal -= amount;
        _flows[msg.sender][epoch].withdrawn += amount;

        uint256 fee = (amount * withdrawFeeBps) / BPS_DENOMINATOR;
        if (fee > 0) {
            if (treasury == address(0)) revert ZeroAddress();
            token.safeTransfer(treasury, fee);
            emit WithdrawFeeCharged(msg.sender, amount, fee);
        }
        token.safeTransfer(msg.sender, amount - fee);
        emit Withdrawn(msg.sender, epoch, amount, acc.principal);
    }

    /// @notice Rút toàn bộ gốc với phạt (vẫn ghi tiến độ kỳ như withdraw thường).
    function emergencyWithdraw() external override nonReentrant whenNotPaused {
        uint256 epoch = _requireStartedEpoch();
        Account storage acc = _accounts[msg.sender];
        uint256 amount = acc.principal;
        if (amount == 0) revert ZeroAmount();
        acc.principal = 0;
        totalPrincipal -= amount;
        _flows[msg.sender][epoch].withdrawn += amount;

        uint256 penalty = (amount * emergencyPenaltyBps) / BPS_DENOMINATOR;
        if (penalty > 0) {
            if (treasury == address(0)) revert ZeroAddress();
            token.safeTransfer(treasury, penalty);
        }
        token.safeTransfer(msg.sender, amount - penalty);
        emit EmergencyWithdrawn(msg.sender, amount, penalty);
    }

    // ---------------------------------------------------------------------
    // Streak protection: freeze / insurance / revive
    // ---------------------------------------------------------------------

    /// @notice Đóng băng kỳ hiện tại: nếu thiếu target lúc chốt, streak giữ nguyên (không +1).
    /// @dev Mỗi kỳ chỉ freeze một lần; phí về treasury.
    function freezeCurrentEpoch() external override whenNotPaused {
        uint256 epoch = _requireStartedEpoch();
        if (!_accounts[msg.sender].activated) revert NotActivated();
        if (frozenUntilEpoch[msg.sender] >= epoch) revert AlreadyFrozen(epoch);
        _payFee(freezeFee);
        frozenUntilEpoch[msg.sender] = epoch;
        emit Frozen(msg.sender, epoch, freezeFee);
    }

    /// @notice Mua bảo hiểm kỳ hiện tại: nếu thiếu target lúc chốt, streak giữ nguyên, tiêu hao 1 lần.
    /// @dev Khác freeze: tự động áp dụng, không cần biết trước chắc chắn sẽ thiếu.
    function insureCurrentEpoch() external override whenNotPaused {
        uint256 epoch = _requireStartedEpoch();
        if (!_accounts[msg.sender].activated) revert NotActivated();
        if (hasInsurance[msg.sender] && _insuredEpoch[msg.sender] == epoch) revert AlreadyInsured(epoch);
        _payFee(insurancePremium);
        hasInsurance[msg.sender] = true;
        _insuredEpoch[msg.sender] = epoch;
        emit Insured(msg.sender, epoch, insurancePremium);
    }

    function _payFee(uint256 fee) internal {
        if (fee > 0) {
            if (treasury == address(0)) revert ZeroAddress();
            token.safeTransferFrom(msg.sender, treasury, fee);
        }
    }

    /// @notice Hồi sinh streak bị mất ở kỳ gần nhất (trong REVIVE_WINDOW kỳ), trả phí.
    /// @dev Chỉ khôi phục streak hiện tại; kết quả kỳ cũ đã chốt không đổi.
    function revive() external override nonReentrant whenNotPaused {
        uint256 raw = _lastFailedEpoch[msg.sender];
        if (raw == 0) revert NothingToRevive(); // chưa từng thất bại
        uint256 failedEpoch = raw - 1;
        if (_revivedAtEpoch[msg.sender] == failedEpoch + 1) revert NothingToRevive(); // đã revive cho kỳ này
        uint256 deadline = epochStart(failedEpoch) + REVIVE_WINDOW * epochDuration;
        if (block.timestamp >= deadline) revert ReviveWindowClosed(failedEpoch, deadline);

        _payFee(reviveFee);
        uint256 restored = _streakBeforeFail[msg.sender];
        _accounts[msg.sender].streak = restored;
        _revivedAtEpoch[msg.sender] = failedEpoch + 1;
        emit Revived(msg.sender, failedEpoch, restored, reviveFee);
    }

    // ---------------------------------------------------------------------
    // Settlement (distributor only)
    // ---------------------------------------------------------------------

    /// @inheritdoc IStreakVault
    function settleEpoch(uint256 epoch)
        external
        override
        onlyDistributor
        whenNotPaused
        returns (address[] memory wallets, uint256[] memory weights, uint256[] memory principals, uint256 totalWeight)
    {
        if (epoch != nextEpochToSettle) revert EpochOutOfOrder(nextEpochToSettle, epoch);
        uint256 end = epochEnd(epoch);
        if (block.timestamp < end) revert EpochNotEnded(epoch, end);
        nextEpochToSettle = epoch + 1;

        uint256 n = _participants.length;
        wallets = new address[](n);
        weights = new uint256[](n);
        principals = new uint256[](n);

        for (uint256 i; i < n; ++i) {
            address w = _participants[i];
            wallets[i] = w;
            principals[i] = _accounts[w].principal;
            uint256 weight = _settleWallet(w, epoch);
            weights[i] = weight;
            totalWeight += weight;
        }
    }

    /// @dev Chốt một ví cho `epoch`, trả về trọng số (= streak sau chốt; 0 nếu không đạt / chưa kích hoạt).
    function _settleWallet(address w, uint256 epoch) internal returns (uint256 newStreak) {
        Account storage acc = _accounts[w];
        if (acc.activationEpoch > epoch) return 0; // chưa kích hoạt ở kỳ này -> không xét

        uint256 target = _targetAt(w, epoch);
        EpochFlow storage f = _flows[w][epoch];
        uint256 progress = f.deposited > f.withdrawn ? f.deposited - f.withdrawn : 0;
        bool qualified = target > 0 && progress >= target;

        uint256 prevStreak = acc.streak;
        if (qualified) {
            newStreak = prevStreak + 1;
        } else if (epoch <= frozenUntilEpoch[w] || (hasInsurance[w] && _insuredEpoch[w] == epoch)) {
            // Freeze / bảo hiểm: giữ streak cũ, tiêu hao hiệu lực.
            newStreak = prevStreak;
            frozenUntilEpoch[w] = 0;
            hasInsurance[w] = false;
        } else {
            _streakBeforeFail[w] = prevStreak;
            _lastFailedEpoch[w] = epoch + 1;
            newStreak = 0;
        }
        acc.streak = newStreak;
        _results[w][epoch] = EpochResult({settled: true, qualified: qualified, streak: SafeCast.toUint64(newStreak)});
        emit AccountEpochSettled(w, epoch, qualified, newStreak);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function targetAt(address wallet, uint256 epoch) external view override returns (uint256) {
        return _targetAt(wallet, epoch);
    }

    /// @dev Tìm checkpoint gần nhất có fromEpoch <= epoch bằng tìm kiếm nhị phân.
    function _targetAt(address wallet, uint256 epoch) internal view returns (uint256) {
        TargetCheckpoint[] storage cps = _targets[wallet];
        uint256 len = cps.length;
        if (len == 0 || cps[0].fromEpoch > epoch) return 0;
        uint256 lo = 0;
        uint256 hi = len - 1;
        while (lo < hi) {
            uint256 mid = (lo + hi + 1) / 2;
            if (cps[mid].fromEpoch <= epoch) lo = mid;
            else hi = mid - 1;
        }
        return cps[lo].amount;
    }

    function depositCount(address wallet) external view override returns (uint256) {
        return _accounts[wallet].depositCount;
    }

    function getAccount(address wallet) external view override returns (AccountView memory v) {
        Account storage acc = _accounts[wallet];
        uint256 epoch = currentEpoch();
        v.principal = acc.principal;
        v.streak = acc.streak;
        v.activated = acc.activated;
        v.activationEpoch = acc.activationEpoch;
        v.currentEpoch = epoch;
        v.depositCount = acc.depositCount;

        if (hasStarted()) {
            v.currentTarget = _targetAt(wallet, epoch);
            EpochFlow storage f = _flows[wallet][epoch];
            v.currentDeposited = f.deposited;
            v.currentWithdrawn = f.withdrawn;
            v.currentProgress = f.deposited > f.withdrawn ? f.deposited - f.withdrawn : 0;
        }

        TargetCheckpoint[] storage cps = _targets[wallet];
        uint256 len = cps.length;
        if (len > 0 && hasStarted() && cps[len - 1].fromEpoch > epoch) {
            v.pendingTarget = cps[len - 1].amount;
            v.pendingTargetEpoch = cps[len - 1].fromEpoch;
        }
    }

    function getEpochStatus(address wallet, uint256 epoch) external view override returns (EpochStatus memory s) {
        EpochFlow storage f = _flows[wallet][epoch];
        EpochResult storage r = _results[wallet][epoch];
        s.target = _targetAt(wallet, epoch);
        s.deposited = f.deposited;
        s.withdrawn = f.withdrawn;
        s.progress = f.deposited > f.withdrawn ? f.deposited - f.withdrawn : 0;
        s.settled = r.settled;
        s.qualified = r.qualified;
        s.streakAtSettle = r.streak;
    }

    function getParticipants() external view override returns (address[] memory) {
        return _participants;
    }

    function participantCount() external view returns (uint256) {
        return _participants.length;
    }

    function getTargetCheckpoints(address wallet) external view returns (TargetCheckpoint[] memory) {
        return _targets[wallet];
    }

    /// @notice Streak trước khi bị reset (dùng cho revive + hiển thị UI).
    function streakBeforeFail(address wallet) external view returns (uint256) {
        return _streakBeforeFail[wallet];
    }

    /// @notice Kỳ gần nhất chốt thất bại (0 = chưa từng).
    function lastFailedEpoch(address wallet) external view returns (uint256) {
        uint256 raw = _lastFailedEpoch[wallet];
        return raw == 0 ? 0 : raw - 1;
    }
}
