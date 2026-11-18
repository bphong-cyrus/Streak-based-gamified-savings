import type { VaultData } from "@/lib/useVaultData";

const M = 1_000_000n; // 1 mUSDC

/** Dữ liệu mẫu để xem trước giao diện (không cần ví) cho demo/pitch. */
export function buildMockData(): VaultData {
  return {
    address: "0xCozy00000000000000000000000000000Demo42",
    startAt: BigInt(Math.floor(Date.now() / 1000) - 6 * 180),
    epochDuration: 180n,
    hasStarted: true,
    participants: [
      "0xCozy00000000000000000000000000000Demo42",
      "0xAn1111111111111111111111111111111111",
      "0xBin222222222222222222222222222222222",
    ],
    nextEpochToFinalize: 5n,
    canFinalize: false,
    rollover: 1500000n,
    totalClaimable: 2300000n,
    account: {
      principal: 25n * M,
      currentTarget: 5n * M,
      pendingTarget: 0n,
      pendingTargetEpoch: 0n,
      streak: 3n,
      activated: true,
      activationEpoch: 2n,
      currentEpoch: 6n,
      currentDeposited: 3n * M,
      currentWithdrawn: 0n,
      currentProgress: 3n * M,
      depositCount: 9n,
    },
    tokenBalance: 75n * M,
    allowance: 100n * M,
    claimable: 800000n,
    claimed: 4700000n,
    currentBudget: 2n * M,
    countdown: "02:14",
  };
}
