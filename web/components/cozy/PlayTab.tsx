"use client";

import { useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts, isConfigured } from "@/lib/config";
import {
  yieldDistributorAbi, luckyWheelAbi, dailyCheckInAbi, predictionBoxAbi,
  kingOfTheHillAbi, prizeLinkedSavingsAbi, guildWarsAbi, celebrationPoolAbi,
} from "@/lib/abis";
import { fmt, parseAmount, shortAddr } from "@/lib/format";
import { getPublicClient } from "@wagmi/core";
import { decodeEventLog } from "viem";
import { wagmiConfig, fuji, explorerTx } from "@/lib/config";
import { TxFeedback, useTx } from "@/components/useTx";
import { FeatureCard, Stat, useTokenAllowance, withTokenApprove } from "@/components/cozy/panel";
import { Icon, type IconName } from "@/components/cozy/icons";
import { MissionsCard } from "@/components/cozy/MissionsCard";
import type { VaultData } from "@/lib/useVaultData";
import { fmtGems, type MissionView } from "@/lib/useGemsData";

interface PlayProps {
  data: VaultData;
  missions: MissionView[];
  gemsBalance: bigint;
}

/** Tab Chơi: thưởng on-chain, nhiệm vụ, vòng quay, điểm danh + các trò chơi isometric. */
export function PlayTab({ data, missions, gemsBalance }: PlayProps) {
  return (
    <div className="space-y-3 px-4 pb-28 pt-2 md:columns-2 md:gap-3 md:[&>*]:mb-3 md:[&>*]:break-inside-avoid">
      <RewardsCard data={data} gemsBalance={gemsBalance} />
      <MissionsCard missions={missions} hasWallet={!!data.address} />
      <WheelCard data={data} />
      <CheckInCard />
      <PredictionCard data={data} />
      <KingOfTheHillCard />
      <PrizeLinkedCard />
      <GuildWarsCard />
      <CelebrationCard data={data} />
    </div>
  );
}

