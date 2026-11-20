# Hướng dẫn test giao dịch thật trên Fuji (cho ngườ vận hành)

Mục tiêu: chứng minh trọn vòng `target → approve → deposit → finalize → claim → withdraw`
bằng **hai ví thật trên Avalanche Fuji**, lưu 5–7 transaction hash đưa vào README làm bằng chứng.
Ước lượng: 30–45 phút. Không cần viết code — chỉ chạy lệnh có sẵn + thao tác trên app.

---

## 0. Chuẩn bị (một lần)

- Cài [Foundry](https://getfoundry.sh) (`forge`, `cast`) và Node 20+.
- Có **private key deployer** (ví đã deploy contract cũ — địa chỉ trong
  `contracts/deployments/43113.json` trường `deployer`). Không để key vào git;
  dùng biến môi trường trong terminal.
- Hai ví demo A/B: tạo bằng MetaMask, xuất private key, giữ riêng (không commit).

```bash
# Terminal dùng Git Bash (Windows) hoặc bash/macOS
export FUJI_RPC="https://api.avax-test.network/ext/bc/C/rpc"
export PRIVATE_KEY="0x..."            # private key deployer (có AVAX testnet)
export DEMO_A="0x..."                 # địa chỉ ví A
export DEMO_B="0x..."                 # địa chỉ ví B
```

**Xin AVAX testnet** cho deployer và A/B (mỗi ví ~0.5 AVAX là dư):
<https://core.app/tools/testnet-faucet/> (cần đăng nhập mạng xã hội) hoặc
<https://faucet.avax.network/>. Kiểm tra:

```bash
cast balance $DEMO_A --rpc-url $FUJI_RPC     # phải > 0
```

---

## 1+2. Deploy contract mới + seed — CHỈ 1 LỆNH

> Yêu cầu trước: private key ví deployer, ví A/B đã có AVAX testnet (mục 0).

```bash
cd contracts
PRIVATE_KEY=0x... DEMO_A=0x... DEMO_B=0x... bash script/deploy-fuji.sh
```

Script tự làm hết: kiểm tra gas → deploy 8 contract (kỳ 180 giây, mở kỳ sau 60 giây) →
seed fund theo **kỳ hiện tại** + mint 100 mUSDC cho A/B → in địa chỉ mới.
Địa chỉ cũ trong `deployments/43113.json` bị ghi đè — đó là dự kiến (bản cũ kẹt ~371 kỳ, bỏ).

- Nếu muốn verify source trên Snowtrace, thêm `--verify` (cần API key); không có thì
  verify tay sau trên <https://testnet.snowtrace.io> (mất 2 phút).
- Deploy xong **chụp màn hình** phần địa chỉ cuối output.

## 3. Cập nhật frontend trỏ sang địa chỉ mới

Cách nhanh nhất nếu deploy Vercel: vào **Vercel → Project Cozy Save → Settings →
Environment Variables**, sửa 3 biến (lấy giá trị từ `deployments/43113.json`):

| Biến | Trường trong JSON |
|---|---|
| `NEXT_PUBLIC_TOKEN_ADDRESS` | `token` |
| `NEXT_PUBLIC_VAULT_ADDRESS` | `vault` |
| `NEXT_PUBLIC_DISTRIBUTOR_ADDRESS` | `distributor` |
| `NEXT_PUBLIC_YIELD_SOURCE_ADDRESS` | `yieldSource` |
| `NEXT_PUBLIC_DAILYCHECKIN_ADDRESS` | `dailyCheckIn` |
| `NEXT_PUBLIC_FAUCET_ADDRESS` | `faucetDrip` |
| `NEXT_PUBLIC_GOAL_ADDRESS` | `goal` |
| `NEXT_PUBLIC_NFT_ADDRESS` | `nft` |

Rồi **Redeploy** (Deployments → ⋯ → Redeploy). Nếu chạy local thì sửa `web/.env.local`.

## 4. Chạy vòng giao dịch thật với ví A và B (~15 phút, kỳ 180 giây)

Mở app **không** dùng `?demo=1`. Cả hai ví đều làm theo luồng dưới, **lưu mọi tx hash**
(app hiện link Snowtrace sau mỗi bước — bấm và copy hash).

**Ví A — gửi đủ cả 3 kỳ; Ví B — cố tình lỡ 1 kỳ** (để demo streak khác nhau):

1. Tab **Mục tiêu** → chọn preset `5 mUSDC` → **Lưu** → ký ví.
   (Bước đầu của ví mới có thể dùng nút "Nhận 5 mUSDC miễn phí & bắt đầu" ở tab Nhà.)
2. Tab **Nhà** → **Gửi … mUSDC hoàn thành tầng** → ký `approve` → ký `deposit`.
3. Đợi đếm ngược kỳ kết thúc (180 giây). Nhờ ai đó (hoặc tự) **Chốt kỳ**:
   tab **Thưởng** → nút "Chốt kỳ #N". Với kỳ có ngân sách được seed, ai gọi cũng được.
4. **Nhận lãi về ví** (tab Thưởng → "Nhận lãi về ví").
5. Ở kỳ 2: ví A gửi tiếp đủ; **ví B không gửi gì** → kỳ chốt sẽ thấy streak B reset về 0.
6. Kỳ 3: cả hai gửi tiếp → chốt kỳ → nhận lãi. Ví A streak 3, ví B streak 1–2.
7. Cả hai **Rút gốc** (tab Nhà → "Rút gốc") → kiểm tra nhận **đủ 100%**.

**Bảng bằng chứng** — điền vào README (mục "Bằng chứng giao dịch Fuji"):

| Bước | Ví | Tx hash |
|---|---|---|
| setWeeklyTarget | A | `0x…` |
| approve + deposit | A | `0x…` |
| deposit (lỡ kỳ) | B | — |
| finalizeEpoch kỳ 1 | bất kỳ | `0x…` |
| finalizeEpoch kỳ 2 | bất kỳ | `0x…` |
| claimYield | A / B | `0x…` / `0x…` |
| withdraw | A | `0x…` |

Mỗi hash dán lên <https://testnet.snowtrace.io/tx/0x…> phải thấy receipt thành công
(status = 1). Chụp màn hình 2–3 hash tiêu biểu để dự phòng khi pitch.

## 5. Đối chiếu số liệu trên chain (tùy chọn, 5 phút, lệnh đọc không ký)

```bash
export VAULT=$(grep -o '"vault": "[^"]*"' contracts/deployments/43113.json | cut -d'"' -f4)
export DISTRIBUTOR=$(grep -o '"distributor": "[^"]*"' contracts/deployments/43113.json | cut -d'"' -f4)

cast call $VAULT "currentEpoch()(uint256)" --rpc-url $FUJI_RPC
cast call $VAULT "getAccount(address)(uint256,uint256,uint256,uint256,bool,uint256,uint256,uint256,uint256,uint256,uint256,uint256)" $DEMO_A --rpc-url $FUJI_RPC
cast call $DISTRIBUTOR "nextEpochToFinalize()(uint256)" --rpc-url $FUJI_RPC
```

Hai số `currentEpoch` và `nextEpochToFinalize` lệch nhau ≤ 1 tức không bị kẹt kỳ.

---

## Nếu CI trên GitHub vẫn failure (chẩn đoán 2 giây, không có step)

Run [gần nhất](https://github.com/bphong-cyrus/Streak-based-gamified-savings/actions) thất bại
sau **~2 giây, job không có bước nào, không runner** — đây là lỗi hạ tầng tài khoản,
không phải test fail. Kiểm tra theo thứ tự:

1. **Email của GitHub** (tài khoản chủ repo) — thường có thông báo "workflow run failed
   to start" kèm nguyên nhân (quota, xác minh, billing).
2. Repo **private**? Free plan hết 2 000 phút/tháng → job fail ngay. Vào
   **Settings → Billing and licensing** xem phút Actions còn lại.
   → Nếu hết: để repo **public** (testnet demo nên public là bình thường) hoặc chờ reset chu kỳ.
3. **Settings → Actions → General**: Actions permission phải là "Allow all actions".
4. Tài khoản mới/chưa xác minh: GitHub yêu cầu xác minh (thẻ hoặc tài khoản học sinh)
   trước khi chạy Actions — kiểm tra banner vàng ở đầu trang Actions.

Sau khi khắc phục: tab Actions → chọn workflow → **Re-run all jobs** (hoặc push commit mới).
CI hiện có 3 job: Foundry tests, Next build, Playwright E2E (chạy trên bản production build).

---

## Checklist trước khi gửi lại chấm

- [ ] Vercel mở trên phiên sạch (cửa sổ ẩn danh) không rơi vào "Có chút trục trặc nhỏ";
      nếu có lỗi, **bấm nút "⚠ Có lỗi" góc dưới-trái, chụp màn hình nội dung gửi lại** để debug.
- [ ] `deployments/43113.json` là địa chỉ MỚI, khớp env trên Vercel.
- [ ] CI xanh ở đúng commit nộp (3 job đều pass).
- [ ] README có bảng tx hash (mục 4) — 5–7 hash, mở được trên Snowtrace.
- [ ] Bảng đối chiếu hai ví A/B: streak khác nhau sau kỳ B lỡ, lãi chia đúng công thức.
