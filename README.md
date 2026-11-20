# Savient — Tiết kiệm mọc nhà

[![CI](https://github.com/bphong-cyrus/Streak-based-gamified-savings/actions/workflows/ci.yml/badge.svg)](https://github.com/bphong-cyrus/Streak-based-gamified-savings/actions/workflows/ci.yml)

**Streak-based gamified savings trên Avalanche Fuji**: gửi đủ mục tiêu mỗi kỳ → streak tăng, phần thưởng tăng, tòa nhà 3D của bạn mọc thêm một tầng. Bỏ kỳ → streak về 0. Tiền gốc luôn của bạn, rút anytime — kể cả khi contract đang pause — mọi thứ ghi on-chain, đối chiếu được trên Snowtrace.

> **Minh bạch dữ liệu:** mUSDC là token testnet của dự án, và nguồn "lãi" hiện tại là **ngân sách do sponsor nạp vào `MockYieldSource`** (mock yield), không phải lãi lending tự sinh. UI luôn ghi rõ "nguồn lãi mô phỏng" và chế độ `?demo=1` đeo nhãn "Bản thử — không phải số dư thật". Tích hợp Aave/Benqi nằm ở roadmap (phụ lục bonus).

## Bài toán

Ngườ trẻ khó giữ thói quen gửi tiền đều: thiếu động lực, dễ bỏ cuộc sau vài tuần. Savient game hoá kỷ luật tài chính bằng streak + tòa nhà 3D lớn lên cùng thói quen tốt, và biến phần thưởng thành lãi thật chia từ nguồn yield.

## Kiến trúc — 8 core contract

| Contract | Vai trò | Địa chỉ Fuji (43113) |
|---|---|---|
| `MockUSDC` | Tiền tệ demo (6 decimals) | `0xfb898F5D855d5B54F266c6b3D57ED879B619cbbB` |
| `StreakVault` | **Trái tim**: deposit/withdraw, target, streak, freeze kỳ | `0x63Da6fAD88E18888003BFb0DbE1e8F2bfDC01Cd8` |
| `MockYieldSource` | Nguồn lãi (`fundEpoch`/`release`) | `0x3110b2D90FB2e6BB2Ae753a98B00b7c86FDade31` |
| `YieldDistributor` | Chia thưởng theo gốc + streak, `finalizeEpoch`, `claimYield` | `0x90172773fDe524FD9165138b48169D435D9b0150` |
| `DailyCheckIn` | Điểm danh ngày — thưởng mUSDC từ pool | `0x3FdB50B5977A0d0de1D1819cA0dD5ad558af333C` |
| `SavingsGoal` | Mục tiêu gốc + hạn kỳ, ghi nhận đạt on-chain | `0x6a29Bc0FDafeB58c6160864439b5465f07d4BEb0` |
| `StreakNFT` | Huy hiệu ERC-1155 theo mốc streak 3 / 7 / 30 tuần | `0x81AAd1918466Eb736c5Aaa482cd9FA055169d989` |
| `FaucetDrip` | Onboard ví mới: 5 mUSDC thẳng vào vault + target đầu | `0xA140DF43E89A32487C52c0c90ba8de398c20AC01` |

Vòng đờ một kỳ: đặt mục tiêu tuần → gửi đủ trước hạn chót → kỳ được **finalize** (hành động công khai, ai cũng gọi được) → ngân sách yield chia cho ví giữ streak → user **claim** lãi. Song song: điểm danh mỗi ngày nhận mUSDC, đủ mốc streak mint huy hiệu NFT, cam kết mục tiêu lớn bằng `SavingsGoal`.

## Chính sách gốc & phí (đã chốt, có test đối kháng)

- **"Principal is never lost" — phí trên gốc bằng 0 vĩnh viễn**: `withdraw` và `emergencyWithdraw`
  luôn trả **100% gốc**. Các cơ chế phí/phạt/whale-discount trên gốc đã bị **gỡ hoàn toàn khỏi source**
  — không tồn tại setter nào để owner (kể cả bị tấn công) bật phí lại. Test đối kháng:
  `test_withdrawAlwaysReturnsFullPrincipal`, `test_emergencyWithdrawAlwaysReturnsFullPrincipal`.
- **Rút bất cứ lúc nào, kể cả khi pause**: hai hàm rút cố tình *không* mang `whenNotPaused` —
  pause chỉ chặn nạp/thao tác rủi ro. Test: `test_withdrawWorksWhilePaused`, `test_emergencyWithdrawWorksWhilePaused`.
- **Trần phí trên lãi: 20%** (`MAX_YIELD_FEE_BPS` trong `YieldDistributor`) cho `yieldFeeBps` /
  `referralBps` — phí chỉ có thể đánh trên phần thưởng yield, không động gốc.
- Bảo vệ streak (freeze / insurance / revive) là **dịch vụ tự chọn trả phí**, không ảnh hưởng quy tắc "bỏ kỳ reset về 0" nếu không dùng.
- **Triển khai**: đã **redeploy Fuji** bản mới (phí gốc = 0 vĩnh viễn, kỳ 180 giây, deployBlock 61371331) —
  địa chỉ bảng trên khớp `contracts/deployments/43113.json` và fallback trong `web/lib/config.ts`.
  Hướng dẫn chạy lại từ đầu: [docs/HUONG_DAN_TEST_FUJI.md](docs/HUONG_DAN_TEST_FUJI.md).

## Cho giám khảo — tổng quan 2 phút

**Savient** (Saving · Convenient · Consistent) — streak-based gamified savings trên Avalanche Fuji:
gửi đủ mục tiêu mỗi kỳ → streak tăng, phần thưởng tăng, tòa nhà 3D mọc tầng. Bỏ kỳ → streak về 0.
Rút gốc luôn đủ 100%, bất kỳ lúc nào, kể cả khi contract đang pause — không có phí trên gốc.

- **Demo chạy được ngay**: https://cozy-save.vercel.app (không cần ví — chế độ "Bản thử" đeo nhãn rõ ràng).
- **Giao dịch thật đã chứng minh**: 2 ví, 2 kỳ, 12 tx hash kiểm chứng được trên Snowtrace (bảng ngay dưới).
- **Contract**: 8 hợp đồng đã verify logic bằng 73 test + 6 invariant fuzz (16 384 calls); phí gốc bị **gỡ hoàn toàn khỏi source**.
- **Minh bạch**: mUSDC là token testnet; "lãi" là ngân sách do sponsor nạp (mock yield) chia theo streak on-chain — không giới thiệu là lãi lending thật. Nguồn yield Aave/Benqi nằm ở roadmap.
- **Kiểm thử**: xem [docs/CI_LOCAL_RUN.md](docs/CI_LOCAL_RUN.md) (73/73 forge · tsc sạch · build OK · E2E 10/10 trên desktop + mobile). GitHub Actions hiện bị khoá billing ở cấp tài khoản (không phải lỗi test — có quote từ GitHub API trong file đó).
- **Pitch/demo script**: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — kịch bản quay 4 phút kèm shot-list.

Kết quả đối chiếu 2 ví (đọc trực tiếp từ contract sau khi chốt kỳ 13):

| Ví | Kỳ 12 | Kỳ 13 | Streak | Lãi nhận | Gốc rút |
|---|---|---|---|---|---|
| A `0xe00EA…0734` | đạt 5/5 | đạt 5/5 | **2** | **13 mUSDC** | 10/10 — 100% |
| B `0x472E…2FB3` | đạt 10/2 | **lỡ → reset 0** | **0** | **9 mUSDC** | 10/10 — 100% |

## Bằng chứng giao dịch thật trên Fuji (2 ví, kỳ 12–13 · 20/11/2026)

Deployment mới (deployBlock 61371331, kỳ 180 giây). Mọi hash mở được tại
`https://testnet.snowtrace.io/tx/<hash>` — status = success, đối chiếu được on-chain.
mUSDC là token testnet của dự án; "lãi" là ngân sách do sponsor nạp (`MockYieldSource`),
chia theo streak — không giới thiệu là lợi suất lending thật.

- **Ví A** `0xe00EA6a4168De3388FbF703DcF24ad55B2150734` — gửi đủ 2 kỳ liên tiếp
- **Ví B** `0x472E1ceCE7f45Da4BDB19301dd731cb0e5822FB3` — đạt kỳ 12, cố tình lỡ kỳ 13

| Bước | Ví | Tx hash |
|---|---|---|
| Đặt mục tiêu 5 mUSDC/kỳ | A | [`0x0314d7de…cd5ec0`](https://testnet.snowtrace.io/tx/0x0314d7de06c9f7e5413a18a0a54d45237979aaec7ce7831eb9941c205dcd5ec0) |
| Nhận 5 mUSDC qua faucet + target đầu | B | [`0x45cdc4fe…06279`](https://testnet.snowtrace.io/tx/0x45cdc4fec591d2f93c94502f8afc7af8494d169be97e7550e468debe12306279) |
| Deposit kỳ 12 (5 mUSDC) | A | [`0x199693c3…6efe46`](https://testnet.snowtrace.io/tx/0x199693c3f583418cfd2e73409c7cdc3a3bc993677454c287bfe755d8de6efe46) |
| Deposit kỳ 12 (5 mUSDC, tổng 10 đạt target 2) | B | [`0x90ca9cfc…c4822`](https://testnet.snowtrace.io/tx/0x90ca9cfcc37c76eccbd7a879554c45245a111b6b608c1d3017b291a2a71c4822) |
| Chốt kỳ 12 (`finalizeEpoch`, ai cũng gọi được) | — | [`0xdf899328…9e9f18`](https://testnet.snowtrace.io/tx/0xdf899328adf71bdfd4b0f8425275c34bc6c353899476706f1626a8d4879e9f18) |
| Nhận lãi kỳ 12 | A | [`0xb6a5d59b…631fc`](https://testnet.snowtrace.io/tx/0xb6a5d59bc6f3dfc1e0ce59c886645aebbf564761135e5f3d13af96ccae4631fc) |
| Nhận lãi kỳ 12 | B | [`0x35ee81ce…b7900`](https://testnet.snowtrace.io/tx/0x35ee81ceb5ba1f981ac8f80df13879d14d5887f8222662433891511fa73b7900) |
| Deposit kỳ 13 — A tiếp tục, B lỡ | A | [`0xbfe2312b…b23c6`](https://testnet.snowtrace.io/tx/0xbfe2312b490061feacdf1845d6eb6c06921b6ec790a10fc42f891538e60b23c6) |
| Chốt kỳ 13 | — | [`0x3c263260…a9f4d`](https://testnet.snowtrace.io/tx/0x3c263260063c0e12fbe06a14f120028495fac44de3dd62323e031e5760fa9f4d) |
| Nhận lãi kỳ 13 | A | [`0x790170c5…35b50`](https://testnet.snowtrace.io/tx/0x790170c5409d3f4c1da972a8daab2c218cf7806b856c1ebe3380aa0d09435b50) |
| Rút toàn bộ gốc 10 mUSDC | A | [`0x2cac0e08…2b782`](https://testnet.snowtrace.io/tx/0x2cac0e089e13669655432680b13d2854e4ec3ae907a90e5005d542ee6bb2b782) |
| Rút toàn bộ gốc 10 mUSDC | B | [`0xccf0b6b4…3d477`](https://testnet.snowtrace.io/tx/0xccf0b6b4a8461d7489b87422a97a7525625738eb6ba87611b86818f131f3d477) |

**Kết quả đối chiếu on-chain** (đọc trực tiếp từ contract sau khi chốt kỳ 13):

| Ví | Kỳ 12 | Kỳ 13 | Streak cuối | Lãi đã nhận | Gốc rút |
|---|---|---|---|---|---|
| A | đạt (5/5) | đạt (5/5) | **2** | **13 mUSDC** | 10/10 — 100% |
| B | đạt (10/2) | **lỡ (0/2) → streak reset 0** | **0** | **9 mUSDC** | 10/10 — 100% |

Số học kỳ 12: ngân sách 5 mUSDC + **rollover 13 mUSDC** từ các kỳ trước không ai đạt →
18 mUSDC chia đều theo streak 1:1 → mỗi ví 9 mUSDC. Kỳ 13: ngân sách 4 mUSDC,
chỉ A giữ streak (trọng số 2, B = 0) → A nhận 4 mUSDC. Rút gốc không mất phí —
`withdraw` trả đúng 100% ("principal is never lost").

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
cd contracts && forge test     # 73 tests: unit + fuzz + invariant + security
cd web && npx tsc --noEmit     # typecheck
cd web && npm run build        # production build
cd web && npx playwright test  # E2E desktop (1440×900) + mobile (390×844)
```

- **Smart contracts:** 73 tests pass, 6 stateful invariants × 256 runs × 64 depth = 16 384 calls, bằng chứng CEI + ReentrancyGuard + access control; test đối kháng cho phí-gốc-bằng-0-vĩnh-viễn và rút-khi-pause.
- **Gas report:** `contracts/.gas-snapshot` — `finalizeEpoch` với 20 ví ~2.57M gas.
- **Báo cáo audit:** [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) — *self review nội bộ* (defense-in-depth, checklist pre-mainnet), không phải audit độc lập.
- **CI:** workflow (.github/workflows/ci.yml) gồm Foundry tests + Next build + Playwright E2E. Tài khoản GitHub chủ repo hiện bị khoá billing ở cấp tài khoản (GitHub không cấp runner — annotation chính thức: *"account is locked due to a billing issue"*), nên các run chưa thể thực thi; toàn bộ pipeline tương đương đã chạy xanh trên máy local và được ghi nhận tại [docs/CI_LOCAL_RUN.md](docs/CI_LOCAL_RUN.md) — 73/73 forge, tsc 0 lỗi, build OK, E2E 10/10.
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
