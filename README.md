# Streak-based Gamified Savings

Ứng dụng mobile web giúp sinh viên tạo thói quen tiết kiệm. Mỗi người đặt mục tiêu gửi theo tuần, theo dõi chuỗi tuần hoàn thành (**streak**) và nhận một phần ngân sách thưởng theo trọng số streak. Vault chứa token gửi của nhiều người và ghi riêng số dư gốc theo từng ví. Người dùng có thể rút số dư gốc của mình bất kỳ lúc nào.

**Bản nộp** chạy trên Avalanche Fuji C-Chain với token `mUSDC` và nguồn yield mô phỏng được nạp sẵn. Mọi thay đổi về tiền gốc, streak, phân bổ và nhận thưởng đều phát sinh từ giao dịch on-chain. README mô tả đặc tả triển khai cho team. Các lệnh chạy dự án áp dụng sau khi hai bạn IT tạo các file và script tương ứng.

## 0. Trạng thái triển khai của IT1 (cập nhật 2026-11-18)

### Contract (hoàn tất)

- Bốn contract ở `contracts/src/` đã viết xong và **38 test Foundry pass** (`forge test -vv`), gồm unit test, kịch bản demo 3 ví, invariant kiểm chứng solvency vault/distributor và giới hạn 20 ví.
- Đã **deploy lên Avalanche Fuji C-Chain** (Demo mode: `epochDuration = 180s`):

| Hợp đồng | Địa chỉ |
| --- | --- |
| `MockUSDC` (token) | `0x0EB42B93A431a4E29D3D95aa662A38FC2fee7fee` |
| `StreakVault` | `0x99d22D21a86fc5497E3d4525b001c65f31cEd779` |
| `MockYieldSource` | `0xE3E2B5643B2A9240a57612Fc014E3A4916DfD089` |
| `YieldDistributor` | `0x1db1DBc14678E374bc35943CA27fBB367E7de399` |

