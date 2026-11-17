# Contracts — Streak-based Gamified Savings (IT1)

Solidity 0.8.24 · Foundry · OpenZeppelin Contracts **v5.1.0** (vendored ở `lib/`, đã ghim).

## Cấu trúc

```text
contracts/
  src/
    MockUSDC.sol              ERC-20 6 decimals, mint theo MINTER_ROLE
    StreakVault.sol           Gốc, mục tiêu theo kỳ, gửi/rút theo kỳ, streak
    MockYieldSource.sol       Ngân sách thưởng theo kỳ, release 1 lần cho distributor
    YieldDistributor.sol      Chốt kỳ tuần tự, chia theo streak, rollover, claim
    interfaces/               IStreakVault (struct trả về + events + errors), IMockYieldSource
  script/
    Deploy.s.sol              Deploy + nối distributor, ghi deployments/<chainId>.json
    Seed.s.sol                Mint ví demo + fundEpoch(0, 2), fundEpoch(1, 3)
    export-abi.mjs            Xuất ABI JSON + abis.ts (as const) + deployments.json
    local.ps1                 Anvil: deploy + seed + export (Windows)
  test/                       Unit, demo scenario, fuzz, invariant, gas 20 ví
  deployments/                Địa chỉ theo chain
  abi/                        ABI bàn giao cho frontend (sinh bởi export-abi.mjs)
```

## Lệnh

```bash
forge build
forge test -vvv
forge test --gas-report
forge test --match-test Gas -vv      # in gas finalizeEpoch với 20 ví
node script/export-abi.mjs           # -> abi/ ; hoặc: node script/export-abi.mjs ../web/lib/contracts
```

**Local (Anvil, chain 31337):** terminal 1 `anvil`; terminal 2 tại `contracts/`:

```powershell
.\script\local.ps1 -EpochSeconds 180     # An/Bình/Chi = Anvil account #1/#2/#3
```

Tua thời gian trên Anvil: `cast rpc evm_increaseTime 180; cast rpc evm_mine`.

**Fuji (43113):**

```bash
cast wallet import fuji-deployer --interactive
export FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
export DEPLOYER_ADDRESS=0x...
export EPOCH_SECONDS=180 START_DELAY_SECONDS=180
forge script script/Deploy.s.sol:Deploy --rpc-url "$FUJI_RPC_URL" --account fuji-deployer --sender "$DEPLOYER_ADDRESS"            # dry-run
forge script script/Deploy.s.sol:Deploy --rpc-url "$FUJI_RPC_URL" --account fuji-deployer --sender "$DEPLOYER_ADDRESS" --broadcast
export DEMO_WALLETS=0xAn,0xBinh,0xChi
forge script script/Seed.s.sol:Seed --rpc-url "$FUJI_RPC_URL" --account fuji-deployer --sender "$DEPLOYER_ADDRESS" --broadcast
node script/export-abi.mjs
```

> Seed phải chạy **trước khi kỳ 0 kết thúc** (`fundEpoch` bị chặn sau `epochEnd`). Với `START_DELAY_SECONDS=180` có đủ thời gian.

---

## API cho frontend (IT2)

Mọi số tiền là `uint256` theo đơn vị nhỏ nhất (mUSDC 6 decimals → `parseUnits(x, 6)`).

### StreakVault

| Hàm | Loại | Ghi chú |
| --- | --- | --- |
| `setWeeklyTarget(uint256 amount)` | write | Lần đầu: hiệu lực kỳ hiện tại + kích hoạt ví (tối đa 20 ví). Lần sau: áp dụng từ kỳ kế tiếp, đổi nhiều lần thì lần cuối thắng. |
| `deposit(uint256 amount)` | write | Cần `approve(vault, amount)` trên MockUSDC trước. |
| `withdraw(uint256 amount)` | write | Chỉ gốc của `msg.sender`. Rút được bất kỳ lúc nào. |
| `getAccount(address) → AccountView` | view | Xem struct bên dưới. |
| `getEpochStatus(address, uint256 epoch) → EpochStatus` | view | Lịch sử từng kỳ. |
| `hasStarted() → bool` / `startAt()` / `epochDuration()` | view | Trước `startAt`: hiện "chờ mở". `currentEpoch()` trả 0 trước khi mở. |
| `currentEpoch()` / `epochStart(e)` / `epochEnd(e)` | view | Kỳ e = `[epochStart(e), epochEnd(e))`. |
| `targetAt(address, epoch)` · `getParticipants()` · `participantCount()` · `totalPrincipal()` · `token()` · `MAX_PARTICIPANTS()` | view | |

