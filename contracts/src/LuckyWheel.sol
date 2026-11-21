// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title LuckyWheel — Vòng quay may mắn (mUSDC testnet)
/// @notice Ngườ chơi trả `spinFee` mUSDC để quay một lần; giải thưởng được chọn ngẫu nhiên
///         theo trọng số và trả ngay từ `pool` do sponsor nạp. Phí quay đổ vào pool.
///
/// @dev ENTROPY TESTNET: kết quả dùng `blockhash(block.number - 1)` — CHỈ dùng cho demo/testnet.
///      Mainnet BẮT BUỘC chuyển sang Chainlink VRF (đã nằm trong roadmap của dự án).
///      An toàn tài sản: mọi lượt quay kiểm tra đủ pool trước khi trả thưởng; `nonReentrant`
///      chặn reentrancy; pool được quản lý bằng sổ sách riêng (không rút nhầm tiền thưởng).
contract LuckyWheel is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Prize {
        uint256 amount; // giải thưởng mUSDC (0 decimals nhỏ nhất)
        uint256 weight; // trọng số trên tổng số
        string label;   // nhãn hiển thị UI
    }

    IERC20 public immutable token;
    uint256 public spinFee;     // phí mỗi lượt quay (đổ vào pool)
    uint256 public cooldown;    // giây giữa 2 lượt của cùng một ví
    uint256 public pool;        // sổ sách pool thưởng
    uint256 public nonce;       // đếm lượt quay toàn cục (thêm entropy)
    uint256 public totalWeight;

    Prize[] public prizes;
    mapping(address => uint256) public lastSpinAt;

    event SpinResult(
        address indexed player, uint256 indexed spinId, uint256 prizeIndex, uint256 prizeAmount, uint256 fee
    );
    event PoolFunded(address indexed from, uint256 amount);
    event SpinFeeSet(uint256 fee);
    event CooldownSet(uint256 seconds_);

    error CooldownActive(uint256 readyAt);
    error InsufficientPool(uint256 need, uint256 have);
    error ZeroAmount();

    constructor(IERC20 token_, uint256 spinFee_, uint256 cooldown_) Ownable(msg.sender) {
        if (address(token_) == address(0)) revert ZeroAmount();
        token = token_;
        spinFee = spinFee_;
        cooldown = cooldown_;
        // Bảng giải mặc định: tổng trọng số 100, EV ~3.16 mUSDC (pool do sponsor tài trợ, testnet).
        prizes.push(Prize({amount: 0, weight: 28, label: unicode"Chúc may mắn!"}));
        prizes.push(Prize({amount: 1e6, weight: 26, label: "1 mUSDC"}));
        prizes.push(Prize({amount: 2e6, weight: 20, label: "2 mUSDC"}));
        prizes.push(Prize({amount: 5e6, weight: 14, label: "5 mUSDC"}));
        prizes.push(Prize({amount: 10e6, weight: 8, label: "10 mUSDC"}));
        prizes.push(Prize({amount: 25e6, weight: 4, label: "25 mUSDC"}));
        for (uint256 i; i < prizes.length; ++i) totalWeight += prizes[i].weight;
    }

    // ------------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------------

    /// @notice Nạp pool thưởng (sponsor/owner; ai cũng có thể donate).
    function fund(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        pool += amount;
        emit PoolFunded(msg.sender, amount);
    }

    function setSpinFee(uint256 fee_) external onlyOwner {
        spinFee = fee_;
        emit SpinFeeSet(fee_);
    }

    function setCooldown(uint256 seconds_) external onlyOwner {
        cooldown = seconds_;
        emit CooldownSet(seconds_);
    }

    // ------------------------------------------------------------------
    // Spin
    // ------------------------------------------------------------------

    /// @notice Quay một lần: trả phí, nhận giải ngay nếu trúng.
    /// @dev Entropy testnet (blockhash) — xem natspec contract.
    function spin() external nonReentrant returns (uint256 prizeIndex, uint256 prizeAmount) {
        // lastSpinAt = 0 nghĩa là chưa từng quay → không bị cooldown lần đầu.
        uint256 last = lastSpinAt[msg.sender];
        uint256 readyAt = last + cooldown;
        if (last != 0 && block.timestamp < readyAt) revert CooldownActive(readyAt);

        token.safeTransferFrom(msg.sender, address(this), spinFee);
        pool += spinFee;

        uint256 rand =
            uint256(keccak256(abi.encode(blockhash(block.number - 1), msg.sender, nonce++, block.timestamp))) % totalWeight;

        uint256 acc;
        for (uint256 i; i < prizes.length; ++i) {
            acc += prizes[i].weight;
            if (rand < acc) {
                prizeIndex = i;
                break;
            }
        }
        prizeAmount = prizes[prizeIndex].amount;
        if (prizeAmount > pool) revert InsufficientPool(prizeAmount, pool);
        pool -= prizeAmount;
        if (prizeAmount > 0) token.safeTransfer(msg.sender, prizeAmount);

        lastSpinAt[msg.sender] = block.timestamp;
        emit SpinResult(msg.sender, nonce, prizeIndex, prizeAmount, spinFee);
    }

    // ------------------------------------------------------------------
    // Views (frontend)
    // ------------------------------------------------------------------

    function prizeCount() external view returns (uint256) {
        return prizes.length;
    }

    /// @notice Toàn bộ bảng giải cho UI vẽ vòng quay.
    function prizeTable() external view returns (uint256[] memory amounts, uint256[] memory weights, string[] memory labels) {
        uint256 n = prizes.length;
        amounts = new uint256[](n);
        weights = new uint256[](n);
        labels = new string[](n);
        for (uint256 i; i < n; ++i) {
            amounts[i] = prizes[i].amount;
            weights[i] = prizes[i].weight;
            labels[i] = prizes[i].label;
        }
    }

    /// @notice Giải lớn nhất — UI kiểm tra pool còn đủ trước khi cho quay.
    function maxPrize() external view returns (uint256) {
        uint256 m;
        for (uint256 i; i < prizes.length; ++i) {
            if (prizes[i].amount > m) m = prizes[i].amount;
        }
        return m;
    }

    /// @notice Thờ điểm ví được quay tiếp (0 = quay ngay được).
    function nextSpinAt(address player) external view returns (uint256) {
        uint256 last = lastSpinAt[player];
        if (last == 0) return 0;
        uint256 ready = last + cooldown;
        return ready > block.timestamp ? ready : 0;
    }
}
