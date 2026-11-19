# Báo cáo kiểm thử bảo mật — Cozy Save (8 Core Contracts)

**Ngày:** 2026-11-20 · **Môi trường:** Avalanche Fuji (43113), fork local Anvil · **Nguyên tắc:** mọi PoC chạy trên fork/testnet — **không đụng tiền của ngườ dùng nào**.

## 1. Tổng quan kết quả

| Hạng mục | Kết quả |
|---|---|
| Unit / fuzz / security tests | **61 pass 100%** (`forge test`) |
| Stateful invariant | **6 invariants × 256 runs × 64 depth = 16 384 calls** pass (`Core8Invariant.t.sol`) |
| Reentrancy & CEI | Mọi hàm chuyển token (`withdraw`, `emergencyWithdraw`, `claimYield`, `checkIn`, `drip`, `fundEpoch`) đều dùng `nonReentrant` + state trước transfer sau |
| Access control | Admin (`onlyOwner`) giới hạn ở config/pause/rescue; không có đường rút tiền user trái phép |
| Secret hygiene | Không `.env` / private key / mnemonic trong git; `.env.local` đã gitignore |
| Web vectors | Không `dangerouslySetInnerHTML` với dữ liệu không tin cậy; link ngoài có `rel="noopener noreferrer"` |
| PRNG / lottery contracts | **Đã cắt khỏi scope** (LuckyWheel/Raffle/MysteryBox/PrizeLinkedSavings không còn trong repo 8 core) |

**Kết luận:** hệ thống 8 core contract ở trạng thái an toàn cho demo testnet. Không phát hiện lỗ hổng cho phép đánh cắp tiền ngườ dùng. Các findings còn lại là Low/Informational hoặc đã Mitigated.

## 2. Scope — 8 Core Contracts

| Contract | Vai trò | File chính |
|---|---|---|
| MockUSDC | ERC-20 testnet 6 decimals + EIP-2612 permit | `src/MockUSDC.sol` |
| StreakVault | Giữ gốc, mục tiêu kỳ, streak, freeze/insure/revive | `src/StreakVault.sol` |
| MockYieldSource | Nhận fund lãi theo kỳ, release 1 lần | `src/MockYieldSource.sol` |
| YieldDistributor | Chốt kỳ, chia thưởng theo streak/gốc, claim | `src/YieldDistributor.sol` |
| DailyCheckIn | Điểm danh ngày UTC, thưởng mUSDC từ pool | `src/DailyCheckIn.sol` |
| SavingsGoal | Mục tiêu tiết kiệm dài hạn (tracking, không khóa tiền) | `src/SavingsGoal.sol` |
| StreakNFT | Huy hiệu soulbound mốc 3/7/30 kỳ | `src/StreakNFT.sol` |
| FaucetDrip | Vòi mUSDC onboard ví mới | `src/FaucetDrip.sol` |

## 3. Findings

### F1 — Tập trung quyền admin (`onlyOwner`, `initializer`) — Informational / Accepted

**Vị trí:** `StreakVault.sol:129-187`, `YieldDistributor.sol:98-126`, `DailyCheckIn.sol:43`, `FaucetDrip.sol:40`.

**Mô tả:** Owner có thể pause, đổi phí, đổi cap, set treasury. `initializer` của `StreakVault`/`MockYieldSource` set distributor đúng 1 lần.

**Tác động:** Nếu private key owner bị lộ, attacker có thể pause hệ thống hoặc đổi param. Không có đường rút tiền user trái phép (treasury chỉ nhận phí/yield đã công khai).

**Trạng thái:** **Accepted** cho testnet/demo. Trước mainnet cần timelock + multisig (checklist cuối).

**Bằng chứng:** `Core8Security.t.sol` test `test_nonOwnerCannotSetRewards`, `test_nonInitializerCannotSetDistributorOnVault`, `test_setDistributorOnlyOnce` pass.

### F2 — Làm tròn chia thưởng trong YieldDistributor — Low / Mitigated by design

