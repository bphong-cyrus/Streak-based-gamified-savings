# Savient

**Saving · Convenient · Consistent** — nền tảng tiết kiệm được gamified hóa trên Avalanche.

[![CI](https://github.com/bphong-cyrus/Streak-based-gamified-savings/actions/workflows/ci.yml/badge.svg)](https://github.com/bphong-cyrus/Streak-based-gamified-savings/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-cozy--save.vercel.app-2f9e6e)](https://cozy-save.vercel.app)
[![Chain](https://img.shields.io/badge/network-Avalanche%20Fuji%2043113-red)](https://docs.avax.network)
[![Contracts](https://img.shields.io/badge/tests-73%20passed-blue)](docs/CI_LOCAL_RUN.md)

---

## Giới thiệu

Savient giải quyết một bài toán quen thuộc: **ngườ trẻ không thiếu tiền — thiếu kỷ luật để gửi đều.** Ứng dụng
biến thói quen tiết kiệm thành vòng lặp trò chơi có phần thưởng thật (ghi on-chain):

- Đặt **mục tiêu mỗi kỳ** (ví dụ 5 mUSDC / 3 phút ở bản testnet).
- **Gửi đủ trước khi kỳ kết thúc** → kỳ được *chốt* công khai → **streak +1**, tòa nhà 3D **mọc thêm một tầng**.
- **Bỏ một kỳ → streak về 0**, trọng số thưởng về 0 — đúng luật chơi đã công bố trong contract.
- Ngân sách thưởng mỗi kỳ được **chia theo trọng số streak**, claim trực tiếp về ví.
- **Rút gốc luôn đủ 100%, bất kỳ lúc nào — kể cả khi contract đang pause.** Không tồn tại phí trên gốc
  (đã gỡ hoàn toàn khỏi source, không có setter nào bật lại được — xem [Chính sách gốc & phí](#chính-sách-gốc--phí)).

Mọi trạng thái (gốc, tiến độ, streak, phần thưởng, lịch sử từng kỳ) đều nằm trong hợp đồng thông minh,
**đối chiếu được công khai trên Snowtrace** — không server nào giữ tiền hay tự tính số liệu.

**Mạng:** Avalanche Fuji C-Chain (testnet, chain ID 43113) · **Kỳ demo:** 180 giây · **Ngườ tham gia tối đa/kỳ:** 20.

## Tính năng chính

| Nhóm | Chi tiết |
|---|---|
| **Kỳ & streak** | Mục tiêu theo kỳ, tiến độ gửi/rút từng kỳ, streak tăng/reset tự động khi chốt kỳ |
| **Nhà 3D** | Tòa nhà isometric mọc tầng theo streak, 5 cư dân mèo/thỏ 3D có hoạt họa (mắt chớp, đuôi vẫy, nhảy nén/giãn), theme ngày/đêm, fallback tĩnh khi WebGL lỗi |
| **Thưởng** | Ngân sách kỳ chia theo trọng số streak, rollover kỳ không ai đạt, claim 1 giao dịch |
| **Bảo vệ streak (tùy chọn)** | Freeze kỳ hiện tại, mua bảo hiểm, hồi sinh streak trong cửa sổ cho phép — trả phí dịch vụ, không ảnh hưởng luật reset |
| **Onboarding** | `FaucetDrip`: 1 giao dịch nhận 5 mUSDC thử nghiệm + mục tiêu đầu tự đặt |
| **Điểm danh & NFT** | Thưởng mUSDC thử nghiệm mỗi ngày; huy hiệu ERC-1155 tại mốc streak 3 / 7 / 30 kỳ |
| **Mục tiêu dài hạn** | Cam kết mốc gốc + hạn theo số kỳ (3/7/30), ghi nhận đạt on-chain |
| **Minh bạch** | Màn chọn rõ "Bản thử / Kết nối ví", thẻ giao dịch giữ link Snowtrace, nhật ký theo từng ví (lưu trên thiết bị), chế độ thử 2 bước trung thực (gửi → chờ chốt kỳ → nhận tầng) |

## Demo

- **Trực tuyến:** https://cozy-save.vercel.app — không cần ví; màn đầu cho chọn rõ **"Xem bản thử (dữ liệu mẫu)"**
  hoặc **"Kết nối ví Avalanche Fuji"**. Bản thử đeo nhãn "không phải số dư thật" ở mọi cụm số.
- **Kịch bản quay/pitch:** [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — script 4 phút kèm shot-list.
- **Tự chạy trên Fuji:** [docs/HUONG_DAN_TEST_FUJI.md](docs/HUONG_DAN_TEST_FUJI.md) — deploy mới + seed + vòng
  giao dịch 2 ví bằng script 1 lệnh.

## Kiến trúc hệ thống

```
Ngườ dùng ──▶ Web app (Next.js 14, wagmi/viem, React Three Fiber)
                  │  đọc/ghi qua RPC Fuji
                  ▼
        ┌─ StreakVault ────── giữ gốc, mục tiêu kỳ, streak, freeze/insurance/revive
        ├─ YieldDistributor ─ chốt kỳ tuần tự, chia thưởng theo trọng số streak, claim
        ├─ MockYieldSource ── ngân sách thưởng từng kỳ (mock yield do sponsor nạp)
        ├─ MockUSDC ───────── token thử nghiệm 6 decimals
        ├─ DailyCheckIn ───── điểm danh ngày, thưởng từ pool
        ├─ SavingsGoal ────── mục tiêu gốc dài hạn
        ├─ StreakNFT ──────── huy hiệu ERC-1155 theo mốc streak
        └─ FaucetDrip ─────── onboard ví mới
```

Vòng đờ một kỳ: `setWeeklyTarget` → `approve` + `deposit` trước khi kỳ hết → hết kỳ, **bất kỳ ai** gọi
`finalizeEpoch` tuần tự (không bỏ qua kỳ) → `claimYield` về ví. Rút gốc: `withdraw` / `emergencyWithdraw` —
luôn đủ 100%, không cần chờ kỳ, không chặn bởi pause.

## Chính sách gốc & phí

Đây là **cam kết sản phẩm đã chốt**, có test đối kháng đi kèm (`contracts/test/Core8Security.t.sol`):

- **"Principal is never lost":** `withdraw` / `emergencyWithdraw` luôn trả 100% gốc. Cơ chế phí/phạt/whale-discount
  trên gốc đã bị **gỡ hoàn toàn khỏi source** — không setter nào tồn tại, kể cả owner bị tấn công cũng không bật phí lại được.
- **Rút bất cứ lúc nào:** hai hàm rút cố tình không mang `whenNotPaused`; pause chỉ chặn nạp/thao tác rủi ro.
- **Trần phí trên lãi 20%** (`MAX_YIELD_FEE_BPS`): phí chỉ có thể đánh trên phần thưởng yield, không động gốc.
- Bảo vệ streak là dịch vụ tự chọn trả phí; không dùng thì luật "bỏ kỳ reset 0" áp dụng nguyên vẹn.

Báo cáo đầy đủ (self-review, findings, checklist pre-mainnet): [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md).

## Bắt đầu

**Yêu cầu:** [Foundry](https://getfoundry.sh) + Node 20+.

```bash
# 1. Terminal 1 — chuỗi local (Anvil)
cd contracts && anvil

# 2. Terminal 2 — deploy + seed môi trường local
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
DEMO_WALLETS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 forge script script/Seed.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 3. Terminal 3 — frontend
cd web && npm i && npm run dev   # http://localhost:3000
```

Địa chỉ local ghi vào `contracts/deployments/31337.json` — frontend tự đọc. Với Fuji, địa chỉ mặc định nằm
trong `web/lib/config.ts` (khớp `contracts/deployments/43113.json`), là **nguồn duy nhất của sự thật** —
không đọc env để tránh lệch deployment.

### Kiểm thử

```bash
cd contracts && forge test       # 73 tests: unit + fuzz + invariant + security
cd web && npx tsc --noEmit       # typecheck sạch
cd web && npm run build          # production build
cd web && npx playwright test    # E2E 6 kịch bản × desktop 1440×900 + mobile 390×844
```

- Contracts: 73 tests, 6 stateful invariants × 256 runs × 64 depth (16 384 calls), CEI + ReentrancyGuard + access control.
- Gas: `finalizeEpoch` với 20 ví ~2.57M gas ([`contracts/.gas-snapshot`](contracts/.gas-snapshot)).
- E2E: Playwright bắt toàn bộ `console.error` / `pageerror` / HTTP 4xx-5xx; selector theo role/aria-label/`data-testid`.

### Về trạng thái CI trên GitHub

Workflow (`.github/workflows/ci.yml`: Foundry → build → Playwright E2E, upload trace khi fail) đã sẵn sàng.
**Tài khoản GitHub chủ repo hiện chưa xác minh billing nên GitHub không cấp runner** — mọi run chết sau ~2 giây
*trước khi bất kỳ bước nào được thực thi*, với annotation chính thức: *"The job was not started because your
account is locked due to a billing issue."* Đây là **hạn chế hạ tầng tài khoản, không phải lỗi của ứng dụng**.
Bằng chứng pipeline tương đương chạy xanh, tái lập được bằng 4 lệnh trên: [docs/CI_LOCAL_RUN.md](docs/CI_LOCAL_RUN.md).

## Triển khai — Avalanche Fuji (chain ID 43113)

Deployment hiện tại: **deployBlock 61371331**, kỳ 180 giây, deployer `0xe00EA…50734`.
Địa chỉ khớp `contracts/deployments/43113.json` và `web/lib/config.ts`.

| Contract | Vai trò | Địa chỉ |
|---|---|---|
| `MockUSDC` | Token thử nghiệm (6 decimals) | `0xfb898F5D855d5B54F266c6b3D57ED879B619cbbB` |
| `StreakVault` | Giữ gốc, mục tiêu kỳ, streak, freeze/insure/revive | `0x63Da6fAD88E18888003BFb0DbE1e8F2bfDC01Cd8` |
| `MockYieldSource` | Ngân sách thưởng từng kỳ (`fundEpoch`) | `0x3110b2D90FB2e6BB2Ae753a98B00b7c86FDade31` |
| `YieldDistributor` | Chốt kỳ, chia thưởng theo streak, claim | `0x90172773fDe524FD9165138b48169D435D9b0150` |
| `DailyCheckIn` | Điểm danh ngày | `0x3FdB50B5977A0d0de1D1819cA0dD5ad558af333C` |
| `SavingsGoal` | Mục tiêu gốc dài hạn | `0x6a29Bc0FDafeB58c6160864439b5465f07d4BEb0` |
| `StreakNFT` | Huy hiệu ERC-1155 (mốc 3/7/30 kỳ) | `0x81AAd1918466Eb736c5Aaa482cd9FA055169d989` |
| `FaucetDrip` | Onboard ví mới | `0xA140DF43E89A32487C52c0c90ba8de398c20AC01` |

### Bằng chứng giao dịch thật (2 ví · kỳ 12–13 · 20/11/2026)

Luồng `target → approve → deposit → finalize → claim → withdraw` đã chạy thật với **hai ví độc lập**
(mỗi hash mở được tại `https://testnet.snowtrace.io/tx/<hash>`, status = success):

- **Ví A** `0xe00EA6a4168De3388FbF703DcF24ad55B2150734` — gửi đủ 2 kỳ liên tiếp
- **Ví B** `0x472E1ceCE7f45Da4BDB19301dd731cb0e5822FB3` — đạt kỳ 12, cố tình lỡ kỳ 13

| Bước | Ví | Tx hash |
|---|---|---|
| Đặt mục tiêu 5 mUSDC/kỳ | A | [`0x0314d7de…cd5ec0`](https://testnet.snowtrace.io/tx/0x0314d7de06c9f7e5413a18a0a54d45237979aaec7ce7831eb9941c205dcd5ec0) |
| Nhận 5 mUSDC qua faucet + target đầu | B | [`0x45cdc4fe…06279`](https://testnet.snowtrace.io/tx/0x45cdc4fec591d2f93c94502f8afc7af8494d169be97e7550e468debe12306279) |
| Deposit kỳ 12 | A | [`0x199693c3…6efe46`](https://testnet.snowtrace.io/tx/0x199693c3f583418cfd2e73409c7cdc3a3bc993677454c287bfe755d8de6efe46) |
| Deposit kỳ 12 | B | [`0x90ca9cfc…c4822`](https://testnet.snowtrace.io/tx/0x90ca9cfcc37c76eccbd7a879554c45245a111b6b608c1d3017b291a2a71c4822) |
| Chốt kỳ 12 (`finalizeEpoch`) | — | [`0xdf899328…9e9f18`](https://testnet.snowtrace.io/tx/0xdf899328adf71bdfd4b0f8425275c34bc6c353899476706f1626a8d4879e9f18) |
| Claim kỳ 12 | A | [`0xb6a5d59b…631fc`](https://testnet.snowtrace.io/tx/0xb6a5d59bc6f3dfc1e0ce59c886645aebbf564761135e5f3d13af96ccae4631fc) |
| Claim kỳ 12 | B | [`0x35ee81ce…b7900`](https://testnet.snowtrace.io/tx/0x35ee81ceb5ba1f981ac8f80df13879d14d5887f8222662433891511fa73b7900) |
| Deposit kỳ 13 (B lỡ kỳ) | A | [`0xbfe2312b…b23c6`](https://testnet.snowtrace.io/tx/0xbfe2312b490061feacdf1845d6eb6c06921b6ec790a10fc42f891538e60b23c6) |
| Chốt kỳ 13 | — | [`0x3c263260…a9f4d`](https://testnet.snowtrace.io/tx/0x3c263260063c0e12fbe06a14f120028495fac44de3dd62323e031e5760fa9f4d) |
| Claim kỳ 13 | A | [`0x790170c5…35b50`](https://testnet.snowtrace.io/tx/0x790170c5409d3f4c1da972a8daab2c218cf7806b856c1ebe3380aa0d09435b50) |
| Rút toàn bộ gốc 10 mUSDC | A | [`0x2cac0e08…2b782`](https://testnet.snowtrace.io/tx/0x2cac0e089e13669655432680b13d2854e4ec3ae907a90e5005d542ee6bb2b782) |
| Rút toàn bộ gốc 10 mUSDC | B | [`0xccf0b6b4…3d477`](https://testnet.snowtrace.io/tx/0xccf0b6b4a8461d7489b87422a97a7525625738eb6ba87611b86818f131f3d477) |

**Kết quả đối chiếu trực tiếp từ contract** sau khi chốt kỳ 13:

| Ví | Kỳ 12 | Kỳ 13 | Streak cuối | Thưởng đã nhận | Gốc rút |
|---|---|---|---|---|---|
| A | đạt (5/5) | đạt (5/5) | **2** | **13 mUSDC** | 10/10 — 100% |
| B | đạt (10/2) | **lỡ (0/2) → streak reset 0** | **0** | **9 mUSDC** | 10/10 — 100% |

Số học khớp công thức đã công bố: kỳ 12 có ngân sách 5 mUSDC + rollover 13 mUSDC từ các kỳ không ai
đạt = 18 mUSDC, chia đều theo streak 1:1 → mỗi ví 9 mUSDC. Kỳ 13 ngân sách 4 mUSDC, chỉ A còn streak
(trọng số 2, B = 0) → A nhận trọn 4 mUSDC. Rút gốc không mất phí.

## Cấu trúc repo

```
contracts/
  src/            # 8 core contract + interfaces/
  script/         # Deploy.s.sol, Seed.s.sol, deploy-fuji.sh (1 lệnh), export-abi.mjs
  test/           # 6 suite: unit + fuzz + invariant + security
  deployments/    # địa chỉ theo chainId
web/
  app/            # Next.js 14 App Router: landing gate, dashboard shell
  components/cozy # 4 tab core + cảnh nhà 3D (R3F), Pet3D (5 nhân vật), Guard, preview/avatar 3D
  e2e/            # Playwright QA (desktop + mobile)
  lib/            # abis, config (địa chỉ), hooks, định dạng số
docs/             # SECURITY_AUDIT.md, DESIGN_SYSTEM.md, CI_LOCAL_RUN.md,
                  # HUONG_DAN_TEST_FUJI.md, DEMO_SCRIPT.md
.github/workflows/ # CI: forge + typecheck + build + Playwright E2E
```

## Công nghệ

- **Smart contract:** Solidity 0.8.24, OpenZeppelin (ReentrancyGuard, Pausable, Ownable, SafeERC20), Foundry.
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, wagmi/viem, TanStack Query, React Three Fiber (nhà 3D + nhân vật), WebAudio (hiệu ứng âm thanh tổng hợp).
- **QA:** Forge (unit/fuzz/invariant), Playwright (E2E 2 viewport).

## Roadmap

1. **Nguồn yield thật:** adapter Aave / Benqi (kiến trúc `MockYieldSource` đã tách sẵn interface) trên fork trước, mainnet sau.
2. **Kỳ theo lịch tuần** thay 180 giây; keeper công khai chốt kỳ đều.
3. **Bảo mật nâng cấp:** timelock + multisig cho admin, audit độc lập cấp 2 trước mainnet (checklist trong báo cáo).
4. **Mở rộng:** mở giới hạn 20 ví/kỳ bằng settlement theo batch/claim có snapshot.

## Ghi chú minh bạch

- mUSDC là **token thử nghiệm của dự án**, không có giá trị tiền thật; AVAX dùng trong demo là testnet faucet.
- "Thưởng/lãi" hiện tại là **ngân sách do sponsor nạp vào `MockYieldSource`** (mock yield), chia theo streak
  **hoàn toàn on-chain** — Savient không giới thiệu đây là lợi suất lending thật; nguồn yield thật nằm ở roadmap.
- Giới hạn đã biết: tối đa 20 ngườ tham gia mỗi kỳ (`finalizeEpoch` lặp toàn bộ ví — đã đo gas), chốt kỳ
  phải tuần tự không bỏ qua, số dư và streak của bạn chỉ an toàn theo đúng chính sách đã công bố ở trên.
