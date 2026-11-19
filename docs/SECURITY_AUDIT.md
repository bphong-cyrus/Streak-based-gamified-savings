# Báo cáo kiểm thử bảo mật — Cozy Save (UniHack × Avalanche)

**Ngày:** 2026-11-19 · **Môi trường:** Avalanche Fuji (43113), fork local Anvil · **Nguyên tắc:** chỉ đọc trên Fuji, mọi PoC khai thác chạy trên fork — **không đụng tiền của ngườ dùng nào**. Các giao dịch ghi trên Fuji trong phiên test chỉ thuộc ví deployer thuộc sở hữu team.

## 1. Tổng quan kết quả

| Hạng mục | Kết quả |
|---|---|
| Slither (102 detectors, 127 contract) | **0 High · 0 Medium** — 219 findings còn lại đều Low/Informational |
| Rà soát thủ công | không có `tx.origin`, `delegatecall`, `selfdestruct`, `unchecked` block |
| Reentrancy | mọi hàm chuyển token đều có `nonReentrant` + tuân thủ CEI (state trước, transfer sau — đã đọc từng hàm `withdraw`/`emergencyWithdraw` của StreakVault) |
| Access control | admin action (`onlyOwner`/`onlyRole`) nằm ở cấu hình & rescue; không có đường rút tiền user trái phép |
| Web (npm audit + review) | 1 Critical (Next.js) **đã vá** bản 14.2.35; không có XSS vector; không có secrets trong git |
| PoC trên fork | xác nhận 1 lỗ hổng thiết kế PRNG (chi tiết F1) |

**Kết luận:** hệ thống ở trạng thái an toàn cho demo giải đấu trên testnet. Không phát hiện lỗ hổng cho phép đánh cắp tiền ngườ dùng. Một rủi ro thiết kế (F1) cần giải pháp trước khi lên mainnet.

## 2. Findings

### F1 — PRNG yếu từ `blockhash` (Medium, rủi ro chấp nhận được trên testnet)

**Vị trí:** `LuckyWheel.spin`, `PrizeLinkedSavings.draw`, `Raffle._pickWinners`, `MysteryBox.openBox` — đều dùng `keccak256(abi.encodePacked(blockhash(block.number - 1), ...))`.

**Bằng chứng (PoC trên Anvil fork):**
- Tái tính `rand` ngoài chuỗi cho block bất kỳ và đối chiếu với công thức trong contract → kết quả **deterministic hoàn toàn**.
- Spin thật trên fork trúng đúng tầng giải theo giá trị dự đoán (nhận +2 mUSDC).
- Kịch bản khai thác thực tế: **validator/sequencer** biết `blockhash(N-1)` trước khi đóng block N → tính trước kết quả, chỉ include tx spin khi kết quả có lợi (miss-revert bảo vệ ngườ thường khỏi mất tiền, nhưng validator luôn "trúng"). Ngườ dùng thường **không thể** dự đoán trước vì tx của họ rơi vào block tương lai.
- **Tác động:** không mất tiền trực tiếp; công bằng kết quả bị ảnh hưởng nếu validator tham gia chơi. Trên Fuji (testnet) mức độ rủi ro thấp.

**Khuyến nghị trước mainnet:** chuyển sang Chainlink VRF (hoặc Pyth Entropy) cho mọi hàm rút thăm; hoặc commit-reveal có xác thực.

### F2 — `transferFrom`/`transfer` không kiểm tra return (Low)

`GemShop.buyTheme/buyDecor`, `GemStaking.stake/unstake`, `PetCompanion.feed`, `TreasuryDividend.stake/unstake`, `Bingo.fund` gọi trực tiếp thay vì `SafeERC20`. Token Gems là ERC-20 chuẩn của chính hệ thống (trả về bool đúng), nên **không khai thác được hiện tại**; nếu sau này nâng cấp token sang non-standard sẽ thành lỗ hổng. Khuyến nghị bọc `SafeERC20` kỳ tới.

### F3 — `transferFrom` với `from` tùy ý trong AutoSaver/RoundUpVault (Informational, đúng thiết kế)

Slither báo "arbitrary from". Đọc code: `AutoSaver.execute(wallet)` chỉ chuyển từ ví đã `register` và có allowance sẵn cho contract — tương đương pattern gửi hộ (account abstraction lite). **Không phải lỗ hổng**, đã ghi chú để tránh báo động sai.

### F4 — Web: npm audit (đã xử lý/chấp nhận)

- **Critical — Next.js Server Actions DoS:** app không dùng Server Actions; vẫn **đã vá** lên `next@14.2.35` (patch mới nhất dòng 14.2).
- **High — @walletconnect/\*, wagmi, @coinbase/wallet-sdk, @metamask/sdk transitive:** cần nâng major (breaking, rủi ro cao sát ngày thi). Chấp nhận rủi ro: đây là SDK ví chạy client-side, app không có server chứa secrets, không render dữ liệu ngườ dùng thô → bề mặt tấn công thực tế rất thấp. Có kế hoạch nâng sau giải.
- Không tìm thấy `dangerouslySetInnerHTML`/`eval` → không vector XSS. Không file env/secrets nào trong git (`.env.local` đã gitignore).

### F5 — Nhật ký sự cố kỹ thuật trong phiên pentest

- **Sự cố:** RPC công khai `api.avax-test.network` trả **HTTP 429 / Cloudflare 1015 (rate-limit)** sau ~400 request trong phiên chốt kỳ tuần tự + quét log.
- **Tác động:** chỉ phiên test bị chậm; không ảnh hưởng ngườ dùng app (app đã cấu hình **fallback RPC**: publicnode + ankr + api.avax).
- **Xử lý:** chuyển sang RPC dự phòng, hoãn quét; khuyến nghị dùng RPC riêng (Alchemy/Infura) khi demo trước đám đông.

## 3. Kiểm chứng tính toàn vẹn tiền (chạy thật trên Fuji, ví team)

| Bước | Kết quả |
|---|---|
| Faucet drip | revert do pool cạn → đã fund lại 50 mUSDC |
| setWeeklyTarget(2) → deposit(2) | ✓ activated, tiến độ 2/2 |
| Vòng quay | cấu hình 6 tầng giải thật; lượt quay thật **trúng 5 mUSDC**, nhận đủ |
| Chốt kỳ tuần tự 0→183 | ✓ 184/184 tx thành công |
| claimYield | ✓ nhận 3 mUSDC thật, streak=2 sau settle |
| Balance đối chiếu | khớp từng tx trên Snowtrace |

## 4. Checklist trước mainnet

- [ ] Thay PRNG blockhash bằng Chainlink VRF (F1)
- [ ] Bọc SafeERC20 cho mọi chỗ còn lại (F2)
- [ ] Audit độc lập (cấp 2) cho StreakVault + YieldDistributor
- [ ] Timelock cho admin function (đã có `Timelock.sol` trong repo — cần wire)
- [ ] Nâng walletconnect/wagmi major + theo dõi advisory
- [ ] RPC riêng cho production + giám sát (Watchtower.sol đã có thể dùng)