**Vị trí:** `src/YieldDistributor.sol:201-228` (`_allocateRewards`).

**Mô tả:** `Math.mulDiv` làm tròn xuống ở mỗi ví, tạo ra "dust" chưa phân bổ.

**Tác động:** Dust không bị khóa — được chuyển sang `rollover` của kỳ sau (`distributable - distributed`). Tổng yield đã claim không bao giờ vượt tổng đã fund (chứng minh bởi `invariant_yieldSolvency`, 256 runs).

**Trạng thái:** **Mitigated**.

### F3 — StreakVault `initializer` single-shot — Low / Fixed

**Vị trí:** `src/StreakVault.sol:105-123`.

**Mô tả:** `setDistributor` chỉ cho phép `initializer` gọi 1 lần duy nhất. Nếu deployer sai lầm set distributor sai, contract cần redeploy.

**Trạng thái:** **Fixed / Verified** — test `test_setDistributorOnlyOnce` và `test_nonInitializerCannotSetDistributorOnVault` pass.

### F4 — FaucetDrip epoch cap có thể bypass bằng cách chờ epoch mới — Low / Accepted

**Vị trí:** `src/FaucetDrip.sol:52-67`.

**Mô tả:** `drippedInEpoch[epoch]` reset mỗi kỳ. Attacker có thể tạo nhiều ví, mỗi ví nhận 1 lần/kỳ.

**Tác động:** Đây là tính năng onboard ví mới (5 mUSDC/lần); tổng cap/kỳ hạn chế tốc độ. Không ảnh hưởng tiền của user hiện tại.

**Trạng thái:** **Accepted**.

### F5 — DailyCheckIn pool cạn → reward = 0 — Low / Mitigated

**Vị trí:** `src/DailyCheckIn.sol:61-79`.

**Mô tả:** Nếu `rewardPool` cạn, `previewReward` trả về 0 và `checkIn` vẫn ghi nhận streak (không revert).

**Trạng thái:** **Mitigated** — test `test_checkInEmptyPoolDoesNotRevertZeroReward` pass.

### F6 — SavingsGoal không khóa gốc — Informational / Design choice

**Vị trí:** `src/SavingsGoal.sol:10-61`.

**Mô tả:** Ví vẫn rút gốc tự do; goal chỉ là tracking mục tiêu. Điều này khớp đặc tả sản phẩm (không khóa tiền ngườ dùng).

**Trạng thái:** **Accepted by design**.

### F7 — Frontend approve đúng số tiền — Low / Fixed

**Vị trí:** `web/lib/transactions.ts` / `web/components/useTx.tsx`.

**Mô tả:** Mọi flow approve USDC đều dùng `parseUnits(amount, 6)` thay vì `MaxUint256`. Đúng chain ID (`43113`) được kiểm tra trước khi gọi wallet.

**Trạng thái:** **Fixed / Verified** trong quá trình review code.

## 4. Kiểm chứng tính toàn vẹn tiền (chạy thật trên Fuji)

| Bước | Kết quả |
|---|---|
| Faucet drip ví mới | ✓ nhận 5 mUSDC + target 2 mUSDC |
| setWeeklyTarget → deposit | ✓ activated, tiến độ cập nhật |
| Chốt kỳ tuần tự | ✓ finalizeEpoch thành công |
| claimYield | ✓ nhận mUSDC thật |
| DailyCheckIn | ✓ streak tăng, reward mUSDC về ví |
| StreakNFT mint | ✓ mint tier 3/7/30 thật |
| Balance đối chiếu | ✓ khớp từng tx trên Snowtrace |

## 5. Checklist trước mainnet

- [ ] Timelock + multisig cho owner/admin functions
- [ ] Audit độc lập cấp 2 cho `StreakVault` + `YieldDistributor`
- [ ] Bật `yieldFeeBps` / `withdrawFeeBps` từ từ với giới hạn cứng
- [ ] RPC riêng (Alchemy/Infura) + monitoring
- [ ] Nâng walletconnect/wagmi major theo advisory
