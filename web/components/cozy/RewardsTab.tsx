"use client";

import { useState } from "react";
import { contracts } from "@/lib/config";
import { yieldDistributorAbi } from "@/lib/abis";
import { fmt } from "@/lib/format";
import { TxFeedback, useTx } from "@/components/useTx";
import type { VaultData } from "@/lib/useVaultData";

const WHEEL_REWARDS = [
  { icon: "❄️", label: "Streak Freeze" },
  { icon: "💰", label: "+50 Gems" },
  { icon: "⚡", label: "Interest x2 (1 tuần)" },
  { icon: "🎁", label: "Hộp quà bí ẩn" },
  { icon: "💎", label: "+120 Gems" },
  { icon: "🔥", label: "Streak Revival" },
  { icon: "🪙", label: "+20 Gems" },
  { icon: "🎨", label: "Theme độc quyền" },
];

/** Tab Rewards: nhận thưởng on-chain, chốt kỳ, vòng quay may mắn (demo). */
export function RewardsTab({ data }: { data: VaultData }) {
  const claim = useTx();
  const finalize = useTx();
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const { claimable, claimed, canFinalize, nextEpochToFinalize, rollover, currentBudget } = data;

  async function claimYield() {
    await claim.run("Nhận thưởng", [
      {
        label: "Đang chuyển thưởng về ví…",
        call: { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "claimYield" },
      },
    ]);
  }

  async function finalizeEpoch() {
    if (nextEpochToFinalize === undefined) return;
    await finalize.run("Chốt kỳ", [
      {
        label: `Đang chốt kỳ #${nextEpochToFinalize}…`,
        call: {
          address: contracts.distributor,
          abi: yieldDistributorAbi,
          functionName: "finalizeEpoch",
          args: [nextEpochToFinalize],
        },
      },
    ]);
  }

  function spin() {
    if (spinning) return;
    setWon(null);
    setSpinning(true);
    setTimeout(() => {
      setSpinning(false);
      setWon(Math.floor(Math.random() * WHEEL_REWARDS.length));
    }, 3300);
  }

  const busy = claim.step !== null || finalize.step !== null;

  return (
    <div className="space-y-3 px-4 pb-28 pt-2">
      {/* thưởng on-chain */}
      <div className="card-cream p-4">
        <h3 className="font-cozy text-lg font-bold">🎁 Thưởng của bạn</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl border-2 border-cream-300 bg-white/80 p-3 text-center">
            <div className="text-[11px] font-bold uppercase text-cocoa-500">Chờ nhận</div>
            <div className="font-cozy text-xl font-extrabold text-leaf-600">{fmt(claimable)} mUSDC</div>
          </div>
          <div className="rounded-xl border-2 border-cream-300 bg-white/80 p-3 text-center">
            <div className="text-[11px] font-bold uppercase text-cocoa-500">Đã nhận</div>
            <div className="font-cozy text-xl font-extrabold text-cocoa-700">{fmt(claimed)} mUSDC</div>
          </div>
        </div>
        <button className="btn-cozy mt-3 w-full" disabled={busy || !claimable || claimable === 0n} onClick={claimYield}>
          💸 Nhận thưởng về ví
        </button>
        <TxFeedback state={claim} />

        <div className="mt-4 border-t-2 border-dashed border-cream-300 pt-3">
          <p className="text-xs font-semibold text-cocoa-500">
            Ngân sách kỳ này: {fmt(currentBudget)} mUSDC
            {rollover !== undefined && rollover > 0n && ` · Rollover chờ chia: ${fmt(rollover)} mUSDC`}. Chốt kỳ là hành
            động công khai — ai gọi cũng được.
          </p>
          <button className="btn-cream mt-2 w-full" disabled={busy || !canFinalize} onClick={finalizeEpoch}>
            {canFinalize ? `⏳ Chốt kỳ #${nextEpochToFinalize}` : "Chưa đến hạn chốt kỳ"}
          </button>
          <TxFeedback state={finalize} />
        </div>
      </div>

      {/* vòng quay may mắn */}
      <div className="card-cream p-4 text-center">
        <h3 className="font-cozy text-lg font-bold">🎡 Vòng quay may mắn</h3>
        <p className="text-xs font-semibold text-cocoa-500">Demo giao diện — phần thưởng ngẫu nhiên, chưa ghi on-chain</p>

        <div className="relative mx-auto mt-3 h-52 w-52">
          {/* kim chỉ */}
          <div className="absolute -top-1 left-1/2 z-20 -translate-x-1/2 text-2xl">📍</div>
          <div
            className={`h-full w-full rounded-full border-4 border-cocoa-700/70 shadow-chunkySm ${spinning ? "wheel-spinning" : ""}`}
            style={{
              background: "conic-gradient(#ffc9d4 0 45deg, #fde9a9 45deg 90deg, #bfe8c9 90deg 135deg, #c9bdf5 135deg 180deg, #ffc9d4 180deg 225deg, #fde9a9 225deg 270deg, #bfe8c9 270deg 315deg, #c9bdf5 315deg 360deg)",
            }}
          >
            {WHEEL_REWARDS.map((r, i) => {
              const angle = i * 45 + 22.5;
              return (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-cocoa-700/50 bg-white/90 text-xl"
                  style={{ transform: `rotate(${angle}deg) translateY(-78px) rotate(${-angle}deg) translate(-50%, -50%)` }}
                >
                  {r.icon}
                </div>
              );
            })}
            <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-cocoa-700/70 bg-cream-100 font-cozy text-lg font-extrabold text-cocoa-700">
              QUAY
            </div>
          </div>
        </div>

        <button className="btn-cozy mt-4" disabled={spinning} onClick={spin}>
          {spinning ? "Đang quay…" : "🎲 Quay miễn phí"}
        </button>
        {won !== null && (
          <div className="mx-auto mt-3 w-fit rounded-xl border-2 border-leaf-500/60 bg-leaf-300/40 px-4 py-2 font-cozy font-bold text-leaf-600">
            🎉 Bạn nhận được: {WHEEL_REWARDS[won].label}!
          </div>
        )}
      </div>
    </div>
  );
}
