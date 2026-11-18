"use client";

import { contracts } from "@/lib/config";
import { yieldDistributorAbi } from "@/lib/abis";
import { useTx, TxFeedback } from "@/components/useTx";
import { fmt, type VaultData } from "@/components/Dashboard";

/** Nút nhận thưởng + chốt kỳ (public good: ai cũng có thể gọi finalize). */
export function Rewards({ data }: { data: VaultData }) {
  const claim = useTx();
  const finalize = useTx();
  const { claimable, canFinalize, nextEpochToFinalize } = data;

  async function claimYield() {
    await claim.run("Nhận thưởng", [
      {
        label: "Nhận thưởng về ví",
        call: { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "claimYield" },
      },
    ]);
  }

  async function finalizeEpoch() {
    if (nextEpochToFinalize === undefined) return;
    await finalize.run("Chốt kỳ", [
      {
        label: `Chốt kỳ #${nextEpochToFinalize}`,
        call: {
          address: contracts.distributor,
          abi: yieldDistributorAbi,
          functionName: "finalizeEpoch",
          args: [nextEpochToFinalize],
        },
      },
    ]);
  }

  const busy = claim.step !== null || finalize.step !== null;

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">🎁 Thưởng & chốt kỳ</h3>
          <p className="text-xs text-slate-400">
            Thưởng phân bổ theo trọng số streak khi chốt kỳ. Chốt kỳ là hành động công khai — ai gọi cũng được.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-primary"
            disabled={busy || !claimable || claimable === 0n}
            onClick={claimYield}
          >
            Nhận {claimable && claimable > 0n ? `${fmt(claimable)} mUSDC` : "thưởng"}
          </button>
          <button className="btn-ghost" disabled={busy || !canFinalize} onClick={finalizeEpoch}>
            {canFinalize ? `Chốt kỳ #${nextEpochToFinalize}` : "Chưa đến hạn chốt"}
          </button>
        </div>
      </div>
      <TxFeedback state={claim} />
      <TxFeedback state={finalize} />
      <p className="mt-2 text-xs text-slate-500">
        Hợp đồng: vault{" "}
        <a
          className="underline"
          href={`https://testnet.snowtrace.io/address/${contracts.vault}`}
          target="_blank"
          rel="noreferrer"
        >
          {contracts.vault.slice(0, 10)}…
        </a>{" "}
        · distributor{" "}
        <a
          className="underline"
          href={`https://testnet.snowtrace.io/address/${contracts.distributor}`}
          target="_blank"
          rel="noreferrer"
        >
          {contracts.distributor.slice(0, 10)}…
        </a>
      </p>
    </div>
  );
}
