"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { streakNFTAbi, dailyCheckInAbi, yieldDistributorAbi } from "@/lib/abis";
import { TxFeedback, useTx } from "@/components/useTx";
import { FeatureCard, Stat } from "@/components/cozy/panel";
import { LuckyWheelCard } from "@/components/cozy/LuckyWheelCard";
import { Icon } from "@/components/cozy/icons";
import { isDemoMode } from "@/lib/demo";
import type { VaultData } from "@/lib/useVaultData";

export function RewardsTab({ data }: { data: VaultData }) {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      <div className="space-y-4">
        <YieldCard data={data} />
        <LuckyWheelCard currentEpoch={data.account?.currentEpoch} />
      </div>
      <div className="space-y-4">
        <BadgesCard data={data} />
        <CheckInCard />
      </div>
    </div>
  );
}

const TIERS = [
  { tier: 3n, label: "3 kỳ", desc: "Khởi đầu bền bỉ", icon: "sprout" as const, color: "#7fd8a4" },
  { tier: 7n, label: "7 kỳ", desc: "7 kỳ kiên trì", icon: "flame" as const, color: "#f26d8d" },
  { tier: 30n, label: "30 kỳ", desc: "Huyền thoại Savient", icon: "crown" as const, color: "#a794e6" },
];

