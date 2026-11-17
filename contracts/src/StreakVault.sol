// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title StreakVault
/// @notice Giá»¯ gá»‘c cá»§a ngÆ°á»i dÃ¹ng, lÆ°u má»¥c tiÃªu theo ká»³, tiá»n gá»­i/rÃºt tá»«ng ká»³ vÃ  streak.
/// @dev Epoch e chiáº¿m khoáº£ng [startAt + e*epochDuration, startAt + (e+1)*epochDuration).
contract StreakVault is IStreakVault, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_PARTICIPANTS = 20;

    IERC20 public immutable token;
    uint256 public immutable override startAt;
    uint256 public immutable override epochDuration;
    address public immutable initializer;

    address public distributor;
    uint256 public override totalPrincipal;
    /// @notice Ká»³ káº¿ tiáº¿p cáº§n chá»‘t (phÃ²ng thá»§ thÃªm, distributor cÅ©ng kiá»ƒm tra thá»© tá»±).
    uint256 public nextEpochToSettle;

    struct TargetCheckpoint {
        uint64 fromEpoch;
        uint192 amount;
    }

    struct Account {
        uint256 principal;
        uint256 streak;
        uint256 activationEpoch;
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

    modifier onlyDistributor() {
        if (msg.sender != distributor) revert NotDistributor();
        _;
    }

    constructor(IERC20 token_, uint256 startAt_, uint256 epochDuration_) {
        if (address(token_) == address(0)) revert ZeroAddress();
        if (epochDuration_ == 0) revert ZeroAmount();
        token = token_;
        startAt = startAt_;
        epochDuration = epochDuration_;
        initializer = msg.sender;
    }

    /// @notice Gáº¯n distributor Ä‘Ãºng má»™t láº§n, chá»‰ deployer gá»i.
    function setDistributor(address distributor_) external {
        if (msg.sender != initializer) revert NotInitializer();
        if (distributor != address(0)) revert DistributorAlreadySet();
        if (distributor_ == address(0)) revert ZeroAddress();
        distributor = distributor_;
        emit DistributorSet(distributor_);
    }

    // ---------------------------------------------------------------------
    // Epoch helpers
    // ---------------------------------------------------------------------

    function hasStarted() public view override returns (bool) {
        return block.timestamp >= startAt;
    }

    /// @notice Ká»³ hiá»‡n táº¡i. Tráº£ vá» 0 trÆ°á»›c `startAt`; frontend dÃ¹ng `hasStarted()` Ä‘á»ƒ phÃ¢n biá»‡t.
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

    /// @notice Äáº·t má»¥c tiÃªu tuáº§n. Láº§n Ä‘áº§u cÃ³ hiá»‡u lá»±c ngay ká»³ hiá»‡n táº¡i; cÃ¡c láº§n sau Ã¡p dá»¥ng tá»« ká»³ káº¿ tiáº¿p.
    function setWeeklyTarget(uint256 amount) external override {
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
                // Äá»•i nhiá»u láº§n trong cÃ¹ng ká»³: láº§n cuá»‘i quyáº¿t Ä‘á»‹nh.
                cps[len - 1].amount = SafeCast.toUint192(amount);
            } else {
                cps.push(
                    TargetCheckpoint({fromEpoch: SafeCast.toUint64(effectiveEpoch), amount: SafeCast.toUint192(amount)})
                );
            }
        }
        emit TargetScheduled(msg.sender, amount, effectiveEpoch);
    }

    /// @notice Gá»­i token vÃ o vault. Cáº§n approve trÆ°á»›c.
    function deposit(uint256 amount) external override nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 epoch = _requireStartedEpoch();

        Account storage acc = _accounts[msg.sender];
        acc.principal += amount;
        totalPrincipal += amount;
        _flows[msg.sender][epoch].deposited += amount;

        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, epoch, amount, acc.principal);
    }

    /// @notice RÃºt gá»‘c cá»§a chÃ­nh msg.sender, báº¥t ká»³ lÃºc nÃ o.
    function withdraw(uint256 amount) external override nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 epoch = _requireStartedEpoch();

        Account storage acc = _accounts[msg.sender];
        if (amount > acc.principal) revert InsufficientPrincipal(amount, acc.principal);
        acc.principal -= amount;
        totalPrincipal -= amount;
        _flows[msg.sender][epoch].withdrawn += amount;

        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, epoch, amount, acc.principal);
    }

    // ---------------------------------------------------------------------
    // Settlement (distributor only)
    // ---------------------------------------------------------------------

    /// @inheritdoc IStreakVault
    function settleEpoch(uint256 epoch)
        external
        override
        onlyDistributor
        returns (address[] memory wallets, uint256[] memory weights, uint256 totalWeight)
    {
        if (epoch != nextEpochToSettle) revert EpochOutOfOrder(nextEpochToSettle, epoch);
        uint256 end = epochEnd(epoch);
        if (block.timestamp < end) revert EpochNotEnded(epoch, end);
        nextEpochToSettle = epoch + 1;

        uint256 n = _participants.length;
        wallets = new address[](n);
        weights = new uint256[](n);

        for (uint256 i; i < n; ++i) {
            address w = _participants[i];
            wallets[i] = w;
            uint256 weight = _settleWallet(w, epoch);
            weights[i] = weight;
            totalWeight += weight;
        }
    }

    /// @dev Chá»‘t má»™t vÃ­ cho `epoch`, tráº£ vá» trá»ng sá»‘ (= streak má»›i, 0 náº¿u khÃ´ng Ä‘áº¡t / chÆ°a kÃ­ch hoáº¡t).
    function _settleWallet(address w, uint256 epoch) internal returns (uint256 newStreak) {
        Account storage acc = _accounts[w];
        if (acc.activationEpoch > epoch) return 0; // chÆ°a kÃ­ch hoáº¡t á»Ÿ ká»³ nÃ y -> khÃ´ng xÃ©t

        uint256 target = _targetAt(w, epoch);
        EpochFlow storage f = _flows[w][epoch];
        uint256 progress = f.deposited > f.withdrawn ? f.deposited - f.withdrawn : 0;
        bool qualified = target > 0 && progress >= target;

        newStreak = qualified ? acc.streak + 1 : 0;
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

    /// @dev TÃ¬m checkpoint gáº§n nháº¥t cÃ³ fromEpoch <= epoch báº±ng tÃ¬m kiáº¿m nhá»‹ phÃ¢n.
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

    function getAccount(address wallet) external view override returns (AccountView memory v) {
        Account storage acc = _accounts[wallet];
        uint256 epoch = currentEpoch();
        v.principal = acc.principal;
        v.streak = acc.streak;
        v.activated = acc.activated;
        v.activationEpoch = acc.activationEpoch;
        v.currentEpoch = epoch;

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
}