- Deployer: `0xBc4c717B826c9E18682D1A0A02D9Dc83EAC69440` · `startAt = 1794980242` · chi tiết trong `contracts/deployments/43113.json`. ABI bàn giao ở `contracts/abi/abis.ts` (đã gồm cả chain 43113 và 31337).
- Seed demo đã nạp: ngân sách kỳ 0 = 2 mUSDC, kỳ 1 = 3 mUSDC. Riêng ví An (deployer) đã chạy thật toàn bộ vòng lặp trên Fuji: đặt mục tiêu 5 → approve + gửi 5 → chờ hết kỳ → chốt kỳ 0–4 (rollover 2+3 mUSDC chuyển đúng về kỳ 4) → nhận đủ 5 mUSDC theo trọng số streak → rút/gửi lại gốc. Mọi giao dịch đối chiếu được trên [Snowtrace](https://testnet.snowtrace.io/address/0x99d22D21a86fc5497E3d4525b001c65f31cEd779). Verify source trên Snowtrace còn treo do giới hạn API key, có thể submit lại sau.
- Ví demo Bình/Chi: cần xin test AVAX ở faucet, sau đó deployer chạy `Seed.s.sol` với `DEMO_WALLETS=<địa chỉ>` để mint mUSDC.

### Frontend `web/` (hoàn tất, IT1 phụ trách UI/UX)

Mobile web Next.js 14 + Wagmi/Viem + Tailwind. Chạy local:

```bash
cd web
npm ci
cp .env.example .env.local   # đã có sẵn .env.local trỏ đúng địa chỉ Fuji
npm run dev                  # http://localhost:3000
```

Dashboard gồm: kết nối ví (injected) + tự chuyển mạng Fuji, streak hero với đếm ngược hạn kỳ, thanh tiến độ kỳ hiện tại, thẻ gốc/số dư/thưởng chờ nhận/ngân sách kỳ, form đặt mục tiêu — gửi (approve tự động khi thiếu allowance) — rút gốc, nút nhận thưởng và nút chốt kỳ (public), lịch sử 8 kỳ gần nhất kèm trạng thái đạt/thiếu và thưởng từng kỳ. Mọi giao dịch hiện trạng thái chờ ký/chờ xác nhận/lỗi kèm link Snowtrace. `npm run build` pass.

## 1. Phạm vi đã chốt

| Tính năng | Bản nộp | Tiêu chí nghiệm thu |
| --- | --- | --- |
| Mục tiêu tiết kiệm | Đặt số tiền mục tiêu mỗi tuần. Cho phép đổi mục tiêu cho kỳ tiếp theo. | Ví đặt mục tiêu 5 mUSDC, gửi 2 rồi 3 mUSDC trong cùng kỳ và dashboard báo đã đạt. |
| Gửi và rút | Gửi qua vault sau khi cấp allowance. Rút một phần hoặc toàn bộ gốc về chính ví gửi. | Rút được khi kỳ đang mở, đang chờ chốt hoặc streak đã về 0. Một ví chỉ rút được gốc của mình. |
| Streak on-chain | Đủ mục tiêu lúc chốt kỳ thì tăng 1. Thiếu mục tiêu hoặc bỏ kỳ thì về 0. | Kết quả đọc được từ contract và có lịch sử theo từng kỳ. |
| Chia và nhận yield | Mock source cấp ngân sách theo kỳ. Distributor chia theo streak và ghi số có thể nhận của từng ví. | Kỳ có trọng số `2:1:0` và ngân sách 3 mUSDC cho kết quả `2:1:0 mUSDC`. Claim chuyển token về đúng ví. |
| Dashboard | Hiện gốc, tiến độ kỳ, hạn chót, streak, lịch sử kỳ, thưởng có thể nhận và thưởng đã nhận. | Mỗi thao tác hiển thị trạng thái ký ví, chờ xác nhận, thành công hoặc lỗi. |

**Chọn tối đa một tính năng cộng điểm sau khi luồng chính chạy ổn.** Nếu muốn giữ điểm khác biệt từ đề xuất BA, ưu tiên **Friend Groups**. Dùng mã mời, hiển thị trạng thái đạt mục tiêu của các thành viên và tính streak nhóm bằng số kỳ liên tiếp tất cả thành viên đạt mục tiêu. Thành viên mới được tính từ kỳ tiếp theo. Quyền truy cập nhóm và cách hiển thị tên ví thuộc lớp ứng dụng. Các lựa chọn cộng điểm khác là một adapter Aave hoặc BENQI trên mainnet fork, NFT milestone, hoặc nhắc gửi qua Telegram.

| Ý tưởng BA | Hướng phát triển sau MVP |
| --- | --- |
| Base interest + bonus interest | Khi có nguồn yield thật, thiết kế phần base theo mức đóng góp vốn và phần bonus theo streak. Chốt tỷ lệ và nguồn trả trước khi triển khai. |
| Auto-saving, nhiệm vụ, freeze/revive, lucky wheel | Auto-saving cần cơ chế ủy quyền và hủy lịch. Freeze/revive cần định nghĩa ảnh hưởng lên streak và điều kiện nhận thưởng. Nhiệm vụ và lucky wheel cần ngân sách thưởng riêng theo luật được công bố. |
| Sponsored challenges, yield optimization | Thử ngân sách tài trợ cố định cho thử thách trước. Tích hợp một lending adapter trên fork rồi mới xem xét phân bổ giữa nhiều giao thức. |
| Doanh thu | BA dùng tài trợ thử thách làm giả thuyết chính. Hoa hồng giới thiệu, phí theo yield và phí theo TVL là giả thuyết để kiểm chứng với đối tác. Luồng Fuji gồm gửi, rút và claim với phí gas testnet. |

## 2. Luật tính tiền và streak

- **Epoch** là một kỳ tiết kiệm chung. Cấu hình chuẩn là `7 days`. Bản Fuji dùng trong buổi demo có thể triển khai riêng với kỳ `180 seconds` và gắn nhãn **Demo mode**. `startAt` và `epochDuration` cố định sau khi deploy. Với thời điểm `t >= startAt`, kỳ hiện tại là `(t - startAt) / epochDuration` lấy phần nguyên. Mọi kỳ dùng khoảng `[start, end)` theo `block.timestamp`. Trước `startAt`, giao diện hiển thị trạng thái chờ mở và contract từ chối đặt mục tiêu hoặc gửi tiền.
- **Mục tiêu** phải lớn hơn 0. Lần đặt đầu tiên có hiệu lực trong kỳ đang mở. Các lần đổi sau áp dụng từ kỳ kế tiếp. Nếu đổi nhiều lần trong cùng kỳ, lần cuối quyết định mục tiêu kỳ kế tiếp. Lưu lịch sử mức mục tiêu theo kỳ có hiệu lực để kỳ chốt muộn vẫn dùng đúng mục tiêu cũ.
- **Tiến độ kỳ** bằng `max(0, tổng gửi qua vault − tổng rút gốc qua vault trong kỳ)`. Cộng được nhiều lần gửi. Ví dụ gửi 5 rồi rút 1 trong cùng kỳ thì tiến độ còn 4, kể cả khi khoản rút đến từ số dư cũ. Luật này ngăn dùng một khoản tiền để gửi, rút rồi gửi lại cho đủ mục tiêu. Claim thưởng và chuyển ERC-20 trực tiếp vào địa chỉ vault nằm ngoài tiến độ.
- **Chốt kỳ** dựa trên mục tiêu và giao dịch đã ghi cho đúng kỳ. Đạt mục tiêu thì `streak = streak_trước + 1` và `weight = streak`; thiếu mục tiêu thì cả hai về 0. Ví chưa kích hoạt mục tiêu trong kỳ có trọng số 0. Kỳ đã chốt giữ nguyên kết quả dù ví rút gốc hoặc mất streak ở kỳ sau.
- **Quyền nhận thưởng** phát sinh khi kỳ được chốt. Thưởng đã ghi nhận có thể claim sau, kể cả khi ví rút hết gốc hoặc streak về 0. Dashboard tách `claimableYield` và `claimedYield` để thể hiện số chờ nhận và số đã về ví.

Tính toán token bằng số nguyên theo đơn vị nhỏ nhất. Với `mUSDC` 6 chữ số thập phân, 5 mUSDC được ghi là `5_000_000`.

```text
budget = mockYieldCuaKy + rolloverTuKyTruoc
reward[wallet] = floor(budget * weight[wallet] / totalWeight)
rollover = budget - sum(reward)
```

Khi `totalWeight = 0`, chuyển toàn bộ `budget` sang kỳ sau. Nếu ngân sách kỳ bằng 0, streak vẫn được chốt bình thường. Ví dụ ngân sách 3 mUSDC và trọng số `2, 1, 0` cho thưởng lần lượt `2, 1, 0 mUSDC`. Dùng `Math.mulDiv` để tính theo đơn vị token và làm tròn xuống.

## 3. Thiết kế contract và API cho frontend

| Thành phần | Trách nhiệm | Hàm tối thiểu |
| --- | --- | --- |
| `MockUSDC` | ERC-20 thử nghiệm 6 decimals. Deployer mint token demo vào các ví và dùng một phần để cấp ngân sách thưởng. | ERC-20 chuẩn, `mint(to, amount)` có quyền minter. |
| `StreakVault` | Giữ gốc, lưu mục tiêu theo kỳ, tiền gửi/rút từng kỳ, streak và kết quả từng ví. | `setWeeklyTarget(amount)`, `deposit(amount)`, `withdraw(amount)`, `getAccount(wallet)`, `getEpochStatus(wallet, epoch)`, `currentEpoch()`, `epochEnd(epoch)`. Hàm `settleEpoch(epoch)` chỉ gọi được từ distributor. |
| `MockYieldSource` | Nhận token tài trợ theo kỳ qua `fundEpoch` trước thời điểm kỳ kết thúc. Chuyển ngân sách của kỳ sang distributor khi chốt. | `fundEpoch(epoch, amount)`, `release(epoch)` chỉ cho distributor và chỉ giải ngân một lần. |
| `YieldDistributor` | Chốt lần lượt các kỳ đã kết thúc, lấy trọng số từ vault, ghi số thưởng, quản lý rollover và claim. | `nextEpochToFinalize()`, `finalizeEpoch(epoch)`, `claimYield()`, `claimableYield(wallet)`, `claimedYield(wallet)`, `rewardOf(wallet, epoch)`. |

**Luồng chốt kỳ.** Bất kỳ ví nào cũng có thể gọi `finalizeEpoch(epoch)` khi đồng thời thỏa `epoch == nextEpochToFinalize` và `block.timestamp >= epochEnd(epoch)`. Distributor gọi vault chốt streak, nhận token từ mock source, ghi khoản thưởng theo từng ví và tăng con trỏ kỳ trong cùng một giao dịch. Giao dịch revert thì toàn bộ lần chốt rollback. Nếu bỏ qua nhiều kỳ, chốt lần lượt từ kỳ cũ nhất. Giao dịch gửi/rút luôn ghi vào kỳ theo timestamp của block, kể cả khi các kỳ cũ đang chờ chốt.

**State và giới hạn demo.** Dùng danh sách tối đa 20 ví kích hoạt mục tiêu, ghi mỗi ví một lần lúc đặt mục tiêu đầu tiên. Kết quả mỗi kỳ xét trên ví đã kích hoạt tại kỳ đó. Lưu mục tiêu theo các mốc kỳ có hiệu lực, tra ngược mốc gần nhất bằng tìm kiếm nhị phân. Đo gas chốt kỳ với đủ 20 ví trước khi deploy. Vault ERC-20 tùy chỉnh phù hợp với số dư gốc riêng và thưởng theo streak. ERC-4626 là tùy chọn cần đánh giá nếu bổ sung share token sau này.

**Bất biến khi code.** Vault giữ ít nhất số mUSDC bằng `totalPrincipal`. Distributor giữ ít nhất tổng `claimableYield` cộng `rollover` sau khi chốt. `withdraw` chỉ ghi giảm gốc của `msg.sender`, còn `claimYield` xóa khoản chờ nhận trước khi chuyển token. Dùng `SafeERC20`, Checks-Effects-Interactions và `ReentrancyGuard` cho các đường chuyển token. Khởi tạo liên kết distributor một lần trong vault và mock source. Gốc của người dùng chỉ đi ra qua `withdraw` do chính ví sở hữu gọi.

**Events để bàn giao ABI.** `TargetScheduled`, `Deposited`, `Withdrawn`, `AccountEpochSettled`, `EpochFinalized`, `YieldClaimed`. Các event tài khoản ghi địa chỉ ví và các event theo kỳ ghi ID kỳ. IT contract bàn giao cả kiểu dữ liệu trả về của `getAccount` và `getEpochStatus`, gồm gốc, mục tiêu hiện tại, mục tiêu đang chờ, tổng gửi/rút của kỳ, `settled`, `qualified` và streak lúc chốt. UI đọc `rewardOf` cho lịch sử yield theo kỳ.

## 4. Hướng dẫn thực hiện

### A. Dựng repo và chạy local

Stack đề xuất là **Solidity + Foundry + OpenZeppelin Contracts**, và **Next.js App Router + TypeScript + Wagmi/Viem**. Bản demo dùng ví trình duyệt qua injected connector. Embedded wallet có thể tích hợp sau khi luồng ký giao dịch đã ổn. Chuẩn bị Git, Foundry (`forge`, `cast`, `anvil`), Node.js ≥ 20.9 và npm.

Cấu trúc repo cần tạo:

```text
contracts/
  src/MockUSDC.sol
  src/StreakVault.sol
  src/MockYieldSource.sol
  src/YieldDistributor.sol
  script/Deploy.s.sol
  test/
web/
  app/
  lib/contracts/
  .env.example
README.md
```

Chạy ở repo mới để tạo khung:

```bash
git init
forge init contracts --no-git
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-git
cd ..
npx create-next-app@latest web --ts --tailwind --app --use-npm --yes
cd web
npm install wagmi viem @tanstack/react-query
```

Thống nhất version dependency khi tạo repo, commit `package-lock.json` và ghim phiên bản OpenZeppelin đã kiểm thử. Sau khi viết contract, chạy `forge test -vvv` và `forge test --gas-report` trong `contracts/`. Dùng `anvil` ở terminal riêng để deploy local, với RPC `http://127.0.0.1:8545` và chain ID `31337`. Test thời gian bằng `vm.warp` trong Foundry hoặc RPC của Anvil khi diễn tập local.

### B. Deploy Fuji

1. Thêm mạng **Avalanche Fuji C-Chain**, chain ID **43113**, RPC `https://api.avax-test.network/ext/bc/C/rpc`. Chuẩn bị test AVAX cho deployer và ba ví demo qua Avalanche Builder Hub. Explorer `https://testnet.snowtrace.io/` dùng để mở giao dịch từ dashboard.
2. Viết `Deploy.s.sol:Deploy` để đọc `EPOCH_SECONDS` và `START_DELAY_SECONDS`, tính `startAt`, deploy token → vault → mock source → distributor, rồi đăng ký distributor vào vault và mock source. Script dùng `vm.startBroadcast()` và in địa chỉ contract. Lưu địa chỉ và ABI theo từng chain. Đặt `EPOCH_SECONDS=604800` cho bản tuần hoặc `180` cho buổi demo.
3. Dùng các lệnh sau từ thư mục `contracts/` sau khi script đã có. Nhập khóa của ví testnet vào keystore cục bộ. Điền `DEPLOYER_ADDRESS` bằng địa chỉ công khai của cùng ví trước khi chạy. Chạy thử bằng cách bỏ cờ `--broadcast`, rồi chạy lại với cờ này khi mô phỏng thành công.

```bash
cast wallet import fuji-deployer --interactive
export FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
export EPOCH_SECONDS=180
export START_DELAY_SECONDS=180
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$FUJI_RPC_URL" \
  --account fuji-deployer \
  --sender "$DEPLOYER_ADDRESS" \
  --broadcast
```

4. Mint đủ mUSDC cho các ví demo. Deployer gọi `approve` cho mock source, sau đó `fundEpoch(0, 2_000_000)` và `fundEpoch(1, 3_000_000)` trước hạn của từng kỳ. Kiểm tra ba ví đã có test AVAX và dashboard đang dùng đúng bộ địa chỉ Fuji.

### C. Nối frontend

IT contract bàn giao ABI JSON và địa chỉ deploy cho IT frontend. Frontend có thể dựng UI với adapter dữ liệu mẫu trước, sau đó nối Wagmi bằng cùng kiểu dữ liệu.

```dotenv
NEXT_PUBLIC_CHAIN_ID=43113
NEXT_PUBLIC_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_TOKEN_ADDRESS=
NEXT_PUBLIC_VAULT_ADDRESS=
NEXT_PUBLIC_DISTRIBUTOR_ADDRESS=
```

Điền địa chỉ vào `web/.env.local`, giữ bộ tên biến trong `web/.env.example`, chạy `npm ci` rồi `npm run dev` tại `web/`. Đặt khóa ví trong keystore, bên ngoài biến cấu hình public của Next.js.

1. **Kết nối ví và đọc chain.** Cho chuyển mạng khi sai chain. Đọc mục tiêu, số dư gốc, số dư token, allowance, kỳ hiện tại, hạn chốt và số thưởng. Dùng `parseUnits` / `formatUnits` và `bigint` cho số tiền.
2. **Gửi, rút và claim.** Nếu allowance thiếu, gọi `approve(vault, amount)` và chờ receipt thành công trước khi gọi `deposit`. Với mỗi giao dịch, đợi receipt rồi đọc lại dữ liệu. Hiện nguyên nhân lỗi phù hợp như thiếu test AVAX, thiếu mUSDC, số rút vượt gốc hoặc người dùng từ chối ký.
3. **Lịch streak.** Hiển thị kỳ đang mở, kỳ đủ/thiếu mục tiêu đã chốt và kỳ đã hết hạn đang chờ chốt. Dùng giờ của block để xác định kỳ và giữ đồng hồ đếm ngược ở mức hiển thị. Thêm nút **Chốt kỳ** khi `nextEpochToFinalize` đã hết hạn và nút **Nhận thưởng** khi số chờ nhận dương. Lịch sử ghi số được phân bổ từng kỳ, trạng thái claim lấy từ khoản chờ nhận và tổng đã claim.

## 5. Phân công 3 người

| Người | Trách nhiệm chính | Bàn giao |
| --- | --- | --- |
| **BA** | Xác nhận luật mục tiêu, epoch, reset, rút gốc, chia thưởng và backlog từ ý tưởng ban đầu. Viết tiêu chí nghiệm thu, chuẩn bị ba ví thử và kịch bản pitch. | Bảng input/kết quả mong đợi theo kỳ, checklist nghiệm thu, kịch bản demo và pitch. |
| **IT 1 — Contract** | Viết Foundry contracts, kiểm thử giới hạn kỳ và dòng tiền. Viết script deploy, nạp ngân sách và kiểm tra gas chốt kỳ. | Interface và ABI sơ bộ ngay ngày đầu, sau đó ABI đã build, địa chỉ Fuji, hash deploy và hướng dẫn seed demo. |
| **IT 2 — Frontend** | Dựng mobile web, cấu hình ví, đọc contract, nối giao dịch và hiện lịch streak. Chuẩn bị web demo và dẫn link explorer. | App dùng đúng ABI, địa chỉ và chain ID, dashboard có đầy đủ luồng gửi, rút, chốt và claim. |

| Mốc tính từ ngày bắt đầu | Kết quả cần có |
| --- | --- |
| Ngày 1 | BA chốt bảng luật. Hai IT ký thống nhất tên hàm, kiểu dữ liệu, event và các lỗi cần hiển thị. Frontend bắt đầu với dữ liệu mẫu. |
| Ngày 2–3 | Contract test được đặt mục tiêu, gửi, rút, streak tăng/reset, chia và claim. Frontend ráp luồng ví và dashboard trên Anvil. |
| Ngày 4–5 | Deploy Fuji, nối ABI và địa chỉ thật, kiểm thử luồng ba ví. BA chạy checklist trên bản demo. |
| Ngày 6–7 | Sửa lỗi, diễn tập và ghi hình dự phòng. Chỉ nhận thêm một tính năng cộng điểm khi checklist MVP đã đạt. |

## 6. Kịch bản demo và tiêu chí nộp

Dùng ba ví **An**, **Bình**, **Chi**. Chuẩn bị kỳ demo ngắn trên Fuji và diễn tập trước bằng Anvil. Nạp riêng 2 mUSDC mock yield cho kỳ 0 và 3 mUSDC cho kỳ 1.

| Kỳ | Giao dịch | Streak cuối kỳ (An, Bình, Chi) | Thưởng kỳ (mUSDC) |
| --- | --- | --- | --- |
| 0 | An, Bình đặt mục tiêu 5, mỗi người gửi 5. Chi chưa tham gia. | `1, 1, 0` | `1, 1, 0` |
| 1 | An gửi 5. Bình bỏ kỳ. Chi đặt mục tiêu 5 và gửi 5. | `2, 0, 1` | `2, 0, 1` |

Sau khi chốt kỳ 1, cho Bình rút **5 mUSDC tiền gốc** và claim **1 mUSDC thưởng kỳ 0**. Cho An claim **3 mUSDC** từ hai kỳ. Hiện số dư trước/sau và giao dịch Fuji để đối chiếu.

- [ ] Forge test đạt các ca gửi nhiều lần, đổi mục tiêu kỳ sau, giao dịch đúng ranh giới kỳ, gửi rồi rút để kiểm tra tiến độ ròng, bỏ nhiều kỳ, kích hoạt mục tiêu muộn và rút trong lúc kỳ chờ chốt.
- [ ] Kiểm thử chốt sai kỳ, chốt trùng, claim trùng, chốt khi ngân sách bằng 0, rollover khi tổng trọng số bằng 0 và phần dư làm tròn. Đối chiếu tổng tiền claimable và rollover với số dư distributor.
- [ ] Kiểm thử 20 ví, kiểm tra gas chốt kỳ và thử một ví rút vượt gốc của chính mình. Đối chiếu `totalPrincipal` với số dư vault sau chuỗi gửi/rút.
- [ ] UI đã chạy trên Fuji với dữ liệu thật, xử lý sai mạng và giao dịch thất bại. Có địa chỉ deploy, link giao dịch và clip demo dự phòng của một lượt chạy thực tế.

## Tài liệu triển khai

- [Avalanche Fuji C-Chain và hướng dẫn thêm mạng](https://build.avax.network/academy/blockchain/x402-payment-infrastructure/04-x402-on-avalanche/02-network-setup) · [Avalanche Builder Hub Console](https://build.avax.network/console)
- [Cài Foundry](https://www.getfoundry.sh/introduction/installation) · [Anvil và local fork](https://www.getfoundry.sh/anvil) · [OpenZeppelin ERC-20](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20)
- [Cài Next.js](https://nextjs.org/docs/app/getting-started/installation) · [Chờ transaction receipt với Wagmi](https://wagmi.sh/react/api/hooks/useWaitForTransactionReceipt) · [Viem chains](https://viem.sh/docs/chains/introduction)
