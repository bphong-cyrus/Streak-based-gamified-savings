"use client";

import { useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts, isConfigured } from "@/lib/config";
import { yieldDistributorAbi, luckyWheelAbi, dailyCheckInAbi } from "@/lib/abis";
import { fmt } from "@/lib/format";
import { TxFeedback, useTx } from "@/components/useTx";
import { MissionsCard } from "@/components/cozy/MissionsCard";
import type { VaultData } from "@/lib/useVaultData";
import { fmtGems, type MissionView } from "@/lib/useGemsData";

interface RewardsProps {
  data: VaultData;
  missions: MissionView[];
  gemsBalance: bigint;
}

const WHEEL_REWARDS = [
  { icon: "❄️", label: "Streak Freeze" },
  { icon: "💰", label: "+50 Paws" },
  { icon: "⚡", label: "Interest x2 (1 tuần)" },
  { icon: "🎁", label: "Hộp quà bí ẩn" },
  { icon: "💎", label: "+120 Paws" },
  { icon: "🔥", label: "Streak Revival" },
  { icon: "🪙", label: "+20 Paws" },
  { icon: "🎨", label: "Theme độc quyền" },
];

/** Tab Rewards: nhiệm vụ, nhận thưởng on-chain, chốt kỳ, vòng quay may mắn on-chain, điểm danh. */
export function RewardsTab({ data, missions, gemsBalance }: RewardsProps) {
  const claim = useTx();
  const finalize = useTx();
  const spin = useTx();
  const checkInTx = useTx();
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const { address } = useAccount();
  const { claimable, claimed, canFinalize, nextEpochToFinalize, rollover, currentBudget, account } = data;
  const epoch = account?.currentEpoch;

  const wheelLive = isConfigured(contracts.wheel);
  const checkInLive = isConfigured(contracts.dailyCheckIn);

  // Vòng quay on-chain: 1 lượt mỗi kỳ, pool do owner nạp
  const wheelState = useReadContracts({
    contracts:
      wheelLive && address && epoch !== undefined
        ? [
            { address: contracts.wheel, abi: luckyWheelAbi, functionName: "canSpin", args: [address, epoch] },
            { address: contracts.wheel, abi: luckyWheelAbi, functionName: "lastSpunEpoch", args: [address] },
          ]
        : [],
    query: { refetchInterval: 8_000, enabled: wheelLive && !!address && epoch !== undefined },
  });
  const canSpin = wheelState.data?.[0]?.result as boolean | undefined;

  // Điểm danh: 1 lần/ngày
  const checkInState = useReadContracts({
    contracts:
      checkInLive && address
        ? [
            { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "today", args: [] },
            { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "lastCheckInDay", args: [address] },
            { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "checkInStreakDays", args: [address] },
          ]
        : [],
    query: { refetchInterval: 30_000, enabled: checkInLive && !!address },
  });
  const todayDay = checkInState.data?.[0]?.result as bigint | undefined;
  const lastDay = checkInState.data?.[1]?.result as bigint | undefined;
  const canCheckIn = todayDay !== undefined && lastDay !== todayDay;
  const checkInStreak = (checkInState.data?.[2]?.result as bigint | undefined) ?? 0n;

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

  async function spinWheel() {
    if (spinning || epoch === undefined) return;
    setWon(null);
    setSpinning(true);
    if (wheelLive) {
      // On-chain: quay thật trên LuckyWheel (kết quả ghi trong tx)
      await spin.run("Vòng quay may mắn", [
        {
          label: "Đang quay trên blockchain…",
          call: { address: contracts.wheel, abi: luckyWheelAbi, functionName: "spin", args: [epoch] },
        },
      ]);
      setSpinning(false);
      setWon(Math.floor(Math.random() * WHEEL_REWARDS.length)); // hiệu ứng minh họa phần thưởng
      return;
    }
    setTimeout(() => {
      setSpinning(false);
      setWon(Math.floor(Math.random() * WHEEL_REWARDS.length));
    }, 3300);
  }

  async function doCheckIn() {
    await checkInTx.run("Điểm danh", [
      {
        label: "Đang nhận Gems điểm danh…",
        call: { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "checkIn" },
      },
    ]);
  }

  const busy = claim.step !== null || finalize.step !== null || spin.step !== null || checkInTx.step !== null;

  return (
    <div className="space-y-3 px-4 pb-28 pt-2">
      {/* nhiệm vụ kiếm Gems */}
      <MissionsCard missions={missions} hasWallet={!!data.address} />

      {/* thưởng on-chain */}
      <div className="card-cream p-4">
        <h3 className="font-cozy text-lg font-bold">🎁 Thưởng của bạn</h3>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-xl border-2 border-cream-300 bg-white/80 p-2 text-center">
            <div className="text-[10px] font-bold uppercase text-cocoa-500">🐾 Paws</div>
            <div className="font-cozy text-base font-extrabold text-lavender-500">{fmtGems(gemsBalance)}</div>
          </div>
          <div className="rounded-xl border-2 border-cream-300 bg-white/80 p-2 text-center">
            <div className="text-[10px] font-bold uppercase text-cocoa-500">Chờ nhận</div>
            <div className="font-cozy text-base font-extrabold text-leaf-600">{fmt(claimable)}</div>
          </div>
          <div className="rounded-xl border-2 border-cream-300 bg-white/80 p-2 text-center">
            <div className="text-[10px] font-bold uppercase text-cocoa-500">Đã nhận</div>
            <div className="font-cozy text-base font-extrabold text-cocoa-700">{fmt(claimed)}</div>
          </div>
        </div>
        <div className="text-center text-[10px] font-semibold text-cocoa-500">mUSDC · Paws</div>
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
        <p className="text-xs font-semibold text-cocoa-500">
          {wheelLive
            ? "Quay thật trên blockchain — mỗi ví một lượt mỗi kỳ, giải thưởng từ prize pool."
            : "Demo giao diện — phần thưởng ngẫu nhiên, chưa ghi on-chain"}
        </p>

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

        <button
          className="btn-cozy mt-4"
          disabled={spinning || busy || (wheelLive && (!!address ? canSpin === false : true))}
          onClick={spinWheel}
        >
          {spinning ? "Đang quay…" : wheelLive ? (canSpin === false ? "Đã quay kỳ này 🔒" : "🎲 Quay ngay") : "🎲 Quay miễn phí"}
        </button>
        {won !== null && (
          <div className="mx-auto mt-3 w-fit rounded-xl border-2 border-leaf-500/60 bg-leaf-300/40 px-4 py-2 font-cozy font-bold text-leaf-600">
            🎉 Bạn nhận được: {WHEEL_REWARDS[won].label}!
          </div>
        )}
        <TxFeedback state={{ step: spin.step, hash: spin.hash, error: spin.error }} />
      </div>

      {/* điểm danh hằng ngày */}
      {checkInLive && (
        <div className="card-cream p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-cozy text-lg font-bold">📅 Điểm danh mỗi ngày</h3>
              <p className="text-xs font-semibold text-cocoa-500">
                Chuỗi {checkInStreak.toString()} ngày · thưởng Gems tăng dần theo chuỗi.
              </p>
            </div>
            <button className="btn-cozy shrink-0" disabled={busy || !address || !canCheckIn} onClick={doCheckIn}>
              {canCheckIn ? "✅ Điểm danh" : "Đã điểm danh hôm nay"}
            </button>
          </div>
          <TxFeedback state={{ step: checkInTx.step, hash: checkInTx.hash, error: checkInTx.error }} />
        </div>
      )}
    </div>
  );
}
