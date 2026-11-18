// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";
import {MockYieldSource} from "./MockYieldSource.sol";

/// @title PredictionBox (Tính năng 81 + 82 + 83)
/// @notice 81. Dự đoán ngân sách yield của kỳ kế tiếp: đoán Tổng ngân sách (over/under mốc owner đặt).
///         82. Ngườ đoán đúng chia pool cược của ngườ sai, trừ phí về owner.
///         83. Không ai đoán đúng: pool cộng dồn (rollover) kỳ sau.
/// @dev Kết quả lấy từ MockYieldSource.budgetOf(epoch) sau khi kỳ kết thúc (mock oracle).
contract PredictionBox is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;

    enum Side {
        UNDER,
        OVER
    }

    struct Market {
        uint256 epoch; // kỳ được dự đoán
        uint256 line; // mốc so sánh (mUSDC)
        uint256 deadline; // hết hạn đặt = đầu kỳ được dự đoán
        uint256 underPool;
        uint256 overPool;
        uint256 feeBps; // phí owner trên pool thua
        bool resolved;
        uint256 outcome; // ngân sách thực tế
        uint256 loseNet; // pool thua sau phí (set lúc resolve)
    }

    IStreakVault public immutable vault;
    MockYieldSource public immutable source;
    IERC20 public immutable token;

    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public stakeOf; // market -> user -> amount
    mapping(uint256 => mapping(address => Side)) public sideOf;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event MarketCreated(uint256 indexed marketId, uint256 epoch, uint256 line);
    event Predicted(uint256 indexed marketId, address indexed wallet, Side side, uint256 amount);
    event Resolved(uint256 indexed marketId, uint256 outcome, Side winning);
    event Claimed(uint256 indexed marketId, address indexed wallet, uint256 amount);

    error BadMarket();
    error MarketClosed();
    error AlreadyPredicted();
    error NotResolved();
    error NothingToClaim();
    error NoStake();

    constructor(IStreakVault vault_, MockYieldSource source_, IERC20 token_) Ownable(msg.sender) {
        vault = vault_;
        source = source_;
        token = token_;
    }

    /// @notice Tính năng 81: mở market cho kỳ kế tiếp, mốc `line` (chỉ owner/bot).
    function createMarket(uint256 line, uint256 feeBps) external onlyOwner returns (uint256 marketId) {
        require(vault.hasStarted(), "not started");
        require(feeBps <= BPS / 4, "fee too high");
        uint256 epoch = vault.currentEpoch() + 1;
        marketId = ++marketCount;
        markets[marketId] = Market({
            epoch: epoch,
            line: line,
            deadline: vault.epochStart(epoch),
            underPool: 0,
            overPool: 0,
            feeBps: feeBps,
            resolved: false,
            outcome: 0,
            loseNet: 0
        });
        emit MarketCreated(marketId, epoch, line);
    }

    /// @notice Đặt cược over/under. Chỉ một lần mỗi market mỗi ví.
    function predict(uint256 marketId, Side side, uint256 amount) external nonReentrant {
        Market storage m = markets[marketId];
        if (m.epoch == 0) revert BadMarket();
        if (block.timestamp >= m.deadline) revert MarketClosed();
        if (stakeOf[marketId][msg.sender] > 0) revert AlreadyPredicted();

        token.safeTransferFrom(msg.sender, address(this), amount);
        stakeOf[marketId][msg.sender] = amount;
        sideOf[marketId][msg.sender] = side;
        if (side == Side.UNDER) m.underPool += amount;
        else m.overPool += amount;
        emit Predicted(marketId, msg.sender, side, amount);
    }

    /// @notice Tính năng 82/83: chốt kết quả sau khi kỳ kết thúc; ai cũng gọi được.
    /// @dev Phí owner thu một lần ở đây trên pool thua; phần còn lại (loseNet) chia cho ngườ thắng.
    function resolve(uint256 marketId) external nonReentrant {
        Market storage m = markets[marketId];
        if (m.epoch == 0 || m.resolved) revert BadMarket();
        if (block.timestamp < vault.epochEnd(m.epoch)) revert MarketClosed();
        m.resolved = true;
        m.outcome = source.budgetOf(m.epoch);

        Side winning = m.outcome >= m.line ? Side.OVER : Side.UNDER;
        uint256 losePool = winning == Side.OVER ? m.underPool : m.overPool;
        uint256 fee = (losePool * m.feeBps) / BPS;
        m.loseNet = losePool - fee;
        if (fee > 0) token.safeTransfer(owner(), fee);
        emit Resolved(marketId, m.outcome, winning);
    }

    /// @notice Tính năng 82: ngườ thắng claim gốc + phần thưởng theo tỷ lệ stake trong pool thắng.
    /// @dev Tính năng 83: không ai đoán chiều ngược (loseNet = 0) thì ngườ thắng chỉ nhận lại stake.
    function claim(uint256 marketId) external nonReentrant {
        Market storage m = markets[marketId];
        if (!m.resolved) revert NotResolved();
        if (claimed[marketId][msg.sender]) revert NothingToClaim();
        uint256 stake = stakeOf[marketId][msg.sender];
        if (stake == 0) revert NoStake();
        claimed[marketId][msg.sender] = true;

        Side winning = m.outcome >= m.line ? Side.OVER : Side.UNDER;
        uint256 payout;
        if (sideOf[marketId][msg.sender] == winning) {
            uint256 winPool = winning == Side.OVER ? m.overPool : m.underPool;
            payout = stake + Math.mulDiv(m.loseNet, stake, winPool);
        }
        if (payout > 0) token.safeTransfer(msg.sender, payout);
        emit Claimed(marketId, msg.sender, payout);
    }

    /// @notice Số tiền claim được ước tính hiện tại.
    function previewClaim(uint256 marketId, address wallet) external view returns (uint256) {
        Market storage m = markets[marketId];
        if (!m.resolved || claimed[marketId][wallet]) return 0;
        uint256 stake = stakeOf[marketId][wallet];
        if (stake == 0) return 0;
        Side winning = m.outcome >= m.line ? Side.OVER : Side.UNDER;
        if (sideOf[marketId][wallet] != winning) return 0;
        uint256 winPool = winning == Side.OVER ? m.overPool : m.underPool;
        return stake + Math.mulDiv(m.loseNet, stake, winPool);
    }
}