```solidity
struct AccountView {
    uint256 principal;          // gốc hiện tại
    uint256 currentTarget;      // mục tiêu kỳ hiện tại
    uint256 pendingTarget;      // mục tiêu chờ áp dụng (0 = không có)
    uint256 pendingTargetEpoch; // kỳ áp dụng pendingTarget
    uint256 streak;             // streak tính đến kỳ đã chốt gần nhất
    bool    activated;
    uint256 activationEpoch;
    uint256 currentEpoch;
    uint256 currentDeposited;
    uint256 currentWithdrawn;
    uint256 currentProgress;    // max(0, gửi - rút) kỳ hiện tại
}

struct EpochStatus {
    uint256 target;
    uint256 deposited;
    uint256 withdrawn;
    uint256 progress;
    bool    settled;
    bool    qualified;
    uint256 streakAtSettle;     // = weight của kỳ đó
}
```

### YieldDistributor

| Hàm | Loại | Ghi chú |
| --- | --- | --- |
| `finalizeEpoch(uint256 epoch)` | write | Ai cũng gọi được khi `epoch == nextEpochToFinalize()` và kỳ đã hết hạn. |
| `claimYield() → uint256` | write | Nhận toàn bộ `claimableYield`. |
| `nextEpochToFinalize()` · `canFinalize()` | view | Hiện nút **Chốt kỳ** khi `canFinalize() == true`. |
| `claimableYield(address)` · `claimedYield(address)` · `rewardOf(address, epoch)` | view | Nút **Nhận thưởng** khi `claimableYield > 0`. |
| `rollover()` · `totalClaimable()` · `getEpochSummary(epoch)` | view | Summary: `finalized, funded, rolloverIn, budget, totalWeight, distributed, rolloverOut`. |

### MockYieldSource

`fundEpoch(epoch, amount)` (cần approve; trước `epochEnd(epoch)`), `budgetOf(epoch)`, `released(epoch)`.

### MockUSDC

ERC-20 chuẩn + `mint(to, amount)` (MINTER_ROLE), `decimals() = 6`.

### Events

| Contract | Event |
| --- | --- |
| StreakVault | `TargetScheduled(wallet, amount, effectiveEpoch)`, `Deposited(wallet, epoch, amount, newPrincipal)`, `Withdrawn(wallet, epoch, amount, newPrincipal)`, `AccountEpochSettled(wallet, epoch, qualified, streak)` |
| YieldDistributor | `EpochFinalized(epoch, budget, totalWeight, distributed, rolloverOut, caller)`, `RewardAllocated(wallet, epoch, amount)`, `YieldClaimed(wallet, amount)` |
| MockYieldSource | `EpochFunded(epoch, funder, amount, newBudget)`, `EpochReleased(epoch, amount)` |

### Custom errors → thông báo UI gợi ý

| Error | Gợi ý hiển thị |
| --- | --- |
| `NotStarted()` | Kỳ tiết kiệm chưa mở |
| `ZeroAmount()` | Số tiền phải lớn hơn 0 |
| `InsufficientPrincipal(requested, available)` | Số rút vượt số dư gốc |
| `MaxParticipantsReached()` | Đã đủ 20 người tham gia |
| `EpochNotEnded(epoch, endsAt)` | Kỳ chưa kết thúc |
| `EpochOutOfOrder(expected, got)` | Cần chốt kỳ `expected` trước |
| `NothingToClaim()` | Chưa có thưởng để nhận |
| `FundingClosed(epoch, endsAt)` | Kỳ đã đóng nạp ngân sách |
| ERC20 `ERC20InsufficientAllowance` / `ERC20InsufficientBalance` | Cần approve / thiếu mUSDC |

## Bất biến đã kiểm thử

- `token.balanceOf(vault) >= totalPrincipal` và `Σ principal == totalPrincipal`.
- `token.balanceOf(distributor) >= totalClaimable + rollover`.
- Gas `finalizeEpoch` với 20 ví: ~2.24M (test), dưới giới hạn block Fuji.
