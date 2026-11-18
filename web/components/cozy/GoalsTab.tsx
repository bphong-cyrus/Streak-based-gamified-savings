"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { streakVaultAbi, yieldDistributorAbi } from "@/lib/abis";
import { fmt, parseAmount } from "@/lib/format";
import { TxFeedback, useTx } from "@/components/useTx";
import type { VaultData } from "@/lib/useVaultData";

const SHOWN_EPOCHS = 8;

/** Tab Goals: đặt mục tiêu + lịch sử các kỳ. */
export function GoalsTab({ data }: { data: VaultData }) {
  const { run, step, hash, error } = useTx();
  const { account } = data;
  const [input, setInput] = useState("");

  async function setTarget() {
    const amt = parseAmount(input);
    if (!amt) return;
    const ok = await run("Đặt mục tiêu", [
      {
        label: "Đang lưu mục tiêu…",
        call: { address: contracts.vault, abi: streakVaultAbi, functionName: "setWeeklyTarget", args: [amt] },
      },
    ]);
    if (ok) setInput("");
  }

  return (
    <div className="space-y-3 px-4 pb-28 pt-2">
      {/* đặt mục tiêu */}
      <div className="card-cream p-4">
        <h3 className="font-cozy text-lg font-bold">🎯 Mục tiêu tuần</h3>
        <p className="mt-0.5 text-xs font-semibold text-cocoa-500">
          {account?.activated ? "Thay đổi áp dụng từ kỳ kế tiếp." : "Lần đầu đặt có hiệu lực ngay kỳ này."}{" "}
          Hiện tại: {fmt(account?.currentTarget)} mUSDC/tuần
        </p>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <input
              className="input-cozy pr-16"
              inputMode="decimal"
              placeholder="VD: 5"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cocoa-500">mUSDC</span>
          </div>
          <button className="btn-cozy shrink-0" disabled={step !== null || !parseAmount(input)} onClick={setTarget}>
            Lưu
          </button>
        </div>
        <TxFeedback state={{ step, hash, error }} />
      </div>

      <EpochHistory currentEpoch={account?.currentEpoch} />
    </div>
  );
}

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

function EpochHistory({ currentEpoch }: { currentEpoch: bigint | undefined }) {
  const { address } = useAccount();

  const epochs = useMemo(() => {
    if (currentEpoch === undefined) return [];
    const from = currentEpoch > BigInt(SHOWN_EPOCHS - 1) ? currentEpoch - BigInt(SHOWN_EPOCHS - 1) : 0n;
    const list: bigint[] = [];
    for (let e = from; e <= currentEpoch; e++) list.push(e);
    return list.reverse();
  }, [currentEpoch]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls: any[] = useMemo(
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
    <div className="card-cream p-4">
      <h3 className="mb-2 font-cozy text-lg font-bold">📅 Lịch sử kỳ</h3>
      <ul className="space-y-2">
        {rows.map((r) => {
          const isCurrent = r.epoch === currentEpoch;
          const waiting = !isCurrent && !r.settled;
          return (
            <li
              key={r.epoch.toString()}
              className={`flex items-center justify-between rounded-xl border-2 px-3 py-2 ${
                isCurrent ? "border-leaf-500/60 bg-leaf-300/30" : "border-cream-300 bg-white/70"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">
                  {r.settled ? (r.qualified ? "✅" : "💔") : isCurrent ? "🔥" : "⏳"}
                </span>
                <div>
                  <div className="font-cozy text-sm font-bold text-cocoa-700">
                    Kỳ #{r.epoch.toString()}
                    {isCurrent && <span className="ml-1.5 text-xs text-leaf-600">đang diễn ra</span>}
                    {waiting && <span className="ml-1.5 text-xs text-cocoa-500">chờ chốt</span>}
                  </div>
                  <div className="text-xs font-semibold text-cocoa-500">
                    {r.target > 0n ? (
                      <>
                        {fmt(r.progress)}/{fmt(r.target)} mUSDC
                        {r.settled &&
                          (r.qualified ? ` · streak ${r.streakAtSettle.toString()} 🔥` : " · streak về 0")}
                      </>
                    ) : (
                      "Chưa đặt mục tiêu"
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-cozy text-sm font-extrabold ${r.reward > 0n ? "text-leaf-600" : "text-cocoa-500/60"}`}>
                  {r.settled ? `+${fmt(r.reward)}` : "—"}
                </div>
                {r.settled && (
                  <div className="text-[10px] font-semibold text-cocoa-500">
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
