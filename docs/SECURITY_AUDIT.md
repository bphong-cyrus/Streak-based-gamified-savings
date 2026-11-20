# Báo cáo kiểm thử bảo mật — Cozy Save (8 Core Contracts)

**Ngày:** 2026-11-20 · **Môi trường:** Avalanche Fuji (43113), fork local Anvil · **Nguyên tắc:** mọi PoC chạy trên fork/testnet — **không đụng tiền của ngườ dùng nào**.

> **Phạm vi cam kết:** đây là **self review nội bộ** (unit/fuzz/invariant/security test do chính nhóm viết và chạy), không phải audit độc lập bởi bên thứ ba. Số liệu chỉ công bố kết quả vừa chạy lại tại commit hiện tại.

## 1. Tổng quan kết quả

| Hạng mục | Kết quả |
|---|---|
| Unit / fuzz / security tests | **73 pass 100%** (`forge test`) |
| Stateful invariant | **6 invariants × 256 runs × 64 depth = 16 384 calls** pass (`Core8Invariant.t.sol`) |
| Reentrancy & CEI | Mọi hàm chuyển token (`withdraw`, `emergencyWithdraw`, `claimYield`, `checkIn`, `drip`, `fundEpoch`) đều dùng `nonReentrant` + state trước transfer sau |
| Trần phí gốc | **Đã gỡ hoàn toàn** — không còn `withdrawFeeBps`/`emergencyPenaltyBps`/whale fee trong source; rút luôn đủ 100% gốc, không setter nào bật phí lại được — có test đối kháng |
| Trần phí lãi | `MAX_YIELD_FEE_BPS = 20%` chặn `yieldFeeBps` / `referralBps` |
| Rút khi pause | `withdraw` / `emergencyWithdraw` **không** mang `whenNotPaused` — pause không bao giờ chặn chủ gốc rút tiền — có test đối kháng |
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

**Tác động:** Nếu private key owner bị lộ, attacker có thể pause hệ thống hoặc đổi param trong trần đã chặn. Không có đường rút tiền user trái phép (treasury chỉ nhận phí/yield đã công khai), và pause không chặn được `withdraw`/`emergencyWithdraw` (xem F11).

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

**Vị trí:** `web/components/useTx.tsx`, `web/components/cozy/DepositSheet.tsx`, `web/components/cozy/panel.tsx`.

**Mô tả:** Mọi flow approve USDC đều dùng số tiền chính xác (`amount`) thay vì `MaxUint256`. Đúng chain ID (`43113`) được kiểm tra và tự chuyển mạng trước khi gọi wallet.

**Trạng thái:** **Fixed / Verified** trong quá trình review code.

### F8 — StreakNFT `mint()` thiếu `nonReentrant` — Low / Fixed

**Vị trí:** `contracts/src/StreakNFT.sol:38-46`.

**Mô tả:** Hàm `mint()` gọi `_mint()` của ERC-1155, có thể trigger `onERC1155Received` ở ví contract. Mặc dù `balanceOf` check và soulbound (`TransfersDisabled`) đã ngăn mint lặp, thêm `nonReentrant` là lớp phòng thủ sâu (defense-in-depth).

**Trạng thái:** **Fixed** — đã thêm `ReentrancyGuard` và `nonReentrant` cho `mint()`; test `test_nftMintDuplicateReverts` pass.

### F9 — Link ngoài `RecentTxPanel` thiếu `noopener` — Informational / Fixed

**Vị trí:** `web/components/cozy/RecentTxPanel.tsx:32`.

**Mô tả:** Link Snowtrace dùng `rel="noreferrer"` nhưng thiếu `noopener`, tiềm ẩn tabnapping/window.opener manipulation.

**Trạng thái:** **Fixed** — đã đổi thành `rel="noopener noreferrer"`.

### F10 — Automated E2E QA zero console-error — Informational / Verified

**Vị trí:** `web/e2e/qa.spec.ts`, `web/playwright.config.ts`.

**Mô tả:** Bộ kiểm thử tự động chạy trên Desktop (1440×900) và Mobile (390×844) với cả `?demo=1` và chế độ chưa kết nối ví. Mọi test pass, bắt toàn bộ `console.error`, `pageerror`, HTTP 4xx/5xx.

**Trạng thái:** **Verified** — `npx playwright test` pass trên cả 2 project desktop + mobile.

### F11 — Phí rút/phạt thiết lập được tới 100% và pause chặn rút gốc — Medium / Fixed

**Vị trí:** `src/StreakVault.sol` (`setWithdrawFeeBps`, `setEmergencyPenaltyBps`, `setWhaleDiscount`, `withdraw`, `emergencyWithdraw`), `src/YieldDistributor.sol` (`setYieldFeeBps`, `setReferralBps`).

**Mô tả:** (1) Các setter phí chỉ chặn `bps <= 100%`, owner có thể đặt phí rút 100% — mâu thuẫn lợi hứa "principal is never lost". (2) `withdraw`/`emergencyWithdraw` mang `whenNotPaused`: khi owner pause, chủ gốc bị chặn rút tiền. (3) `setWhaleDiscount` không kiểm tra `bps`.

**Tác động:** Lòng tin ngườ dùng: phí rút cao bất thường hoặc rút bị kẹt khi pause.

**Trạng thái:** **Fixed / Verified** — quyết định sản phẩm chốt: **phí trên gốc = 0 vĩnh viễn** (gỡ hoàn toàn `withdrawFeeBps`/`emergencyPenaltyBps`/whale-discount khỏi source, không còn setter nào để bật lại); bỏ `whenNotPaused` ở hai hàm rút; phí lãi giữ trần `MAX_YIELD_FEE_BPS = 20%`. Test đối kháng: `test_withdrawAlwaysReturnsFullPrincipal`, `test_emergencyWithdrawAlwaysReturnsFullPrincipal`, `test_withdrawWorksWhilePaused`, `test_emergencyWithdrawWorksWhilePaused`, `test_setYieldFeeAboveCapReverts` — `forge test` pass trọn bộ.

> Triển khai: đã redeploy Fuji bản mới chứa toàn bộ fix (deployBlock 61371331, kỳ 180 giây, deployer `0xe00EA…50734`); địa chỉ trong `deployments/43113.json` và `web/lib/config.ts` là bản mới.

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