function BadgesCard({ data }: { data: VaultData }) {
  const { t: translate } = useLanguage();
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

  const eligibleIndex = TIERS.findIndex((t) => t.tier === eligible);
  const canMint = eligible > 0n && !owned(eligibleIndex);

  return (
    <FeatureCard icon="trophy" title={translate("Huy hiệu streak")} desc={translate("NFT ghi lại cột mốc chuỗi kỳ của bạn — vĩnh viễn trên chuỗi")}>
      <div className="space-y-3">
        {TIERS.map((t, i) => {
          const has = owned(i);
          const canUnlock = !has && eligible >= t.tier;
          const locked = !has && !canUnlock;
          const weeksLeft = locked ? Math.max(0, Number(t.tier - streak)) : 0;
          return (
            <div
              key={t.tier.toString()}
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${
                has
                  ? "border-cta/40 bg-cta/5"
                  : canUnlock
                    ? "border-terracotta/40 bg-terracotta/5"
                    : "border-border bg-surface-sunken/50 opacity-75"
              }`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${
                  has ? "border-cta bg-surface text-cta" : canUnlock ? "border-terracotta bg-surface text-terracotta" : "border-border bg-surface text-ink-muted"
                }`}
              >
                <Icon name={t.icon} size={26} />
              </span>
              <div className="flex-1">
                <div className="font-cozy text-base font-extrabold text-ink">{translate(t.label)}</div>
                <div className="text-xs font-semibold text-ink-soft">{translate(t.desc)}</div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                  has ? "bg-cta text-white" : canUnlock ? "bg-terracotta text-white" : "bg-border text-ink-soft"
                }`}
              >
                {loading ? "…" : has ? translate("Đã sở hữu") : canUnlock ? translate("Có thể nhận") : weeksLeft === 0 ? translate("Đã mở khóa") : translate("còn {0} kỳ", [weeksLeft])}
              </span>
            </div>
          );
        })}
      </div>
      {address && canMint && (
        <button className="btn-primary mt-4 w-full" disabled={tx.step !== null} onClick={mint}>
          {translate("Nhận huy hiệu {0} kỳ ngay", [eligible.toString()])}
        </button>
      )}
      <p className="mt-2 text-[11px] font-semibold text-ink-soft">
        {translate("Streak hiện tại: {0} kỳ · Huy hiệu mint theo tiêu chuẩn ERC-1155, đối chiếu được trên Snowtrace.", [streak.toString()])}
      </p>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

function CheckInCard() {
  const { t: translate, formatAmount: fmt } = useLanguage();
  const tx = useTx();
  const { address } = useAccount();
  const isDemo = isDemoMode();

  const state = useReadContracts({
    contracts: address && !isDemo
      ? [
          { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "today", args: [] },
          { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "lastCheckInDay", args: [address] },
          { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "checkInStreakDays", args: [address] },
          { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "previewReward", args: [address] },
          { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "rewardPool", args: [] },
        ]
      : [],
    query: { refetchInterval: 30_000, enabled: !!address && !isDemo },
  });
  const todayDay = state.data?.[0]?.result as bigint | undefined;
  const lastDay = state.data?.[1]?.result as bigint | undefined;
  const M = 1_000_000n;
  const streak = isDemo ? 5n : ((state.data?.[2]?.result as bigint | undefined) ?? 0n);
  const reward = isDemo ? 2n * M : ((state.data?.[3]?.result as bigint | undefined) ?? 0n);
  const pool = isDemo ? 1_234n * M : ((state.data?.[4]?.result as bigint | undefined) ?? 0n);
  const canCheckIn = isDemo ? false : todayDay !== undefined && lastDay !== todayDay;
  const loading = !isDemo && state.isLoading;

  async function doCheckIn() {
    await tx.run("Điểm danh", [
      { label: "Đang điểm danh nhận thưởng…", call: { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "checkIn", args: [] } },
    ]);
  }

  return (
    <FeatureCard icon="calendar" title={translate("Điểm danh mỗi ngày")} desc={translate("Thưởng mUSDC thử nghiệm mỗi ngày — chuỗi càng dài thưởng càng lớn")}>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={translate("Chuỗi ngày")} value={loading ? undefined : `${streak.toString()}`} tone="text-terracotta" />
        <Stat label={translate("Thưởng hôm nay")} value={loading ? undefined : `${fmt(reward)} mUSDC`} tone="text-cta" />
        <Stat label={translate("Pool còn")} value={loading ? undefined : `${fmt(pool)} mUSDC`} />
      </div>
      <button
        className="btn-primary mt-4 w-full"
        disabled={tx.step !== null || !address || !canCheckIn || isDemo}
        onClick={doCheckIn}
      >
        {isDemo ? translate("Điểm danh trong bản thử") : address ? (canCheckIn ? translate("Điểm danh ngay") : translate("Đã điểm danh hôm nay")) : translate("Kết nối ví để điểm danh")}
      </button>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

function YieldCard({ data }: { data: VaultData }) {
  const { t: translate, formatAmount: fmt } = useLanguage();
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
      { label: "Đang chốt kỳ #{0}…", labelValues: [String(nextEpochToFinalize)], call: { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "finalizeEpoch", args: [nextEpochToFinalize] } },
    ]);
  }

  const busy = claim.step !== null || finalize.step !== null;

  return (
    <FeatureCard icon="chart" title={translate("Lãi tiết kiệm")} desc={translate("Ngân sách thưởng do sponsor nạp (chưa phải lãi lending) — chia theo gốc và streak, đối chiếu được on-chain")}>
      {isDemoMode() && (
        <p data-testid="demo-notice" className="mb-2 rounded-lg border border-dashed border-cta/50 bg-cta/5 px-2 py-1 text-center text-[11px] font-bold text-ink-soft" role="note">
          {translate("Bản thử — số liệu mô phỏng, không phải thưởng thật.")}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Stat label={translate("Chờ nhận")} value={`${fmt(claimable)} mUSDC`} tone="text-cta" />
        <Stat label={translate("Đã nhận")} value={`${fmt(claimed)} mUSDC`} />
        <Stat label={translate("Ngân sách kỳ này")} value={`${fmt(currentBudget)} mUSDC`} />
      </div>
      <button className="btn-primary mt-4 w-full" disabled={busy || !claimable || claimable === 0n} onClick={claimYield}>
        {translate("Nhận lãi về ví")}
      </button>
      <TxFeedback state={claim} />
      <div className="mt-4 border-t border-dashed border-border pt-4">
        <p className="text-xs font-semibold text-ink-soft">
          {translate("Chốt kỳ là hành động công khai — ai gọi cũng được")}{rollover !== undefined && rollover > 0n ? translate(" · Rollover chờ chia: {0} mUSDC", [fmt(rollover)]) : ""}.
        </p>
        <button className="btn-secondary mt-2 w-full" disabled={busy || !canFinalize} onClick={finalizeEpoch}>
          {canFinalize ? translate("Chốt kỳ #{0}", [nextEpochToFinalize]) : translate("Chưa đến hạn chốt kỳ")}
        </button>
        <TxFeedback state={finalize} />
      </div>
    </FeatureCard>
  );
}
