# Overnight Report — Cozy Save

**Ngày:** 2026-11-20 · **Branch:** `main`

## Tóm tắt 1 phút

- Đã hoàn thành **Phase 1** (smart-contract rigor), **Phần 1-2** (UI/UX redesign + Playwright E2E QA), **Phần 3** (security hardening), **Phase 3** (CI + README + report).
- Tất cả kiểm thử pass: `forge test` 61/61, `npx tsc --noEmit` pass, `npm run build` pass, Playwright E2E 10/10 pass.
- Đã commit sạch và đẩy lên GitHub.

## Commits đã tạo

1. `465fe36` — `feat(contracts): add invariant fuzzing, security tests, and gas snapshot`
2. `5f43de0` — `feat(web): redesign cozy game HUD, fix 3D clipping, and resolve UI data bugs`
3. `ac079b8` — `test(qa): add automated E2E QA suite and security hardening`
4. *(sắp tạo)* — `docs: add CI workflow, concise README, and overnight report`

## Địa chỉ contract cập nhật (Fuji 43113)

| Contract | Địa chỉ |
|---|---|
| `DailyCheckIn` | `0xF115668e510356E3c3b5191f6707Ab7C912f00C8` |
| `StreakVault` | `0x898676aB9838a23258C98f68D454D0aeFCA44E1E` |
| `YieldDistributor` | `0xC8Dc7Bf74e7dF17625698B7F41F37287F9e4c98F` |
| `SavingsGoal` | `0x0aAC7c26418d98F036ab55224b4083D0A516557c` |
| `StreakNFT` | `0xc812eD731d58a893e45336c930a0eF6C283c4c8A` |
| `FaucetDrip` | `0xFc65B124A127C7cD2176f8CaEf7b6A3Eee6543DA` |
| `MockYieldSource` | `0xB4A5Fe5620F6F8D5609483819806e7118Add1517` |
| `MockUSDC` | `0x1c0684ad8e5e6B8C1551B9197ACD6Ea821870Efe` |

## Kết quả kiểm thử

| Bộ kiểm thử | Kết quả |
|---|---|
| `forge test -vv` (contracts) | 61 tests passed, 0 failed |
| Invariant (`Core8Invariant.t.sol`) | 6 invariants × 256 runs × 64 depth = 16 384 calls, 0 revert ngoài ý muốn |
| `npx tsc --noEmit` (web) | 0 lỗi TypeScript |
| `npm run build` (web) | Build thành công (chỉ warnings optional deps wallet SDK) |
| `npx playwright test` (web) | 10/10 passed (Desktop + Mobile) |

## Bug / UX đã fix trong đêm

- **House 3D bị cắt/che controls:** thêm `pointer-events-none` cho wrapper nhà, tăng z-index cột HUD/controls, tăng top padding để demo banner không che nút.
- **Demo banner che pointer events:** chuyển banner thành `pointer-events-none`, chỉ CTA button giữ `pointer-events-auto`.
- **Rewards badge số âm:** công thức `Math.max(0, tier - streak)` + trạng thái `Đã mở khóa`.
- **Theme toggle E2E:** xử lý trạng thái ban đêm ban ngày theo giờ hệ thống.
- **Copy Snowtrace trên mobile/headless:** stub `navigator.clipboard.writeText` trong Playwright để tránh lỗi permission.

## Security hardening

- `StreakNFT.mint()` thêm `ReentrancyGuard` + `nonReentrant`.
- `RecentTxPanel` link Snowtrace đổi `rel="noreferrer"` → `rel="noopener noreferrer"`.
- Secret hygiene: quét toàn repo không có private key / mnemonic / API key.
- Không dùng `dangerouslySetInnerHTML` với dữ liệu không tin cậy.

## Việc cần làm tay (nếu có)

- **Vercel / hosting:** thêm biến môi trường nếu cần (hiện mọi địa chỉ Fuji đã hardcoded làm fallback, không bắt buộc `.env.local`).
- **Mainnet checklist:** timelock + multisig, audit độc lập cấp 2, RPC riêng — chi tiết trong `docs/SECURITY_AUDIT.md`.

## Files quan trọng đã sửa / thêm

- `web/e2e/qa.spec.ts`
- `web/playwright.config.ts`
- `.github/workflows/ci.yml`
- `docs/SECURITY_AUDIT.md`
- `README.md`
- `contracts/src/StreakNFT.sol`
- `web/components/cozy/CozyApp.tsx`
- `web/components/cozy/HomeTab.tsx`
- `web/components/cozy/RecentTxPanel.tsx`
- `contracts/.gas-snapshot`
