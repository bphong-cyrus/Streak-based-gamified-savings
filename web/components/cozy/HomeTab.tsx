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
  onDemoDeposit?: () => void;
  isDemo?: boolean;
}

const HEAT_WEEKS = 12;

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="font-cozy text-lg font-bold text-ink">{children}</h3>
      {action}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="card p-6 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-border border-t-cta" />
      <p className="mt-3 font-semibold text-ink-soft">Đang tải dữ liệu tòa nhà…</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="card p-6 text-center">
      <Icon name="flag" size={40} className="mx-auto text-ink-muted" />
      <h2 className="mt-2 font-cozy text-xl font-bold text-ink">Không đọc được dữ liệu</h2>
      <p className="mt-1 text-sm font-semibold text-ink-soft">RPC Fuji có thể đang bận. Thử lại sau vài giây nhé.</p>
      {onRetry && (
        <button className="btn-primary mt-4" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

function NotStartedState({ countdown }: { countdown: string }) {
  return (
    <div className="card p-6 text-center">
      <Icon name="clock" size={40} className="mx-auto text-ink-muted" />
      <h2 className="mt-2 font-cozy text-xl font-bold text-ink">Chưa đến giờ mở kỳ đầu tiên</h2>
      <p className="mt-1 text-sm font-semibold text-ink-soft">Tòa nhà khởi công sau {countdown}. Quay lại sớm nhé!</p>
    </div>
  );
}

/** Heatmap 12 kỳ gần nhất: xanh = đạt, hồng = lỡ, nhấp nháy xanh dương = kỳ đang diễn ra. */
function StreakHeatmap({ data }: { data: VaultData }) {
  const { address } = useAccount();
  const current = data.account?.currentEpoch;
  const started = data.hasStarted;

  const from = current !== undefined && current > BigInt(HEAT_WEEKS - 1) ? current - BigInt(HEAT_WEEKS - 1) : 0n;
  const epochs = started && current !== undefined ? Array.from({ length: Number(current - from) + 1 }, (_, i) => from + BigInt(i)) : [];

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
    <div className="card p-4">
      <SectionTitle action={<span className="rounded-full bg-surface-sunken px-2.5 py-0.5 font-cozy text-xs font-extrabold text-ink-soft">{qualified}/{epochs.length || HEAT_WEEKS} đạt</span>}>
        <Icon name="flame" size={19} className="inline text-terracotta" /> Lịch sử {HEAT_WEEKS} kỳ gần nhất
      </SectionTitle>
      {!address ? (
        <p className="text-sm font-semibold text-ink-soft">Kết nối ví để xem lịch sử streak của bạn.</p>
      ) : (
        <>
          <div className="mt-1 flex justify-between gap-1.5">
            {epochs.map((e, i) => {
              const s = reads.data?.[i]?.result as
                | { progress: bigint; target: bigint; settled: boolean; qualified: boolean }
                | undefined;
              const isCurrent = e === current;
              const cls = !s
                ? "skeleton"
                : s.settled && s.qualified
                  ? "bg-cta"
                  : s.settled
                    ? "bg-streak-missed"
                    : isCurrent
                      ? "animate-pulse bg-streak-current"
                      : "bg-border";
              return (
                <div key={e.toString()} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`h-12 w-full rounded-lg ${cls} ${isCurrent ? "ring-2 ring-streak-current/60" : ""}`}
                    title={
                      s
                        ? `Kỳ #${e.toString()}: ${s.settled ? (s.qualified ? "đạt" : "lỡ") : "đang diễn ra"} · ${fmt(s.progress)}/${fmt(s.target)} mUSDC`
                        : `Kỳ #${e.toString()}`
                    }
                  />
                  <span className="text-[8px] font-bold text-ink-muted">{e.toString()}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-ink-soft">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-cta" /> Đạt</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-streak-missed" /> Lỡ</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 animate-pulse rounded-sm bg-streak-current" /> Kỳ này</span>
          </div>
        </>
      )}
    </div>
  );
}

export function HomeTab({ data, night, building, celebrateKey, onDepositStart, onDemoDeposit, isDemo }: Props) {
  const [sheetMode, setSheetMode] = useState<"deposit" | "withdraw" | null>(null);
  const [showParty, setShowParty] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [sceneSize, setSceneSize] = useState({ w: 0, h: 0 });
  const { account, claimable, claimed, countdown, hasStarted, tokenBalance, epochDuration } = data;

  useEffect(() => {
    const measure = () => {
      if (sceneRef.current) {
        setSceneSize({ w: sceneRef.current.clientWidth, h: sceneRef.current.clientHeight });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 300);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (celebrateKey === 0) return;
    sfx.fanfare();
    setShowParty(true);
    const t = setTimeout(() => setShowParty(false), 3200);
    return () => clearTimeout(t);
  }, [celebrateKey]);

  if (data === undefined || hasStarted === undefined) return <LoadingState />;
  if (hasStarted === false) return <NotStartedState countdown={countdown} />;

  const target = account?.currentTarget ?? 0n;
  const progress = account?.currentProgress ?? 0n;
  const pct = target > 0n ? Math.min(100, Number((progress * 100n) / target)) : 0;
  const goalDone = target > 0n && progress >= target;
  const floors = Number(account?.streak ?? 0n);
  const interestTotal = (claimed ?? 0n) + (claimable ?? 0n);
  const remaining = target > progress ? target - progress : 0n;
  const secondsLeft = countdown === "Hết hạn" ? 0 : parseCountdownSeconds(countdown);
  const urgent = secondsLeft !== undefined && secondsLeft < 600 && !goalDone && target > 0n && !isDemo;
  const isNewWallet = !account?.activated && !isDemo;

  const scale = zoom ?? 1;

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
      {/* Cột trái — HUD chính */}
      <div className="space-y-4 lg:col-span-5">
        {isDemo && (
          <div
            data-testid="demo-notice"
            className="rounded-2xl border border-dashed border-cta/50 bg-cta/5 p-3 text-center text-xs font-bold text-ink-soft"
            role="note"
          >
            Bản thử — số liệu mô phỏng, <span className="text-ink">không phải số dư thật</span>. Kết nối ví để
            giao dịch on-chain.
          </div>
        )}
        <div className="card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-ink-muted">Gốc đã gửi</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-cozy text-[44px] font-extrabold leading-none tabular-nums text-ink md:text-[52px]">
              {fmt(account?.principal)}
            </span>
            <span className="text-base font-semibold text-ink-muted">mUSDC</span>
          </div>

          <div className="my-4 h-px bg-border" />

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">Tiến độ kỳ này</span>
            <span className="font-cozy text-sm font-bold tabular-nums text-ink">
              {fmt(progress)} / {fmt(target)} mUSDC · {pct}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ mục tiêu kỳ này">
            <div
              className={`h-full rounded-full transition-all duration-700 ${goalDone ? "bg-cta" : "bg-terracotta"}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            {goalDone ? (
              <span className="font-semibold text-cta">Đã đủ mục tiêu · Chờ chốt kỳ</span>
            ) : target > 0n ? (
              <span className="font-semibold text-ink-soft">Còn {fmt(remaining)} mUSDC để đạt mục tiêu</span>
            ) : (
              <span className="font-semibold text-ink-soft">Chưa đặt mục tiêu kỳ này</span>
            )}
            <span className={`flex items-center gap-1 font-cozy text-sm font-bold tabular-nums ${urgent ? "text-danger" : "text-ink-soft"}`}>
              <Icon name="clock" size={14} />
              {countdown}
            </span>
          </div>

          <div className="mt-5 space-y-2">
            {isNewWallet ? (
              <FaucetCard />
            ) : isDemo ? (
              <>
                <button
                  data-testid="demo-deposit"
                  className="btn-primary w-full text-lg active:translate-y-[2px]"
                  disabled={building}
                  onClick={onDemoDeposit}
                >
                  {building ? "Đang xây tầng…" : "Mô phỏng gửi tiền"}
                </button>
                {(account?.principal ?? 0n) > 0n && (
                  <button className="btn-ghost w-full" disabled={building} onClick={() => setSheetMode("withdraw")}>
                    Rút gốc
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  className="btn-primary w-full text-lg active:translate-y-[2px]"
                  onClick={() => setSheetMode("deposit")}
                >
                  {goalDone ? "Gửi thêm" : `Gửi ${fmt(remaining)} mUSDC hoàn thành tầng`}
                </button>
                {(account?.principal ?? 0n) > 0n && (
                  <button className="btn-ghost w-full" onClick={() => setSheetMode("withdraw")}>
                    Rút gốc
                  </button>
                )}
              </>
            )}
            {urgent && !isNewWallet && !isDemo && <FreezeEpochButton />}
          </div>
        </div>
      </div>

      {/* Cột phải — Nhà 3D */}
      <div className="space-y-3 lg:col-span-7">
        <div className={`relative overflow-hidden rounded-2xl border border-border p-3 shadow-card ${night ? "bg-[#1A2049]" : "bg-gradient-to-b from-[#B8E3F5] to-[#E8F6FC]"}`}>
          <div data-testid="floor-badge" className="absolute left-3 top-3 z-10 rounded-xl border border-border bg-surface/95 px-3 py-1.5 shadow-card backdrop-blur-sm">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Nhà của bạn</div>
            <div className="font-cozy text-lg font-extrabold tabular-nums text-ink">
              {floors === 0 ? "Chưa có tầng tích lũy" : `${floors} tầng`}
            </div>
          </div>

          <div
            ref={sceneRef}
            className="relative h-[300px] w-full md:h-[440px]"
          >
            <Building
              key={celebrateKey}
              floors={floors}
              night={night}
              building={building}
              celebrating={celebrateKey > 0}
              goalDone={goalDone}
              width={sceneSize.w}
              height={sceneSize.h}
              scale={scale}
            />
            {showParty && !building && (
              <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center">
                <div className="rounded-2xl border border-border bg-surface px-5 py-2.5 text-center font-cozy text-lg font-extrabold text-ink shadow-card" style={{ animation: "bannerPop 0.5s var(--ease-spring) both" }}>
                  TẦNG MỚI HOÀN THÀNH!
                </div>
                <div className="mt-3 rounded-full border border-cta/30 bg-cta/10 px-3 py-1 font-cozy text-xs font-extrabold text-cta" style={{ animation: "bannerPop 0.5s 0.2s var(--ease-spring) both" }}>
                  +1 chuỗi kiên trì · +1 tầng mới
                </div>
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-xl border border-border bg-surface/95 p-1 shadow-card backdrop-blur-sm">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-sunken text-lg font-extrabold text-ink transition hover:bg-border disabled:opacity-40"
              disabled={scale >= 2.2}
              onClick={() => setZoom(Math.min(2.2, scale + 0.15))}
              aria-label="Phóng to"
            >+</button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-sunken text-lg font-extrabold text-ink transition hover:bg-border disabled:opacity-40"
              disabled={scale <= 0.4}
              onClick={() => setZoom(Math.max(0.4, scale - 0.15))}
              aria-label="Thu nhỏ"
            >−</button>
            <button
              className="h-9 px-2.5 text-xs font-extrabold text-ink transition hover:bg-surface-sunken"
              onClick={() => setZoom(null)}
              aria-label="Vừa khung"
            >Vừa khung</button>
          </div>
        </div>
      </div>

      {/* Dải số liệu phụ + lịch sử */}
      <div className="space-y-4 lg:col-span-12">
        <div className="card flex flex-col divide-y divide-border md:flex-row md:divide-x md:divide-y-0">
          <StatItem icon={<Icon name="chart" size={18} />} label="Lãi chờ nhận" value={`+${fmt(claimable)}`} sub="mUSDC" />
          <StatItem icon={<Icon name="wallet" size={18} />} label="Số dư ví" value={fmt(tokenBalance, 2)} sub="mUSDC" />
          <StatItem icon={<Icon name="flame" size={18} />} label="Chuỗi hiện tại" value={account?.streak.toString() ?? "—"} sub="tuần liên tiếp" />
          <StatItem icon={<Icon name="bank" size={18} />} label="Lãi tích lũy" value={`+${fmt(interestTotal)}`} sub="mUSDC" />
        </div>
        <StreakHeatmap data={data} />
      </div>

      <DepositSheet
        data={data}
        mode={sheetMode}
        onClose={() => setSheetMode(null)}
        onDeposited={onDepositStart}
      />
    </div>
  );
}

function StatItem({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string | undefined; sub: string }) {
  return (
    <div className="flex flex-1 items-center gap-3 px-5 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-sunken text-ink-soft">{icon}</span>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-cozy text-xl font-extrabold tabular-nums text-ink">{value ?? "—"}</span>
          <span className="text-xs font-semibold text-ink-muted">{sub}</span>
        </div>
      </div>
    </div>
  );
}

function parseCountdownSeconds(cd: string): number | undefined {
  if (!cd || cd === "—" || cd === "Hết hạn") return undefined;
  const parts = cd.split(/[: ]+/).filter(Boolean);
  let total = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.endsWith("ngày")) {
      total += parseInt(p, 10) * 86400;
    } else {
      const n = parseInt(p, 10);
      if (!Number.isNaN(n)) {
        if (parts.length - i === 3) total += n * 3600;
        else if (parts.length - i === 2) total += n * 60;
        else total += n;
      }
    }
  }
  return total;
}

function FaucetCard() {
  const tx = useTx();
  async function drip() {
    const { faucetDripAbi } = await import("@/lib/abis");
    await tx.run("Vòi nước ngườ mới", [
      { label: "Đang nhận 5 mUSDC + đặt mục tiêu đầu…", call: { address: contracts.faucetDrip, abi: faucetDripAbi, functionName: "drip", args: [] } },
    ]);
  }

  return (
    <div className="rounded-2xl border border-dashed border-cta/50 bg-cta/5 p-4">
      <div className="flex items-center gap-2 font-cozy text-lg font-extrabold text-ink">
        <Icon name="droplet" size={22} className="text-cta" /> Chào mừng chủ nhân mới!
      </div>
      <p className="mt-1 text-sm font-semibold text-ink-soft">
        Nhận <strong>5 mUSDC</strong> gửi thẳng vào tòa nhà + mục tiêu kỳ đầu được đặt sẵn — bấm một nút là xong.
      </p>
      <button className="btn-primary mt-3 w-full" disabled={tx.step !== null} onClick={drip}>
        Nhận 5 mUSDC miễn phí & bắt đầu
      </button>
      <TxFeedback state={tx} />
    </div>
  );
}

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
      <button className="btn-secondary w-full !py-2 text-sm" disabled={tx.step !== null} onClick={freeze}>
        <Icon name="snow" size={15} className="inline -mt-0.5" /> Đóng băng kỳ này ({fmt(fee)} mUSDC) — giữ chuỗi an toàn
      </button>
      <TxFeedback state={tx} />
    </div>
  );
}
