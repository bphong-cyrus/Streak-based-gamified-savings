"use client";

import { useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { streakNFTAbi, dailyCheckInAbi, yieldDistributorAbi } from "@/lib/abis";
import { fmt } from "@/lib/format";
import { TxFeedback, useTx } from "@/components/useTx";
import { FeatureCard, Stat } from "@/components/cozy/panel";
import { Icon } from "@/components/cozy/icons";
import type { VaultData } from "@/lib/useVaultData";

/** Tab Rewards: huy hiệu streak (StreakNFT), điểm danh mỗi ngày, nhận lãi. */
export function RewardsTab({ data }: { data: VaultData }) {
  return (
    <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      <div className="space-y-3">
        <BadgesCard data={data} />
        <CheckInCard />
      </div>
      <div className="space-y-3">
        <YieldCard data={data} />
      </div>
    </div>
  );
}

const TIERS = [
  { tier: 3n, label: "3 tuần", desc: "Khởi đầu bền bỉ", icon: "sprout" as const, color: "#7fd8a4" },
  { tier: 7n, label: "7 tuần", desc: "Một quý kiên trì", icon: "flame" as const, color: "#f26d8d" },
  { tier: 30n, label: "30 tuần", desc: "Huyền thoại cozy", icon: "crown" as const, color: "#a794e6" },
];

/** Huy hiệu StreakNFT theo mốc 3 / 7 / 30 tuần streak. */
function BadgesCard({ data }: { data: VaultData }) {
  const tx = useTx();
  const { address } = useAccount();
  const streak = data.account?.streak ?? 0n;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls: any[] = address
    ? [
        { address: contracts.nft, abi: streakNFTAbi, functionName: "eligibleTier", args: [address] },
        ...TIERS.map((t) => ({ address: contracts.nft, abi: streakNFTAbi, functionName: "balanceOf", args: [address, t.tier] })),
      ]
    : [];
  const state = useReadContracts({
    contracts: calls,
    query: { refetchInterval: 15_000, enabled: !!address },
  });
  const eligible = (state.data?.[0]?.result as bigint | undefined) ?? 0n;
  const owned = (i: number) => ((state.data?.[i + 1]?.result as bigint | undefined) ?? 0n) > 0n;
  const loading = state.isLoading;

  async function mint() {
    await tx.run("Nhận huy hiệu streak", [
      { label: "Đang mint NFT huy hiệu…", call: { address: contracts.nft, abi: streakNFTAbi, functionName: "mint", args: [] } },
    ]);
  }

  const canMint = eligible > 0n && !owned(TIERS.findIndex((t) => t.tier === eligible));

  return (
    <FeatureCard
      icon="trophy"
      title="Huy hiệu streak"
      desc="NFT ghi lại cột mốc chuỗi tuần của bạn — vĩnh viễn trên chuỗi"
    >
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((t, i) => {
          const has = owned(i);
          const canUnlock = !has && eligible >= t.tier;
          const locked = !has && !canUnlock;
          const weeksLeft = locked ? Math.max(0, Number(t.tier - streak)) : 0;
          return (
            <div
              key={t.tier.toString()}
              className={`flex flex-col items-center rounded-2xl border-[1.5px] px-2 py-3 text-center transition ${
                has
                  ? "border-lavender-400 bg-lavender-300/25 shadow-sm"
                  : canUnlock
                    ? "border-leaf-500 bg-leaf-300/20 shadow-sm"
                    : "border-cream-300 bg-white/60 opacity-75"
              }`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                  has ? "border-lavender-400 bg-white text-lavender-500" : canUnlock ? "border-leaf-500 bg-white text-leaf-600" : "border-cream-300 bg-white/80 text-cocoa-400"
                }`}
                style={{ boxShadow: has || canUnlock ? `0 0 0 3px ${t.color}33` : undefined }}
              >
                <Icon name={t.icon} size={26} />
              </span>
              <div className="mt-1.5 font-cozy text-sm font-extrabold text-cocoa-700">{t.label}</div>
              <div className="text-[10px] font-semibold leading-tight text-cocoa-500">{t.desc}</div>
              <div
                className={`mt-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                  has ? "bg-lavender-400 text-white" : canUnlock ? "bg-leaf-400 text-white" : "bg-cream-200 text-cocoa-500"
                }`}
              >
                {loading ? "…" : has ? "Đã sở hữu" : canUnlock ? "Có thể nhận" : weeksLeft === 0 ? "Đã mở khóa" : `còn ${weeksLeft} tuần`}
              </div>
            </div>
          );
        })}
      </div>
      {address && canMint && (
        <button className="btn-cozy mt-3 w-full active:translate-y-[2px] active:border-b-2" disabled={tx.step !== null} onClick={mint}>
          Nhận huy hiệu {eligible.toString()} tuần ngay
        </button>
      )}
      <p className="mt-2 text-[11px] font-semibold text-cocoa-500">
        Streak hiện tại: {streak.toString()} tuần · Huy hiệu mint theo tiêu chuẩn ERC-1155, đối chiếu được trên Snowtrace.
      </p>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Điểm danh mỗi ngày — thưởng mUSDC từ pool, chuỗi tăng thưởng tăng. */
function CheckInCard() {
  const tx = useTx();
  const { address } = useAccount();

  const state = useReadContracts({
    contracts:
      address
        ? [
            { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "today", args: [] },
            { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "lastCheckInDay", args: [address] },
            { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "checkInStreakDays", args: [address] },
            { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "previewReward", args: [address] },
            { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "rewardPool", args: [] },
          ]
        : [],
    query: { refetchInterval: 30_000, enabled: !!address },
  });
  const todayDay = state.data?.[0]?.result as bigint | undefined;
  const lastDay = state.data?.[1]?.result as bigint | undefined;
  const streak = (state.data?.[2]?.result as bigint | undefined) ?? 0n;
  const reward = (state.data?.[3]?.result as bigint | undefined) ?? 0n;
  const pool = (state.data?.[4]?.result as bigint | undefined) ?? 0n;
  const canCheckIn = todayDay !== undefined && lastDay !== todayDay;
  const loading = state.isLoading;

  async function doCheckIn() {
    await tx.run("Điểm danh", [
      { label: "Đang điểm danh nhận thưởng…", call: { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "checkIn", args: [] } },
    ]);
  }

  return (
    <FeatureCard icon="calendar" title="Điểm danh mỗi ngày" desc="mUSDC thật mỗi ngày — chuỗi càng dài thưởng càng lớn (tối đa gấp đôi)">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Chuỗi ngày" value={loading ? "…" : address ? streak.toString() : "—"} tone="text-blush-500" />
        <Stat label="Thưởng hôm nay" value={loading ? "…" : address ? `${fmt(reward)} mUSDC` : "—"} tone="text-leaf-600" />
        <Stat label="Pool còn" value={loading ? "…" : address ? `${fmt(pool)} mUSDC` : "—"} />
      </div>
      <button
        className="btn-cozy mt-3 w-full active:translate-y-[2px] active:border-b-2"
        disabled={tx.step !== null || !address || !canCheckIn}
        onClick={doCheckIn}
      >
        {address ? (canCheckIn ? "Điểm danh ngay" : "Đã điểm danh hôm nay") : "Kết nối ví để điểm danh"}
      </button>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Nhận lãi yield đã phân bổ + chốt kỳ công khai. */
function YieldCard({ data }: { data: VaultData }) {
  const claim = useTx();
  const finalize = useTx();
  const { claimable, claimed, canFinalize, nextEpochToFinalize, rollover, currentBudget } = data;

  async function claimYield() {
    await claim.run("Nhận thưởng", [
      { label: "Đang chuyển lãi về ví…", call: { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "claimYield", args: [] } },
    ]);
  }
  async function finalizeEpoch() {
    if (nextEpochToFinalize === undefined) return;
    await finalize.run("Chốt kỳ", [
      { label: `Đang chốt kỳ #${nextEpochToFinalize}…`, call: { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "finalizeEpoch", args: [nextEpochToFinalize] } },
    ]);
  }

  const busy = claim.step !== null || finalize.step !== null;

  return (
    <FeatureCard icon="chart" title="Lãi tiết kiệm" desc="Yield từ nguồn lãi mock — chia theo gốc và streak, đối chiếu được on-chain">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Chờ nhận" value={`${fmt(claimable)} mUSDC`} tone="text-leaf-600" />
        <Stat label="Đã nhận" value={`${fmt(claimed)} mUSDC`} />
        <Stat label="Ngân sách kỳ này" value={`${fmt(currentBudget)} mUSDC`} />
      </div>
      <button className="btn-cozy mt-3 w-full active:translate-y-[2px] active:border-b-2" disabled={busy || !claimable || claimable === 0n} onClick={claimYield}>
        Nhận lãi về ví
      </button>
      <TxFeedback state={claim} />
      <div className="mt-3 border-t border-dashed border-cocoa-700/15 pt-3">
        <p className="text-xs font-semibold text-cocoa-500">
          Chốt kỳ là hành động công khai — ai gọi cũng được{rollover !== undefined && rollover > 0n ? ` · Rollover chờ chia: ${fmt(rollover)} mUSDC` : ""}.
        </p>
        <button className="btn-cream mt-2 w-full active:translate-y-[1px] active:border-b-2" disabled={busy || !canFinalize} onClick={finalizeEpoch}>
          {canFinalize ? `Chốt kỳ #${nextEpochToFinalize}` : "Chưa đến hạn chốt kỳ"}
        </button>
        <TxFeedback state={finalize} />
      </div>
    </FeatureCard>
  );
}
