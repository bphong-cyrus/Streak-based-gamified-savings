// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStreakVault} from "./interfaces/IStreakVault.sol";

/// @title LuckyWheel — Vòng quay may mắn (testnet, quỹ tài trợ, KHÔNG thu phí)
/// @notice Mỗi kỳ tiết kiệm thành công (đủ mục tiêu VÀ đã được chốt đạt) mở khóa 1 lượt quay
///         do quỹ tài trợ chi trả. Ngườ dùng KHÔNG trả phí quay; gốc tiết kiệm không đi vào quỹ giải.
///
/// @dev Chống farm: quyền nhận chỉ cấp khi kỳ đã chốt (settled) và đạt (qualified) — gửi rồi rút
///      trong cùng kỳ làm tiến độ giảm nên không đạt. Tối đa 1 lượt mới mỗi kỳ/ví; lượt chưa dùng
///      được dồn. Quỹ không đủ giải lớn nhất thì spin() từ chối (web báo "chờ sponsor nạp thêm").
///
/// @dev GIẢI 0 kèm 10 điểm trang trí (decorPoints) — nền tảng cho tính năng customize sau này;
///      khi lên môi trường tài sản thật, đề xuất vòng quay chỉ trao điểm/đồ trang trí.
///
/// @dev ENTROPY: kết quả dùng blockhash — CHỈ testnet. Kết quả minh bạch, đối chiếu được trên
///      Snowtrace, nhưng KHÔNG tuyên bố "công bằng có thể kiểm chứng" cho tới khi tích hợp VRF.
contract LuckyWheel is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Prize {
        uint256 amount;     // mUSDC (0 = không tiền, cộng điểm trang trí)
        uint256 decorPoints; // điểm trang trí kèm giải này
        uint256 weight;     // trọng số / totalWeight
        string label;
    }

    IERC20 public immutable token;
    IStreakVault public immutable vault;

    uint256 public cooldown;   // giây giữa 2 lượt quay của cùng ví
    uint256 public pool;       // sổ sách quỹ giải (chỉ sponsor nạp)
    uint256 public nonce;      // đếm lượt quay (thêm entropy)
    uint256 public totalWeight;

    Prize[] public prizes;
    mapping(address => uint256) public lastSpinAt;
    mapping(address => uint256) public freeSpins;                        // lượt chưa dùng
    mapping(address => mapping(uint256 => bool)) public epochGranted;    // kỳ đã cấp lượt
    mapping(address => uint256) public decorPoints;                      // điểm trang trí tích luỹ

    event SpinResult(
        address indexed player, uint256 indexed spinId, uint256 prizeIndex, uint256 prizeAmount, uint256 decorAwarded
    );
    event EpochGrant(address indexed player, uint256 indexed epoch, uint256 totalFreeSpins);
    event PoolFunded(address indexed from, uint256 amount);
    event CooldownSet(uint256 seconds_);

    error CooldownActive(uint256 readyAt);
    error InsufficientPool(uint256 need, uint256 have);
    error ZeroAmount();
    error EpochNotQualified(address player, uint256 epoch);
    error EpochAlreadyGranted(address player, uint256 epoch);
    error NoFreeSpin();
    error WheelExhausted();

    constructor(IERC20 token_, IStreakVault vault_, uint256 cooldown_) Ownable(msg.sender) {
        if (address(token_) == address(0) || address(vault_) == address(0)) revert ZeroAmount();
        token = token_;
        vault = vault_;
        cooldown = cooldown_;
        // Bảng giải testnet: EV = 0,79 mUSDC/lượt. Quỹ 50 mUSDC ≈ 63 lượt theo kỳ vọng (không cam kết).
        prizes.push(Prize({amount: 0, decorPoints: 10, weight: 50, label: unicode"Chúc may mắn +10 điểm"}));
        prizes.push(Prize({amount: 1e6, decorPoints: 0, weight: 35, label: "1 mUSDC"}));
        prizes.push(Prize({amount: 2e6, decorPoints: 0, weight: 12, label: "2 mUSDC"}));
        prizes.push(Prize({amount: 5e6, decorPoints: 0, weight: 2, label: "5 mUSDC"}));
        prizes.push(Prize({amount: 10e6, decorPoints: 0, weight: 1, label: "10 mUSDC"}));
        for (uint256 i; i < prizes.length; ++i) totalWeight += prizes[i].weight;
    }

    // ------------------------------------------------------------------
    // Quỹ giải (chỉ sponsor nạp — tiền ngườ chơi không đi vào đây)
    // ------------------------------------------------------------------

    function fund(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        pool += amount;
        emit PoolFunded(msg.sender, amount);
    }

    function setCooldown(uint256 seconds_) external onlyOwner {
        cooldown = seconds_;
        emit CooldownSet(seconds_);
    }

    // ------------------------------------------------------------------
    // Cấp lượt quay: kỳ đã chốt ĐẠT → 1 lượt/ví/kỳ
    // ------------------------------------------------------------------

    /// @notice Nhận 1 lượt quay cho một kỳ đã chốt đạt. Chỉ cấp sau khi kỳ được finalize —
    ///         gửi-rút farm trong kỳ làm tiến độ giảm → không đạt → không có lượt.
    function claimEpoch(uint256 epoch) external {
        if (epochGranted[msg.sender][epoch]) revert EpochAlreadyGranted(msg.sender, epoch);
        IStreakVault.EpochStatus memory s = vault.getEpochStatus(msg.sender, epoch);
        if (!s.settled || !s.qualified) revert EpochNotQualified(msg.sender, epoch);
        epochGranted[msg.sender][epoch] = true;
        freeSpins[msg.sender] += 1;
        emit EpochGrant(msg.sender, epoch, freeSpins[msg.sender]);
    }

    // ------------------------------------------------------------------
    // Quay — không thu phí, tiêu 1 lượt, quỹ đủ giải lớn nhất mới được quay
    // ------------------------------------------------------------------

    /// @notice Quay bằng lượt miễn phí. Không tốn mUSDC; ngườ chơi chỉ trả phí mạng (AVAX testnet).
    /// @dev Dừng phục vụ khi quỹ còn dưới giải lớn nhất — web hiển thị trạng thái này rõ ràng.
    function spin() external nonReentrant returns (uint256 prizeIndex, uint256 prizeAmount) {
        if (freeSpins[msg.sender] == 0) revert NoFreeSpin();
        uint256 need = maxPrize();
        if (pool < need) revert WheelExhausted(); // quỹ không đủ mọi khả năng trả

        uint256 last = lastSpinAt[msg.sender];
        uint256 readyAt = last + cooldown;
        if (last != 0 && block.timestamp < readyAt) revert CooldownActive(readyAt);

        freeSpins[msg.sender] -= 1;

        uint256 rand =
            uint256(keccak256(abi.encode(blockhash(block.number - 1), msg.sender, nonce++, block.timestamp))) % totalWeight;
        prizeIndex = _pick(rand);
        Prize memory p = prizes[prizeIndex];
        prizeAmount = p.amount;
        pool -= prizeAmount;
        if (prizeAmount > 0) token.safeTransfer(msg.sender, prizeAmount);
        if (p.decorPoints > 0) decorPoints[msg.sender] += p.decorPoints;

        lastSpinAt[msg.sender] = block.timestamp;
        emit SpinResult(msg.sender, nonce, prizeIndex, prizeAmount, p.decorPoints);
    }

    /// @dev Chọn giải theo rand (0..totalWeight). Tách riêng để test boundary và để UI minh hoạ.
    function _pick(uint256 rand) internal view returns (uint256) {
        uint256 acc;
        for (uint256 i; i < prizes.length; ++i) {
            acc += prizes[i].weight;
            if (rand < acc) return i;
        }
        return prizes.length - 1;
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function previewPrize(uint256 rand)
        external
        view
        returns (uint256 index, uint256 amount, uint256 decor, string memory label)
    {
        index = _pick(rand % totalWeight);
        Prize memory p = prizes[index];
        return (index, p.amount, p.decorPoints, p.label);
    }

    function prizeCount() external view returns (uint256) {
        return prizes.length;
    }

    function prizeTable()
        external
        view
        returns (uint256[] memory amounts, uint256[] memory decor, uint256[] memory weights, string[] memory labels)
    {
        uint256 n = prizes.length;
        amounts = new uint256[](n);
        decor = new uint256[](n);
        weights = new uint256[](n);
        labels = new string[](n);
        for (uint256 i; i < n; ++i) {
            amounts[i] = prizes[i].amount;
            decor[i] = prizes[i].decorPoints;
            weights[i] = prizes[i].weight;
            labels[i] = prizes[i].label;
        }
    }

    /// @notice Giải tiền lớn nhất — ngưỡng "quỹ đủ" để tiếp tục phục vụ.
    function maxPrize() public view returns (uint256) {
        uint256 m;
        for (uint256 i; i < prizes.length; ++i) {
            if (prizes[i].amount > m) m = prizes[i].amount;
        }
        return m;
    }

    function canServe() external view returns (bool) {
        return pool >= maxPrize();
    }

    function nextSpinAt(address player) external view returns (uint256) {
        uint256 last = lastSpinAt[player];
        if (last == 0) return 0;
        uint256 ready = last + cooldown;
        return ready > block.timestamp ? ready : 0;
    }
}
