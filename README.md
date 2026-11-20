# Cozy Save — Tiết kiệm mọc nhà

[![CI](https://github.com/bphong-cyrus/Streak-based-gamified-savings/actions/workflows/ci.yml/badge.svg)](https://github.com/bphong-cyrus/Streak-based-gamified-savings/actions/workflows/ci.yml)

**Streak-based gamified savings trên Avalanche Fuji**: gửi đủ mục tiêu mỗi kỳ → streak tăng, phần thưởng tăng, tòa nhà 3D của bạn mọc thêm một tầng. Bỏ kỳ → streak về 0. Tiền gốc luôn của bạn, rút anytime — kể cả khi contract đang pause — mọi thứ ghi on-chain, đối chiếu được trên Snowtrace.

> **Minh bạch dữ liệu:** mUSDC là token testnet của dự án, và nguồn "lãi" hiện tại là **ngân sách do sponsor nạp vào `MockYieldSource`** (mock yield), không phải lãi lending tự sinh. UI luôn ghi rõ "nguồn lãi mô phỏng" và chế độ `?demo=1` đeo nhãn "Bản thử — không phải số dư thật". Tích hợp Aave/Benqi nằm ở roadmap (phụ lục bonus).

## Bài toán

Ngườ trẻ khó giữ thói quen gửi tiền đều: thiếu động lực, dễ bỏ cuộc sau vài tuần. Cozy Save game hoá kỷ luật tài chính bằng streak + tòa nhà 3D lớn lên cùng thói quen tốt, và biến phần thưởng thành lãi thật chia từ nguồn yield.

## Kiến trúc — 8 core contract

| Contract | Vai trò | Địa chỉ Fuji (43113) |
|---|---|---|
| `MockUSDC` | Tiền tệ demo (6 decimals) | `0x1c0684ad8e5e6B8C1551B9197ACD6Ea821870Efe` |
| `StreakVault` | **Trái tim**: deposit/withdraw, target, streak, freeze kỳ | `0x898676aB9838a23258C98f68D454D0aeFCA44E1E` |
| `MockYieldSource` | Nguồn lãi (`fundEpoch`/`release`) | `0xB4A5Fe5620F6F8D5609483819806e7118Add1517` |
| `YieldDistributor` | Chia thưởng theo gốc + streak, `finalizeEpoch`, `claimYield` | `0xC8Dc7Bf74e7dF17625698B7F41F37287F9e4c98F` |
| `DailyCheckIn` | Điểm danh ngày — thưởng mUSDC từ pool | `0xF115668e510356E3c3b5191f6707Ab7C912f00C8` |
| `SavingsGoal` | Mục tiêu gốc + hạn kỳ, ghi nhận đạt on-chain | `0x0aAC7c26418d98F036ab55224b4083D0A516557c` |
| `StreakNFT` | Huy hiệu ERC-1155 theo mốc streak 3 / 7 / 30 tuần | `0xc812eD731d58a893e45336c930a0eF6C283c4c8A` |
| `FaucetDrip` | Onboard ví mới: 5 mUSDC thẳng vào vault + target đầu | `0xFc65B124A127C7cD2176f8CaEf7b6A3Eee6543DA` |

Vòng đờ một kỳ: đặt mục tiêu tuần → gửi đủ trước hạn chót → kỳ được **finalize** (hành động công khai, ai cũng gọi được) → ngân sách yield chia cho ví giữ streak → user **claim** lãi. Song song: điểm danh mỗi ngày nhận mUSDC, đủ mốc streak mint huy hiệu NFT, cam kết mục tiêu lớn bằng `SavingsGoal`.

## Chính sách gốc & phí (đã chốt, có test đối kháng)

- **Gốc luôn của bạn**: `withdraw` và `emergencyWithdraw` cố tình *không* mang `whenNotPaused` — pause chỉ chặn nạp/thao tác rủi ro, không bao giờ chặn lối rút của chủ gốc.
- **Trần phí trên gốc: 10%** (`MAX_PRINCIPAL_FEE_BPS`) cho `withdrawFeeBps`, `emergencyPenaltyBps`, `whaleFeeBps` — mặc định bằng 0 và owner không đặt vượt trần được.
- **Trần phí trên lãi: 20%** (`MAX_YIELD_FEE_BPS` trong `YieldDistributor`) cho `yieldFeeBps` / `referralBps` — phí chỉ đánh trên phần thưởng, không động gốc.
- Bảo vệ streak (freeze / insurance / revive) là **dịch vụ tự chọn trả phí**, không ảnh hưởng quy tắc "bỏ kỳ reset về 0" nếu không dùng.

## Chạy local (3 lệnh)

Yêu cầu: [Foundry](https://getfoundry.sh) + Node 20+.

```bash
# 1. Terminal 1 — chuỗi local (Anvil, kỳ 1 tuần)
cd contracts && anvil

# 2. Terminal 2 — deploy + seed
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
DEMO_WALLETS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 forge script script/Seed.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 3. Terminal 3 — frontend
cd web && npm i && npm run dev   # mở http://localhost:3000
```

Địa chỉ local được ghi vào `contracts/deployments/31337.json` — frontend tự đọc. Với Fuji, các địa chỉ ở bảng trên được hardcode làm fallback trong `web/lib/config.ts` (vẫn có thể override bằng `.env.local`, file này đã nằm trong `.gitignore`).

## Test, QA & bảo mật

```bash
cd contracts && forge test     # 74 tests: unit + fuzz + invariant + security
cd web && npx tsc --noEmit     # typecheck
cd web && npm run build        # production build
cd web && npx playwright test  # E2E desktop (1440×900) + mobile (390×844)
```

- **Smart contracts:** 74 tests pass, 6 stateful invariants × 256 runs × 64 depth = 16 384 calls, bằng chứng CEI + ReentrancyGuard + access control; test đối kháng cho trần phí và rút-khi-pause.
- **Gas report:** `contracts/.gas-snapshot` — `finalizeEpoch` với 20 ví ~2.57M gas.
- **Báo cáo audit:** [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) — *self review nội bộ* (defense-in-depth, checklist pre-mainnet), không phải audit độc lập.
- **E2E QA:** Playwright kiểm thử 4 màn hình core trên Desktop (1440×900) & Mobile (390×844), bắt toàn bộ `console.error` / `pageerror` / HTTP 4xx/5xx; selector dùng role/aria-label/`data-testid` ổn định; upload trace khi fail trong CI.

## Cấu trúc repo

```
contracts/
  src/            # 8 core contract + interfaces/
  script/         # Deploy.s.sol, Seed.s.sol, export-abi.mjs
  test/           # 6 suite (unit + fuzz + invariant + security)
  deployments/    # địa chỉ theo chainId
web/
  app/            # landing + shell (Next.js 14, App Router)
  components/cozy # 4 màn core: Dashboard, Goals, Rewards, Hồ sơ + nhà 3D (Three.js)
  e2e/            # Playwright QA suite
  lib/            # abis.ts (8 ABI, ~57KB), config, hooks
  public/identities/ # bộ nhân vật (SVG avatar + mô hình 3D Pet3D trong cảnh nhà)
.github/workflows/ # CI: forge test + typecheck + Next build + Playwright E2E (có trace khi fail)
docs/             # SECURITY_AUDIT.md, DESIGN_SYSTEM.md
```

Frontend: Next.js 14 + wagmi/viem + React Three Fiber. Nhà 3D isometric mọc tầng theo streak với cư dân là mô hình mèo/thỏ 3D (Pet3D: 5 nhân vật, phụ kiện riêng, mắt chớp + đuôi vẫy), âm thanh WebAudio tổng hợp, skeleton loading, aria-live cho giao dịch, theme ngày/đêm.

## Ghi chú

- Testnet demo: kỳ 180 giây trên Fuji deployment hiện tại (giá trị `epochSeconds` trong `deployments/43113.json`); production nên 1 tuần/kỳ.
- `?demo=1` xem giao diện với dữ liệu mẫu không cần ví (ẩn khỏi UI mặc định).
- Mainnet roadmap: VRF cho mọi cơ chế ngẫu nhiên, audit độc lập cấp 2, timelock admin — chi tiết trong báo cáo bảo mật.