/** Thưởng lãi + chốt kỳ (YieldDistributor). */
function RewardsCard({ data, gemsBalance }: { data: VaultData; gemsBalance: bigint }) {
  const claim = useTx();
  const finalize = useTx();
  const { claimable, claimed, canFinalize, nextEpochToFinalize, rollover, currentBudget } = data;

  async function claimYield() {
    await claim.run("Nhận thưởng", [
      { label: "Đang chuyển thưởng về ví…", call: { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "claimYield" } },
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
    <FeatureCard icon="gift" title="Thưởng của bạn" desc="Lãi yield đã phân bổ — nhận về ví bất cứ lúc nào">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Paws" value={fmtGems(gemsBalance)} tone="text-lavender-500" />
        <Stat label="Chờ nhận" value={fmt(claimable)} tone="text-leaf-600" />
        <Stat label="Đã nhận" value={fmt(claimed)} />
      </div>
      <button className="btn-cozy mt-3 w-full" disabled={busy || !claimable || claimable === 0n} onClick={claimYield}>
        Nhận thưởng về ví
      </button>
      <TxFeedback state={claim} />
      <div className="mt-3 border-t-2 border-dashed border-cream-300 pt-3">
        <p className="text-xs font-semibold text-cocoa-500">
          Ngân sách kỳ này: {fmt(currentBudget)} mUSDC
          {rollover !== undefined && rollover > 0n && ` · Rollover chờ chia: ${fmt(rollover)} mUSDC`}. Chốt kỳ là hành động
          công khai — ai gọi cũng được.
        </p>
        <button className="btn-cream mt-2 w-full" disabled={busy || !canFinalize} onClick={finalizeEpoch}>
          {canFinalize ? `Chốt kỳ #${nextEpochToFinalize}` : "Chưa đến hạn chốt kỳ"}
        </button>
        <TxFeedback state={finalize} />
      </div>
    </FeatureCard>
  );
}

/** Vòng quay may mắn on-chain: tầng giải đọc từ contract, kết quả từ event WheelSpun trong receipt. */
const TIER_ICONS: IconName[] = ["snow", "paw", "bolt", "gift", "gem", "flame", "coin", "spark"];
const TIER_COLORS = ["#ffc9d4", "#fde9a9", "#bfe8c9", "#c9bdf5", "#bfe3f2", "#ffd9a8"];

function WheelCard({ data }: { data: VaultData }) {
  const spin = useTx();
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<{ prize: bigint; hash: string } | null>(null);
  const { address } = useAccount();
  const epoch = data.account?.currentEpoch;
  const live = isConfigured(contracts.wheel);

  // Đọc tầng giải thật từ contract
  const countState = useReadContracts({
    contracts: live ? [{ address: contracts.wheel, abi: luckyWheelAbi, functionName: "tierCount", args: [] }] : [],
    query: { refetchInterval: 60_000, enabled: live },
  });
  const tierCount = Number((countState.data?.[0]?.result as bigint | undefined) ?? 0n);
  const tiersState = useReadContracts({
    contracts: live
      ? Array.from({ length: tierCount }, (_, i) => ({
          address: contracts.wheel, abi: luckyWheelAbi, functionName: "tiers", args: [BigInt(i)],
        }))
      : [],
    query: { refetchInterval: 60_000, enabled: live && tierCount > 0 },
  });
  const tiers = Array.from({ length: tierCount }, (_, i) => tiersState.data?.[i]?.result as
    | { probabilityBps: bigint; prizeAmount: bigint }
    | undefined)
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => ({
      probabilityBps: BigInt(t.probabilityBps ?? 0),
      prizeAmount: BigInt(t.prizeAmount ?? 0),
    }));
  const totalBps = tiers.reduce((s, t) => s + Number(t.probabilityBps), 0);

  const wheelState = useReadContracts({
    contracts:
      live && address && epoch !== undefined
        ? [
            { address: contracts.wheel, abi: luckyWheelAbi, functionName: "canSpin", args: [address, epoch] },
            { address: contracts.wheel, abi: luckyWheelAbi, functionName: "lastSpunEpoch", args: [address] },
          ]
        : [],
    query: { refetchInterval: 20_000, enabled: live && !!address && epoch !== undefined },
  });
  const canSpin = wheelState.data?.[0]?.result as boolean | undefined;

  // conic-gradient theo xác suất thật từng tầng
  const gradient = (() => {
    let acc = 0;
    const stops: string[] = [];
    tiers.forEach((t, i) => {
      const start = (acc / totalBps) * 360;
      acc += Number(t.probabilityBps);
      const end = (acc / totalBps) * 360;
      stops.push(`${TIER_COLORS[i % TIER_COLORS.length]} ${start}deg ${end}deg`);
    });
    return stops.length ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(#c9bdf5 0 360deg)";
  })();

  async function spinWheel() {
    if (spinning || epoch === undefined) return;
    setWon(null);
    setSpinning(true);
    if (live) {
      const ok = await spin.run("Vòng quay may mắn", [
        { label: "Đang quay trên blockchain…", call: { address: contracts.wheel, abi: luckyWheelAbi, functionName: "spin", args: [epoch] } },
      ]);
      setSpinning(false);
      if (ok && spin.hash) {
        // Kết quả thật: đọc event WheelSpun trong receipt — không random phía client
        try {
          const client = getPublicClient(wagmiConfig, { chainId: fuji.id });
          const receipt = await client.getTransactionReceipt({ hash: spin.hash as `0x${string}` });
          for (const log of receipt.logs) {
            try {
              const ev = decodeEventLog({ abi: luckyWheelAbi, data: log.data, topics: log.topics });
              if (ev.eventName === "WheelSpun") {
                const args = ev.args as unknown as { prize: bigint };
                setWon({ prize: args.prize, hash: spin.hash });
                return;
              }
            } catch { /* log khác */ }
          }
        } catch { /* fallback: chỉ link Snowtrace */ }
        setWon({ prize: -1n, hash: spin.hash }); // -1 = chỉ hiện link đối chiếu
      }
      return;
    }
    setSpinning(false);
  }

  return (
    <FeatureCard
      icon="wheel"
      title="Vòng quay may mắn"
      desc={live ? "Tầng giải & kết quả đọc thẳng từ contract — không số ngẫu nhiên nào phía client." : "Chưa cấu hình contract cho chain này."}
    >
      {tiers.length === 0 ? (
        <div className="mx-auto mt-1 flex h-40 w-full max-w-xs flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cocoa-700/30 bg-white/40 p-4 text-center">
          <Icon name="wheel" size={36} className="text-cocoa-500" />
          <p className="text-xs font-semibold text-cocoa-500">
            Kết nối ví mạng Fuji để tải tầng giải thật từ contract — mỗi ví một lượt mỗi kỳ.
          </p>
        </div>
      ) : (
      <div className="relative mx-auto mt-1 h-52 w-52">
        <div className="absolute -top-1 left-1/2 z-20 -translate-x-1/2 text-2xl">📍</div>
        <div
          className={`h-full w-full rounded-full border-4 border-cocoa-700/70 shadow-chunkySm ${spinning ? "wheel-spinning" : ""}`}
          style={{ background: gradient }}
        >
          {tiers.map((t, i) => {
            const angle = ((tiers.slice(0, i).reduce((s, x) => s + Number(x.probabilityBps), 0) + Number(t.probabilityBps) / 2) / totalBps) * 360;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-cocoa-700/50 bg-white/90 text-[10px] font-extrabold text-cocoa-700"
                style={{ transform: `rotate(${angle}deg) translateY(-76px) rotate(${-angle}deg) translate(-50%, -50%)` }}
              >
                {t.prizeAmount > 0n ? fmt(t.prizeAmount) : "x"}
              </div>
            );
          })}
          <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-cocoa-700/70 bg-cream-100 font-cozy text-lg font-extrabold text-cocoa-700">
            QUAY
          </div>
        </div>
      </div>
      )}
      {tiers.length > 0 && tiers.every((t) => t.prizeAmount === 0n) && (
        <p className="mt-2 rounded-xl border-2 border-dashed border-cream-300 bg-white/60 px-3 py-2 text-center text-xs font-semibold text-cocoa-500">
          Các tầng hiện đều là &quot;miss&quot; (0 mUSDC) — owner cần cấu hình giải + nạp pool trước khi quay được.
        </p>
      )}
      <div className="mt-4 text-center">
        <button
          className="btn-cozy"
          disabled={spinning || spin.step !== null || tiers.length === 0 || (live && (!!address ? canSpin === false : true))}
          onClick={spinWheel}
        >
          {spinning ? "Đang quay…" : live ? (canSpin === false ? "Đã quay kỳ này" : "Quay ngay") : "Chưa sẵn sàng"}
        </button>
      </div>
      {won && (
        <div className="mx-auto mt-3 w-fit max-w-full rounded-xl border-2 border-leaf-500/60 bg-leaf-300/40 px-4 py-2 text-center font-cozy font-bold text-leaf-600">
          {won.prize >= 0n ? (
            <>
              Bạn trúng <span className="text-lg">{fmt(won.prize)} mUSDC</span> thật!
              <a className="ml-1 text-xs underline" href={explorerTx(won.hash)} target="_blank" rel="noreferrer">
                đối chiếu trên Snowtrace
              </a>
            </>
          ) : (
            <a className="text-xs underline" href={explorerTx(won.hash)} target="_blank" rel="noreferrer">
              Xem kết quả quay trên Snowtrace
            </a>
          )}
        </div>
      )}
      <TxFeedback state={{ step: spin.step, hash: spin.hash, error: spin.error, info: spin.info }} />
    </FeatureCard>
  );
}

/** Điểm danh mỗi ngày — thưởng Gems tăng theo chuỗi. */
function CheckInCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.dailyCheckIn);

  const state = useReadContracts({
    contracts:
      live && address
        ? [
            { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "today", args: [] },
            { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "lastCheckInDay", args: [address] },
            { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "checkInStreakDays", args: [address] },
          ]
        : [],
    query: { refetchInterval: 30_000, enabled: live && !!address },
  });
  const todayDay = state.data?.[0]?.result as bigint | undefined;
  const lastDay = state.data?.[1]?.result as bigint | undefined;
  const canCheckIn = todayDay !== undefined && lastDay !== todayDay;
  const streak = (state.data?.[2]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function doCheckIn() {
    await tx.run("Điểm danh", [
      { label: "Đang nhận Gems điểm danh…", call: { address: contracts.dailyCheckIn, abi: dailyCheckInAbi, functionName: "checkIn" } },
    ]);
  }

  return (
    <FeatureCard icon="calendar" title="Điểm danh mỗi ngày" desc="Thưởng Gems tăng dần theo chuỗi ngày liên tiếp">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-cozy text-2xl font-extrabold text-blush-500">{streak.toString()}</span>
          <span className="text-xs font-semibold text-cocoa-500">ngày liên tiếp</span>
        </div>
        <button className="btn-cozy shrink-0" disabled={tx.step !== null || !address || !canCheckIn} onClick={doCheckIn}>
          {canCheckIn ? "Điểm danh" : "Đã điểm danh hôm nay"}
        </button>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Dự đoán ngân sách kỳ tới: Under/Over mốc owner đặt — đoán trúng chia pool. */
function PredictionCard({ data }: { data: VaultData }) {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.predictionBox);
  const allowance = useTokenAllowance(live ? contracts.predictionBox : undefined);

  const [marketId, setMarketId] = useState("");
  const [amount, setAmount] = useState("");
  const [side, setSide] = useState<0 | 1>(1);

  const countState = useReadContracts({
    contracts: live ? [{ address: contracts.predictionBox, abi: predictionBoxAbi, functionName: "marketCount", args: [] }] : [],
    query: { refetchInterval: 15_000, enabled: live },
  });
  const latest = (countState.data?.[0]?.result as bigint | undefined) ?? 0n;
  const id = marketId ? BigInt(marketId) : latest;

  const mState = useReadContracts({
    contracts:
      live && id > 0n
        ? [
            { address: contracts.predictionBox, abi: predictionBoxAbi, functionName: "markets", args: [id] },
            { address: contracts.predictionBox, abi: predictionBoxAbi, functionName: "previewClaim", args: [id, address ?? "0x0000000000000000000000000000000000000000"] },
          ]
        : [],
    query: { refetchInterval: 10_000, enabled: live && id > 0n },
  });
  const m = mState.data?.[0]?.result as
    | { epoch: bigint; line: bigint; deadline: bigint; underPool: bigint; overPool: bigint; feeBps: bigint; resolved: boolean; outcome: bigint }
    | undefined;
  const preview = (mState.data?.[1]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function predict() {
    const amt = parseAmount(amount);
    if (!amt || id === 0n) return;
    const calls = withTokenApprove(
      [{ label: "Đang đặt dự đoán…", call: { address: contracts.predictionBox, abi: predictionBoxAbi, functionName: "predict", args: [id, side, amt] } }],
      contracts.predictionBox, amt, allowance,
    );
    if (await tx.run("Dự đoán ngân sách", calls)) setAmount("");
  }
  async function resolve() {
    await tx.run("Kết quả dự đoán", [
      { label: "Đang tổng kết market…", call: { address: contracts.predictionBox, abi: predictionBoxAbi, functionName: "resolve", args: [id] } },
    ]);
  }
  async function claim() {
    await tx.run("Nhận thưởng dự đoán", [
      { label: "Đang nhận phần thắng…", call: { address: contracts.predictionBox, abi: predictionBoxAbi, functionName: "claim", args: [id] } },
    ]);
  }

  return (
    <FeatureCard icon="chart" title="Hộp dự đoán" desc="Đoán ngân sách kỳ tới cao hơn hay thấp hơn mốc — phe đúng chia pool">
      <div className="flex items-center gap-2">
        <input
          className="input-cozy w-28"
          inputMode="numeric"
          placeholder={`Market #${latest.toString()}`}
          value={marketId}
          onChange={(e) => setMarketId(e.target.value.replace(/[^0-9]/g, ""))}
        />
        <span className="text-xs font-semibold text-cocoa-500">mới nhất: #{latest.toString()}</span>
      </div>
      {latest === 0n && (
        <p className="mt-2 rounded-xl border-2 border-dashed border-cream-300 bg-white/60 px-3 py-2 text-center text-xs font-semibold text-cocoa-500">
          Chưa có thị trường nào — chờ owner tạo market đầu tiên cho kỳ tới.
        </p>
      )}
      {m && id > 0n && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="Mốc line" value={`${fmt(m.line)}`} />
          <Stat label="Pool dưới" value={`${fmt(m.underPool)}`} tone="text-sky-600" />
          <Stat label="Pool trên" value={`${fmt(m.overPool)}`} tone="text-blush-500" />
        </div>
      )}
      {m && !m.resolved && (
        <div className="mt-2 flex gap-2">
          <button
            className={`flex-1 rounded-xl border-[3px] py-2 font-cozy font-bold transition ${side === 0 ? "border-cocoa-700/80 bg-sky-400 text-white shadow-chunkySm" : "border-cream-300 bg-white text-cocoa-500"}`}
            onClick={() => setSide(0)}
          >
            Thấp hơn
          </button>
          <button
            className={`flex-1 rounded-xl border-[3px] py-2 font-cozy font-bold transition ${side === 1 ? "border-cocoa-700/80 bg-blush-400 text-white shadow-chunkySm" : "border-cream-300 bg-white text-cocoa-500"}`}
            onClick={() => setSide(1)}
          >
            Cao hơn
          </button>
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số mUSDC cược" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="btn-cozy shrink-0" disabled={tx.step !== null || !m || m.resolved || !parseAmount(amount)} onClick={predict}>
          Đặt
        </button>
      </div>
      {m?.resolved && preview > 0n && (
        <button className="btn-cozy mt-2 w-full" disabled={tx.step !== null} onClick={claim}>
          Nhận {fmt(preview)} mUSDC thắng cược
        </button>
      )}
      {m && !m.resolved && (
        <button className="btn-cream mt-2 w-full" disabled={tx.step !== null} onClick={resolve}>
          Chốt kết quả (khi đã qua hạn)
        </button>
      )}
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** King of the Hill: stake nhiều hơn vua hiện tại 10% để lật đổ, vua nhận % pool mỗi kỳ. */
function KingOfTheHillCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.kingOfTheHill);
  const allowance = useTokenAllowance(live ? contracts.kingOfTheHill : undefined);
  const [stake, setStake] = useState("");

  const state = useReadContracts({
    contracts: live
      ? [
          { address: contracts.kingOfTheHill, abi: kingOfTheHillAbi, functionName: "king", args: [] },
          { address: contracts.kingOfTheHill, abi: kingOfTheHillAbi, functionName: "kingStake", args: [] },
          { address: contracts.kingOfTheHill, abi: kingOfTheHillAbi, functionName: "prizePool", args: [] },
          { address: contracts.kingOfTheHill, abi: kingOfTheHillAbi, functionName: "totalUsurped", args: [address ?? "0x0000000000000000000000000000000000000000"] },
        ]
      : [],
    query: { refetchInterval: 10_000, enabled: live },
  });
  const king = (state.data?.[0]?.result as string | undefined) ?? "0x0000000000000000000000000000000000000000";
  const kingStake = (state.data?.[1]?.result as bigint | undefined) ?? 0n;
  const pool = (state.data?.[2]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function claimThrone() {
    const amt = parseAmount(stake);
    if (!amt) return;
    const calls = withTokenApprove(
      [{ label: "Đang lên ngôi…", call: { address: contracts.kingOfTheHill, abi: kingOfTheHillAbi, functionName: "claimThrone", args: [amt] } }],
      contracts.kingOfTheHill, amt, allowance,
    );
    if (await tx.run("Lật đổ ngai vàng", calls)) setStake("");
  }
  const settle = () =>
    tx.run("Thưởng cho vua", [{ label: "Đang trả thưởng kỳ…", call: { address: contracts.kingOfTheHill, abi: kingOfTheHillAbi, functionName: "settleKingReward", args: [] } }]);
  const abdicate = () =>
    tx.run("Nhường ngôi", [{ label: "Đang nhường ngai…", call: { address: contracts.kingOfTheHill, abi: kingOfTheHillAbi, functionName: "abdicate", args: [] } }]);

  const isKing = address?.toLowerCase() === king.toLowerCase();

  return (
    <FeatureCard icon="crown" title="Ngai vàng tiết kiệm" desc="Stake nhiều hơn vua ít nhất 10% để lật đổ — vua hưởng % pool mỗi kỳ">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Vua hiện tại" value={king === "0x0000000000000000000000000000000000000000" ? "Trống" : shortAddr(king)} tone="text-lavender-500" />
        <Stat label="Stake của vua" value={fmt(kingStake)} />
        <Stat label="Prize pool" value={fmt(pool)} tone="text-leaf-600" />
      </div>
      <div className="mt-2 flex gap-2">
        <input className="input-cozy flex-1" inputMode="decimal" placeholder="Stake mới" value={stake} onChange={(e) => setStake(e.target.value)} />
        <button className="btn-cozy shrink-0" disabled={tx.step !== null || !parseAmount(stake)} onClick={claimThrone}>
          Lên ngôi
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <button className="btn-cream flex-1" disabled={tx.step !== null} onClick={settle}>Trả thưởng kỳ</button>
        {isKing && (
          <button className="btn-cream flex-1" disabled={tx.step !== null} onClick={abdicate}>Nhường ngôi</button>
        )}
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Xổ số tiết kiệm: mỗi mUSDC lãi = 1 vé; quay theo kỳ, jackpot cộng dồn. */
function PrizeLinkedCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.prizeLinked);
  const [drawIndex, setDrawIndex] = useState("");

  const state = useReadContracts({
    contracts: live && address
      ? [
          { address: contracts.prizeLinked, abi: prizeLinkedSavingsAbi, functionName: "ticketSize", args: [] },
          { address: contracts.prizeLinked, abi: prizeLinkedSavingsAbi, functionName: "drawInterval", args: [] },
          { address: contracts.prizeLinked, abi: prizeLinkedSavingsAbi, functionName: "totalTickets", args: [] },
          { address: contracts.prizeLinked, abi: prizeLinkedSavingsAbi, functionName: "tickets", args: [address] },
          { address: contracts.prizeLinked, abi: prizeLinkedSavingsAbi, functionName: "jackpotRollover", args: [] },
        ]
      : [],
    query: { refetchInterval: 10_000, enabled: live && !!address },
  });
  const ticketSize = (state.data?.[0]?.result as bigint | undefined) ?? 0n;
  const totalTickets = (state.data?.[2]?.result as bigint | undefined) ?? 0n;
  const myTickets = (state.data?.[3]?.result as bigint | undefined) ?? 0n;
  const jackpot = (state.data?.[4]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function call(fn: string, args: (string | bigint)[], label: string) {
    await tx.run(label, [{ label, call: { address: contracts.prizeLinked, abi: prizeLinkedSavingsAbi, functionName: fn, args } }]);
  }

  return (
    <FeatureCard icon="ticket" title="Xổ số tiết kiệm" desc="Lãi kỳ này tự thành vé số — không mất thêm đồng nào">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Vé của bạn" value={address ? myTickets.toString() : undefined} tone="text-lavender-500" />
        <Stat label="Tổng vé" value={totalTickets.toString()} />
        <Stat label="Jackpot" value={fmt(jackpot)} tone="text-leaf-600" />
      </div>
      {ticketSize > 0n && <p className="mt-2 text-[11px] font-semibold text-cocoa-500">1 vé = {fmt(ticketSize)} mUSDC lãi mỗi kỳ</p>}
      {address && myTickets === 0n && totalTickets === 0n && (
        <p className="mt-2 text-[11px] font-semibold text-cocoa-500">
          Chưa có vé nào trong hệ thống — nhận lãi kỳ này rồi bấm "Đồng bộ vé" để tham gia quay.
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button className="btn-cream flex-1" disabled={tx.step !== null} onClick={() => call("syncTickets", [], "Đang đồng bộ vé…")}>Đồng bộ vé</button>
        <button className="btn-cozy flex-1" disabled={tx.step !== null} onClick={() => call("claimPrize", [], "Đang nhận giải…")}>Nhận giải</button>
      </div>
      <div className="mt-2 flex gap-2">
        <input className="input-cozy flex-1" inputMode="numeric" placeholder="Kỳ quay (drawIndex)" value={drawIndex} onChange={(e) => setDrawIndex(e.target.value.replace(/[^0-9]/g, ""))} />
        <button className="btn-cream shrink-0" disabled={tx.step !== null || !drawIndex} onClick={() => call("draw", [BigInt(drawIndex)], "Đang quay số…")}>Quay</button>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Guild Wars: vào bang, cùng nhau giữ streak để gom điểm mùa, chia prize pool. */
function GuildWarsCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.guildWars);
  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");

  const state = useReadContracts({
    contracts: live && address
      ? [
          { address: contracts.guildWars, abi: guildWarsAbi, functionName: "season", args: [] },
          { address: contracts.guildWars, abi: guildWarsAbi, functionName: "prizePool", args: [] },
          { address: contracts.guildWars, abi: guildWarsAbi, functionName: "guildCount", args: [] },
          { address: contracts.guildWars, abi: guildWarsAbi, functionName: "guildOf", args: [address] },
          { address: contracts.guildWars, abi: guildWarsAbi, functionName: "pendingReward", args: [address] },
        ]
      : [],
    query: { refetchInterval: 12_000, enabled: live && !!address },
  });
  const season = (state.data?.[0]?.result as bigint | undefined) ?? 0n;
  const pool = (state.data?.[1]?.result as bigint | undefined) ?? 0n;
  const guildCount = (state.data?.[2]?.result as bigint | undefined) ?? 0n;
  const myGuild = (state.data?.[3]?.result as bigint | undefined) ?? 0n;
  const pending = (state.data?.[4]?.result as bigint | undefined) ?? 0n;

  const myGuildState = useReadContracts({
    contracts: live && myGuild > 0n ? [{ address: contracts.guildWars, abi: guildWarsAbi, functionName: "getGuild", args: [myGuild] }] : [],
    query: { refetchInterval: 12_000, enabled: live && myGuild > 0n },
  });
  const g = myGuildState.data?.[0]?.result as { name: string; points: bigint; members: string[] } | undefined;

  if (!live) return null;

  async function call(fn: string, args: (string | bigint)[], label: string) {
    const ok = await tx.run(label, [{ label, call: { address: contracts.guildWars, abi: guildWarsAbi, functionName: fn, args } }]);
    if (ok && fn === "createGuild") setName("");
  }

  return (
    <FeatureCard icon="flag" title="Bang hội chiến" desc="Mỗi streak thành viên = điểm cho bang — bang mạnh nhất mùa chia prize pool">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Mùa" value={season.toString()} />
        <Stat label="Bang đã lập" value={guildCount > 0n || state.data ? guildCount.toString() : undefined} />
        <Stat label="Pool" value={fmt(pool)} tone="text-leaf-600" />
      </div>
      {myGuild > 0n && g ? (
        <div className="mt-2 rounded-xl border-2 border-lavender-400/50 bg-white/80 p-2.5">
          <div className="flex items-center justify-between">
            <span className="font-cozy font-bold text-cocoa-700">Bang {g.name} #{myGuild.toString()}</span>
            <span className="font-cozy text-sm font-extrabold text-blush-500">{g.points.toString()} điểm</span>
          </div>
          <div className="text-[11px] font-semibold text-cocoa-500">{g.members.length} thành viên</div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] font-semibold text-cocoa-500">Bạn chưa vào bang nào.</p>
      )}
      <div className="mt-2 grid grid-cols-1 gap-2">
        <div className="flex gap-2">
          <input className="input-cozy flex-1" placeholder="Tên bang mới" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-cozy shrink-0" disabled={tx.step !== null || !name || !address} onClick={() => call("createGuild", [name], "Đang lập bang…")}>Lập bang</button>
        </div>
        <div className="flex gap-2">
          <input className="input-cozy flex-1" inputMode="numeric" placeholder="ID bang muốn vào" value={joinId} onChange={(e) => setJoinId(e.target.value.replace(/[^0-9]/g, ""))} />
          <button className="btn-cream shrink-0" disabled={tx.step !== null || !joinId || !address} onClick={() => call("joinGuild", [BigInt(joinId)], "Đang gia nhập bang…")}>Vào bang</button>
        </div>
        <div className="flex gap-2">
          <button className="btn-cream flex-1" disabled={tx.step !== null} onClick={() => call("sync", [], "Đang tính điểm mùa…")}>Cập nhật điểm</button>
          <button className="btn-cozy flex-1" disabled={tx.step !== null || pending === 0n} onClick={() => call("claimReward", [], "Đang nhận thưởng bang…")}>
            Thưởng {fmt(pending)}
          </button>
        </div>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Quỹ ăn mừng: tip vào quỹ, mốc streak 5/10/20 nhận thưởng mUSDC. */
function CelebrationCard({ data }: { data: VaultData }) {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.celebrationPool);
  const allowance = useTokenAllowance(live ? contracts.celebrationPool : undefined);
  const streak = Number(data.account?.streak ?? 0n);
  const [message, setMessage] = useState("");
  const [tip, setTip] = useState("");

  const state = useReadContracts({
    contracts: live && address
      ? [
          { address: contracts.celebrationPool, abi: celebrationPoolAbi, functionName: "pool", args: [] },
          { address: contracts.celebrationPool, abi: celebrationPoolAbi, functionName: "celebrationCount", args: [] },
          { address: contracts.celebrationPool, abi: celebrationPoolAbi, functionName: "claimedMilestones", args: [address] },
        ]
      : [],
    query: { refetchInterval: 12_000, enabled: live && !!address },
  });
  const pool = (state.data?.[0]?.result as bigint | undefined) ?? 0n;
  const celebrated = (state.data?.[1]?.result as bigint | undefined) ?? 0n;
  const claimedMs = (state.data?.[2]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function doTip() {
    const amt = parseAmount(tip);
    if (!amt) return;
    const calls = withTokenApprove(
      [{ label: "Đang gửi tip ăn mừng…", call: { address: contracts.celebrationPool, abi: celebrationPoolAbi, functionName: "tip", args: [message || "Chúc mừng!", amt] } }],
      contracts.celebrationPool, amt, allowance,
    );
    if (await tx.run("Tip ăn mừng", calls)) {
      setTip("");
      setMessage("");
    }
  }
  async function celebrate() {
    await tx.run("Ăn mừng cột mốc", [
      { label: "Đang nhận thưởng mốc streak…", call: { address: contracts.celebrationPool, abi: celebrationPoolAbi, functionName: "celebrate", args: [] } },
    ]);
  }

  const nextMilestone = [5, 10, 20].find((mm) => streak < mm);

  return (
    <FeatureCard icon="party" title="Quỹ ăn mừng" desc="Mốc streak 5 / 10 / 20 tuần nhận thưởng từ quỹ do cả nhóm tip nuôi">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Quỹ" value={fmt(pool)} tone="text-leaf-600" />
        <Stat label="Lượt ăn mừng" value={celebrated.toString()} />
        <Stat label="Mốc đã nhận" value={`${claimedMs}/3`} tone="text-lavender-500" />
      </div>
      <div className="mt-2 flex gap-2">
        <input className="input-cozy flex-1" placeholder="Lờ chúc mừng" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <div className="mt-2 flex gap-2">
        <input className="input-cozy flex-1" inputMode="decimal" placeholder="Tip mUSDC" value={tip} onChange={(e) => setTip(e.target.value)} />
        <button className="btn-cream shrink-0" disabled={tx.step !== null || !parseAmount(tip)} onClick={doTip}>Gửi tip</button>
      </div>
      <button className="btn-cozy mt-2 w-full" disabled={tx.step !== null || nextMilestone !== undefined} onClick={celebrate}>
        {nextMilestone ? `Còn ${nextMilestone - streak} tuần tới mốc ${nextMilestone}` : "Nhận thưởng mốc streak"}
      </button>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}
