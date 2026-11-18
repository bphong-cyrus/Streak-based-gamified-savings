"use client";

import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { streakVaultAbi, yieldDistributorAbi, mockYieldSourceAbi } from "@/lib/abis";
import { fmt } from "@/components/Dashboard";

const SHOWN_EPOCHS = 8;

interface EpochRow {
  epoch: bigint;
  target: bigint;
  progress: bigint;
  settled: boolean;
  qualified: boolean;
  streakAtSettle: bigint;
  reward: bigint;
  budget: bigint;
  distributed: bigint;
}

/** Lịch các kỳ gần nhất: tiến độ, kết quả chốt, streak và thưởng từng kỳ. */
export function EpochHistory({ currentEpoch }: { currentEpoch: bigint | undefined }) {
  const { address } = useAccount();

  const epochs = useMemo(() => {
    if (currentEpoch === undefined) return [];
    const from = currentEpoch > BigInt(SHOWN_EPOCHS - 1) ? currentEpoch - BigInt(SHOWN_EPOCHS - 1) : 0n;
    const list: bigint[] = [];
    for (let e = from; e <= currentEpoch; e++) list.push(e);
    return list.reverse(); // mới nhất lên đầu
  }, [currentEpoch]);

  const calls = useMemo(
    () =>
      address && epochs.length > 0
        ? epochs.flatMap((e) => [
            { address: contracts.vault, abi: streakVaultAbi, functionName: "getEpochStatus", args: [address, e] },
            { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "rewardOf", args: [address, e] },
            { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "getEpochSummary", args: [e] },
          ])
        : [],
    [address, epochs],
  );

  const { data } = useReadContracts({
    contracts: calls,
    query: { refetchInterval: 10_000, enabled: calls.length > 0 },
  });

  const rows: EpochRow[] = useMemo(() => {
    if (!data) return [];
    return epochs.map((e, i) => {
      const status = data[i * 3]?.result as
        | { target: bigint; progress: bigint; settled: boolean; qualified: boolean; streakAtSettle: bigint }
        | undefined;
      const reward = (data[i * 3 + 1]?.result as bigint | undefined) ?? 0n;
      const summary = data[i * 3 + 2]?.result as
        | { finalized: boolean; budget: bigint; distributed: bigint }
        | undefined;
      return {
        epoch: e,
        target: status?.target ?? 0n,
        progress: status?.progress ?? 0n,
        settled: status?.settled ?? false,
        qualified: status?.qualified ?? false,
        streakAtSettle: status?.streakAtSettle ?? 0n,
        reward,
        budget: summary?.budget ?? 0n,
        distributed: summary?.distributed ?? 0n,
      };
    });
  }, [data, epochs]);

  if (!address || epochs.length === 0) return null;

  return (
    <div className="card">
      <h3 className="mb-3 font-semibold">📅 Lịch sử kỳ</h3>
      <ul className="space-y-2">
        {rows.map((r) => {
          const isCurrent = r.epoch === currentEpoch;
          const waiting = !isCurrent && !r.settled;
          return (
            <li
              key={r.epoch.toString()}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
                isCurrent
                  ? "border-flame-500/40 bg-flame-500/10"
                  : "border-white/5 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
                    r.settled
                      ? r.qualified
                        ? "bg-mint-500/20"
                        : "bg-red-500/20"
                      : isCurrent
                        ? "bg-flame-500/20"
                        : "bg-white/10"
                  }`}
                >
                  {r.settled ? (r.qualified ? "✅" : "❌") : isCurrent ? "🔥" : "⏳"}
                </span>
                <div>
                  <div className="font-medium text-slate-100">
                    Kỳ #{r.epoch.toString()}
                    {isCurrent && <span className="ml-2 text-xs text-flame-400">đang diễn ra</span>}
                    {waiting && <span className="ml-2 text-xs text-slate-400">chờ chốt</span>}
                  </div>
                  <div className="text-xs text-slate-400">
                    {r.target > 0n ? (
                      <>
                        Mục tiêu {fmt(r.target)} · gửi {fmt(r.progress)}
                        {r.settled && (
                          <>
                            {" "}
                            → {r.qualified ? `đạt, streak ${r.streakAtSettle.toString()} 🔥` : "không đạt, streak về 0"}
                          </>
                        )}
                      </>
                    ) : (
                      "Chưa đặt mục tiêu"
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={r.reward > 0n ? "font-semibold text-mint-400" : "text-slate-500"}>
                  {r.settled ? (r.reward > 0n ? `+${fmt(r.reward)}` : "+0") : "—"} mUSDC
                </div>
                {r.settled && (
                  <div className="text-[11px] text-slate-500">
                    ngân sách {fmt(r.budget)} · chia {fmt(r.distributed)}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
