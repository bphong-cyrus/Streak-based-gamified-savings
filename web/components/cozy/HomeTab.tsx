"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { Building } from "@/components/cozy/Building";
import { DepositSheet } from "@/components/cozy/DepositSheet";
import { Icon } from "@/components/cozy/icons";
import { TxFeedback, useTx } from "@/components/useTx";
import { useTokenAllowance, withTokenApprove } from "@/components/cozy/panel";
import { contracts } from "@/lib/config";
import { streakVaultAbi } from "@/lib/abis";
import { fmt } from "@/lib/format";
import { sfx } from "@/lib/sound";
import type { VaultData } from "@/lib/useVaultData";

interface Props {
  data: VaultData;
  night: boolean;
  building: boolean;
  celebrateKey: number;
  onDepositStart: () => void;
  isDemo?: boolean;
}

function Tile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="card-cream p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-cocoa-500/90">
        <span className="text-cocoa-500">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-0.5 font-cozy text-xl font-extrabold leading-tight tabular-nums ${tone ?? "text-cocoa-700"}`}>{value}</div>
      {sub && <div className="text-[11px] font-semibold text-cocoa-500">{sub}</div>}
    </div>
  );
}

const HEAT_WEEKS = 12;

/** Heatmap 12 kỳ gần nhất: xanh = đạt mục tiêu, hồng = lỡ, xanh dương nhấp nháy = kỳ đang diễn ra. */
function StreakHeatmap({ data }: { data: VaultData }) {
  const { address } = useAccount();
  const current = data.account?.currentEpoch;
  const started = data.hasStarted;

  const from = current !== undefined && current > BigInt(HEAT_WEEKS - 1) ? current - BigInt(HEAT_WEEKS - 1) : 0n;
  const epochs = started && current !== undefined
    ? Array.from({ length: Number(current - from) + 1 }, (_, i) => from + BigInt(i))
    : [];

  const reads = useReadContracts({
    contracts: address
      ? epochs.map((e) => ({
          address: contracts.vault,
          abi: streakVaultAbi,
          functionName: "getEpochStatus" as const,
          args: [address, e],
        }))
      : [],
    query: { refetchInterval: 20_000, enabled: !!address && epochs.length > 0 },
  });

  const qualified = reads.data?.filter((r) => {
    const s = r.result as { settled: boolean; qualified: boolean } | undefined;
    return s?.settled && s.qualified;
  }).length ?? 0;

  return (
    <div className="card-cream p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-cozy text-lg font-bold">
          <Icon name="flame" size={19} className="text-blush-500" /> Lịch sử {HEAT_WEEKS} kỳ gần nhất
        </h3>
        <span className="rounded-full bg-leaf-300/40 px-2.5 py-0.5 font-cozy text-xs font-extrabold text-leaf-600">
          {qualified}/{epochs.length || HEAT_WEEKS} đạt
        </span>
      </div>
      {!address ? (
        <p className="mt-2 text-sm font-semibold text-cocoa-500">Kết nối ví để xem lịch sử streak của bạn.</p>
      ) : (
        <div className="mt-3 flex justify-between gap-1.5">
          {epochs.map((e, i) => {
            const s = reads.data?.[i]?.result as
              | { progress: bigint; target: bigint; settled: boolean; qualified: boolean }
              | undefined;
            const isCurrent = e === current;
            const cls = !s
              ? "skeleton"
              : s.settled && s.qualified
                ? "bg-gradient-to-b from-leaf-400 to-leaf-500"
                : s.settled
                  ? "bg-blush-300"
                  : isCurrent
                    ? "animate-pulse bg-sky-300"
                    : "bg-cocoa-700/15";
            return (
              <div key={e.toString()} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`h-12 w-full rounded-lg ${cls} ${isCurrent ? "ring-2 ring-sky-400/60" : ""}`}
                  title={
                    s
                      ? `Kỳ #${e.toString()}: ${s.settled ? (s.qualified ? "đạt" : "lỡ") : "đang diễn ra"} · ${fmt(s.progress)}/${fmt(s.target)} mUSDC`
                      : `Kỳ #${e.toString()}`
                  }
                />
                <span className="text-[8px] font-bold text-cocoa-500/70">{e.toString()}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-cocoa-500">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-leaf-400" /> Đạt</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-blush-300" /> Lỡ</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 animate-pulse rounded-sm bg-sky-300" /> Kỳ này</span>
      </div>
    </div>
  );
}

/** Dashboard: streak hero, heatmap, tòa nhà 3D, CTA gửi tiền, faucet cho ví mới, đóng băng khi sắp hết hạn. */
export function HomeTab({ data, night, building, celebrateKey, onDepositStart, isDemo }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showParty, setShowParty] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState(0);
  const { account, claimable, claimed, countdown, hasStarted, tokenBalance } = data;
  const floorsEarly = Number(data.account?.streak ?? 0n);

  useEffect(() => {
    const measure = () => setNatural(wrapRef.current?.offsetHeight ?? 0);
    measure();
    const t = setTimeout(measure, 300);
    return () => clearTimeout(t);
  }, [floorsEarly, building, celebrateKey]);

  useEffect(() => {
    if (celebrateKey === 0) return;
    sfx.fanfare();
    setShowParty(true);
    const t = setTimeout(() => setShowParty(false), 3200);
    return () => clearTimeout(t);
  }, [celebrateKey]);

  if (hasStarted === false) {
    return (
      <div className="card-cream mx-4 mt-4 p-5 text-center">
        <div className="mx-auto w-fit"><Icon name="clock" size={40} className="text-cocoa-500" /></div>
        <h2 className="mt-2 font-cozy text-xl font-bold">Chưa đến giờ mở kỳ đầu tiên</h2>
        <p className="mt-1 text-sm font-semibold text-cocoa-500">Tòa nhà khởi công sau {countdown}. Quay lại sớm nhé!</p>
      </div>
    );
  }
  if (!account) return null;

  const target = account.currentTarget;
  const progress = account.currentProgress;
  const pct = target > 0n ? Math.min(100, Number((progress * 100n) / target)) : 0;
  const goalDone = target > 0n && progress >= target;
  const floors = Number(account?.streak ?? 0n);
  const interestTotal = (claimed ?? 0n) + (claimable ?? 0n);
  const remaining = target > progress ? target - progress : 0n;
  const urgent = !!countdown?.startsWith("00:") && !goalDone && target > 0n;
  const isNewWallet = !account.activated;

  const vw = typeof window !== "undefined" ? window.innerWidth : 420;
  const sectionW = Math.min(840, vw - 24);
  const available = typeof window !== "undefined" ? Math.min(window.innerHeight * 0.55, 560) : 480;
  const autoScale = natural > 0 ? Math.max(0.45, Math.min(1.6, sectionW / 420, (available / natural) * 1.15)) : 1;
  const fit = autoScale;
  const scale = zoom ?? autoScale;

  return (
    <div className="space-y-3 lg:grid lg:grid-cols-12 lg:gap-4 lg:space-y-0">
      {/* Cột trái — HUD: Streak hero + stats (desktop: 4 cột; mobile: full) */}
      <div className="relative z-10 space-y-3 lg:col-span-4">
        {/* Streak hero */}
        <div className="card-cream relative overflow-hidden p-4">
          <div className="pointer-events-none absolute -right-6 -top-8 opacity-[0.08]">
            <Icon name="flame" size={150} className="text-blush-500" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-blush-400 to-blush-500 text-white shadow-md">
                <Icon name="flame" size={30} />
              </span>
              <div>
                <div className="font-cozy text-4xl font-extrabold leading-none text-cocoa-700 tabular-nums">
                  {account.streak.toString()}
                  <span className="ml-1.5 text-base font-bold text-cocoa-500">tuần</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-cocoa-500">liên tiếp</div>
              </div>
            </div>
            <div
              className={`shrink-0 rounded-full border px-3 py-1.5 text-center font-cozy text-sm font-bold ${
                urgent ? "animate-pulse border-blush-500 bg-blush-400 text-white" : "border-cocoa-700/20 bg-white/80 text-cocoa-700"
              }`}
            >
              <Icon name="clock" size={14} className="mr-1 inline -mt-0.5" />
              {countdown}
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-bold text-cocoa-500">
              <span className="flex items-center gap-1"><Icon name="target" size={13} /> Mục tiêu kỳ này</span>
              <span className="font-cozy text-sm text-cocoa-700 tabular-nums">{fmt(progress)} / {fmt(target)} mUSDC · {pct}%</span>
            </div>
            <div className="mt-1.5 h-3.5 overflow-hidden rounded-full bg-cocoa-700/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ mục tiêu kỳ này">
              <div
                className={`h-full rounded-full transition-all duration-700 ${goalDone ? "bg-gradient-to-r from-leaf-400 to-leaf-500" : "bg-gradient-to-r from-blush-400 to-blush-300"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4 chỉ số */}
        <div className="grid grid-cols-2 gap-2">
          <Tile icon={<Icon name="bank" size={16} />} label="Tiết kiệm" value={`${fmt(account.principal)}`} sub="mUSDC · rút anytime" />
          <Tile icon={<Icon name="chart" size={16} />} label="Lãi tích lũy" value={`+${fmt(interestTotal)}`} sub={`Chờ nhận ${fmt(claimable)} mUSDC`} tone="text-leaf-600" />
          <Tile icon={<Icon name="target" size={16} />} label="Số kỳ đã tham gia" value={account.currentEpoch.toString()} sub={`Lv.${1 + Math.floor(floors / 2)} · ${account.depositCount?.toString() ?? "0"} lần gửi`} />
          <Tile icon={<Icon name="wallet" size={16} />} label="Ví của bạn" value={`${fmt(tokenBalance, 2)}`} sub="mUSDC khả dụng" />
        </div>

        {/* Heatmap 12 kỳ */}
        <div className="hidden lg:block">
          <StreakHeatmap data={data} />
        </div>
      </div>

      {/* Cột giữa — Nhà 3D */}
      <div className="relative z-0 lg:col-span-5">
        <div className="relative flex flex-col items-center justify-center rounded-[24px] border border-[#eadfc6] bg-[#fffdf7]/70 p-3 shadow-sm backdrop-blur-sm">
          {/* Badge Floor gọn ở trên */}
          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-2xl border border-cocoa-700/15 bg-white/95 px-4 py-1 shadow-sm backdrop-blur-sm">
            <div className="font-cozy text-[10px] font-bold uppercase tracking-wide text-cocoa-500">Tầng</div>
            <div className="text-center font-cozy text-xl font-extrabold leading-none text-cocoa-700 tabular-nums">{building ? floors + 1 : floors}</div>
          </div>

          <div
            className="relative w-full overflow-visible"
            style={{ height: Math.max(280, (natural || 360) * scale + 40) }}
          >
            <div
              ref={wrapRef}
              className="pointer-events-none absolute left-1/2 top-1/2 w-fit -translate-x-1/2 -translate-y-1/2"
              style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
            >
              <Building key={celebrateKey} floors={floors} night={night} building={building} celebrating={celebrateKey > 0} goalDone={goalDone} />
              {showParty && !building && (
                <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center">
                  <div className="rounded-2xl border-[3px] border-cocoa-700/70 bg-cream-100 px-4 py-2 text-center font-cozy text-lg font-extrabold text-cocoa-700 shadow-chunky" style={{ animation: "bannerPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                    🎉 TẦNG MỚI HOÀN THÀNH!
                  </div>
                  <div className="big-jump mt-4 text-6xl" style={{ filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.3))" }}>🐈</div>
                  <div className="mt-3 rounded-full border-2 border-leaf-500/50 bg-leaf-300/60 px-3 py-1 font-cozy text-xs font-extrabold text-leaf-600" style={{ animation: "bannerPop 0.5s 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                    +1 🔥 Chuỗi kiên trì · +1 🏗️ Tầng mới
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA chính + freeze — mobile full width; desktop có thể ở dưới nhà */}
        <div className="mx-auto mt-3 max-w-xs text-center lg:max-w-sm">
          {isNewWallet && !isDemo ? (
            <FaucetCard />
          ) : (
            <button className="btn-cozy w-full text-lg active:translate-y-[2px] active:border-b-2" onClick={() => (isDemo ? onDepositStart() : setSheetOpen(true))}>
              {isDemo ? "Mô phỏng gửi tiền — xem tòa nhà lớn lên" : goalDone ? "Gửi thêm" : `Gửi ${fmt(remaining)} mUSDC hoàn thành tầng`}
            </button>
          )}
          {urgent && !isNewWallet && <FreezeEpochButton />}
          {!account.activated && !isDemo && (
            <p className="mt-2 text-xs font-semibold text-cocoa-500">Nhận 5 mUSDC miễn phí ở trên để bắt đầu xây nhà nhé!</p>
          )}
        </div>
      </div>

      {/* Cột phải — Controls + heatmap mobile (desktop: zoom, quick actions) */}
      <div className="relative z-10 space-y-3 lg:col-span-3">
        <div className="card-cream p-4">
          <h4 className="font-cozy text-sm font-bold text-cocoa-600">Điều khiển tòa nhà</h4>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              className="btn-cream h-11 w-11 !p-0 text-lg font-extrabold active:translate-y-[2px] active:border-b-2"
              disabled={scale >= 2.2}
              onClick={() => setZoom(Math.min(2.2, scale + 0.15))}
              title="Phóng to"
              aria-label="Phóng to tòa nhà"
            >+</button>
            <button
              className="btn-cream h-11 w-11 !p-0 text-lg font-extrabold active:translate-y-[2px] active:border-b-2"
              disabled={scale <= 0.4}
              onClick={() => setZoom(Math.max(0.4, scale - 0.15))}
              title="Thu nhỏ"
              aria-label="Thu nhỏ tòa nhà"
            >−</button>
            <button
              className="btn-cream h-11 px-3 text-sm font-extrabold active:translate-y-[2px] active:border-b-2"
              onClick={() => setZoom(fit)}
              title="Vừa khung hình"
              aria-label="Vừa khung hình"
            >⛶ Vừa khung</button>
          </div>
        </div>

        <div className="lg:hidden">
          <StreakHeatmap data={data} />
        </div>
      </div>

      <DepositSheet data={data} open={sheetOpen} onClose={() => setSheetOpen(false)} onDeposited={onDepositStart} />
    </div>
  );
}

/** Ví mới chưa kích hoạt: nhận 5 mUSDC thẳng vào vault + mục tiêu kỳ đầu tự đặt. */
function FaucetCard() {
  const tx = useTx();
  async function drip() {
    const { faucetDripAbi } = await import("@/lib/abis");
    await tx.run("Vòi nước ngườ mới", [
      { label: "Đang nhận 5 mUSDC + đặt mục tiêu đầu…", call: { address: contracts.faucetDrip, abi: faucetDripAbi, functionName: "drip", args: [] } },
    ]);
  }

  return (
    <div className="mt-3 rounded-2xl border-2 border-dashed border-leaf-500/60 bg-leaf-300/15 p-4">
      <div className="flex items-center gap-2 font-cozy text-lg font-extrabold text-cocoa-700">
        <Icon name="droplet" size={22} className="text-leaf-600" /> Chào mừng chủ nhân mới!
      </div>
      <p className="mt-1 text-sm font-semibold text-cocoa-500">
        Nhận <strong>5 mUSDC</strong> gửi thẳng vào tòa nhà + mục tiêu kỳ đầu được đặt sẵn — bấm một nút là xong.
      </p>
      <button className="btn-cozy mt-3 w-full active:translate-y-[2px] active:border-b-2" disabled={tx.step !== null} onClick={drip}>
        Nhận 5 mUSDC miễn phí & bắt đầu
      </button>
      <TxFeedback state={tx} />
    </div>
  );
}

/** Tự trả phí đóng băng kỳ hiện tại — chỉ hiện khi sắp hết hạn mà chưa đủ mục tiêu. */
function FreezeEpochButton() {
  const tx = useTx();
  const allowance = useTokenAllowance(contracts.vault);
  const feeState = useReadContracts({
    contracts: [{ address: contracts.vault, abi: streakVaultAbi, functionName: "freezeFee", args: [] }],
    query: { refetchInterval: 30_000 },
  });
  const fee = (feeState.data?.[0]?.result as bigint | undefined) ?? 0n;
  if (fee === 0n) return null;

  async function freeze() {
    const calls = withTokenApprove(
      [{ label: "Đang đóng băng kỳ này…", call: { address: contracts.vault, abi: streakVaultAbi, functionName: "freezeCurrentEpoch", args: [] } }],
      contracts.vault,
      fee,
      allowance,
    );
    await tx.run("Đóng băng streak", calls);
  }

  return (
    <div className="mt-2">
      <button className="btn-cream w-full !py-2 text-sm active:translate-y-[2px] active:border-b-2" disabled={tx.step !== null} onClick={freeze}>
        <Icon name="snow" size={15} className="inline -mt-0.5" /> Đóng băng kỳ này ({fmt(fee)} mUSDC) — giữ chuỗi an toàn
      </button>
      <TxFeedback state={tx} />
    </div>
  );
}
