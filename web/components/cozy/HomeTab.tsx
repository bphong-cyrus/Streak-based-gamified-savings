"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Building } from "@/components/cozy/Building";
import { DepositSheet } from "@/components/cozy/DepositSheet";
import { fmt } from "@/lib/format";
import { fmtGems } from "@/lib/useGemsData";
import { contracts, isConfigured } from "@/lib/config";
import { streakVaultAbi } from "@/lib/abis";
import { useTokenAllowance, withTokenApprove } from "@/components/cozy/panel";
import { faucetDripAbi } from "@/lib/abis";
import { useReadContracts } from "wagmi";
import { TxFeedback, useTx } from "@/components/useTx";
import { Icon } from "@/components/cozy/icons";
import { sfx } from "@/lib/sound";
import type { VaultData } from "@/lib/useVaultData";

/** Nút nhận mUSDC miễn phí cho ví mới — gọi FaucetDrip (tự đặt mục tiêu đầu luôn). */
function FaucetButton() {
  const tx = useTx();
  const [done, setDone] = useState(false);

  if (!isConfigured(contracts.faucetDrip) || done) return null;

  async function drip() {
    const ok = await tx.run("Vòi nước ngườ mới", [
      {
        label: "Đang nhận 5 mUSDC miễn phí…",
        call: { address: contracts.faucetDrip, abi: faucetDripAbi, functionName: "drip" },
      },
    ]);
    if (ok) setDone(true);
  }

  return (
    <div className="mt-2">
      <button className="btn-cream w-full" disabled={tx.step !== null} onClick={drip}>
        <Icon name="droplet" size={17} className="inline -mt-0.5" /> Nhận 5 mUSDC miễn phí (ví mới)
      </button>
      <TxFeedback state={{ step: tx.step, hash: tx.hash, error: tx.error }} />
    </div>
  );
}

interface Props {
  data: VaultData;
  night: boolean;
  building: boolean;
  celebrateKey: number;
  gemsBalance: bigint;
  onDepositStart: () => void;
  /** demo với dữ liệu mẫu — nút gửi tiền đổi thành mô phỏng kịch bản pitch */
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
    <div className="rounded-2xl border-2 border-cream-300 bg-cream-100/95 p-2.5 shadow-chunkySm">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-cocoa-500">
        <span className="text-cocoa-600">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-0.5 font-cozy text-lg font-extrabold leading-tight ${tone ?? "text-cocoa-700"}`}>{value}</div>
      {sub && <div className="text-[10px] font-semibold text-cocoa-500">{sub}</div>}
    </div>
  );
}

/** Tab Home: báo cáo tóm tắt gọn nhẹ — chi tiết số liệu nằm ở tab Mục tiêu. */
export function HomeTab({ data, night, building, celebrateKey, gemsBalance, onDepositStart, isDemo }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showParty, setShowParty] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null); // null = tự vừa khung
  const wrapRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState(0);
  const { account, claimable, claimed, countdown, hasStarted, currentBudget, rollover } = data;


  // Màn ăn mừng sau khi xây xong tầng (~3s)
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
        <div className="text-4xl">⏳</div>
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
  // Đo chiều cao tự nhiên của tòa nhà để tự co cho vừa màn hình
  useEffect(() => {
    const measure = () => setNatural(wrapRef.current?.offsetHeight ?? 0);
    measure();
    const t = setTimeout(measure, 300); // chờ animation xây tầng ổn định
    return () => clearTimeout(t);
  }, [floors, building, celebrateKey]);

  const vw = typeof window !== "undefined" ? window.innerWidth : 420;
  // Phóng to mặc định theo màn hình: ưu tiên fill chiều rộng (tối đa 660px), trần theo chiều cao
  const sectionW = Math.min(660, vw - 16);
  const available = typeof window !== "undefined" ? Math.min(window.innerHeight * 0.6, 620) : 480;
  const fit = natural > 0 ? Math.min(1.9, Math.max(0.35, available / natural)) : 1;
  const autoScale = natural > 0 ? Math.max(0.35, Math.min(1.9, sectionW / 380, (available / natural) * 1.25)) : 1;
  const scale = zoom ?? autoScale; // mặc định theo màn hình; ⛶ vừa khung; +/− chỉnh tay
  const interestTotal = (claimed ?? 0n) + (claimable ?? 0n);
  const remaining = target > progress ? target - progress : 0n;

  return (
    <div className="px-4 pb-28 pt-2">
      {/* 4 chỉ số tóm tắt */}
      <div className="grid grid-cols-2 gap-2">
        <Tile icon={<Icon name="bank" size={16} />} label="Tiết kiệm" value={`${fmt(account.principal)}`} sub="mUSDC" />
        <Tile icon={<Icon name="chart" size={16} />} label="Lãi tích lũy" value={`+${fmt(interestTotal)}`} sub={`Chờ nhận ${fmt(claimable)} mUSDC`} tone="text-leaf-600" />
        <Tile icon={<Icon name="flame" size={16} />} label="Chuỗi kiên trì" value={`${account.streak} tuần`} sub={goalDone ? "Đạt phong độ cao!" : "Cố lên nào!"} tone="text-blush-500" />
        <Tile icon={<Icon name="paw" size={16} />} label="Điểm Paws" value={fmtGems(gemsBalance)} sub="Đổi nội thất nhà" tone="text-lavender-500" />
      </div>

      {/* tiến độ tuần này */}
      <div className="card-cream mt-2 p-3">
        <div className="flex items-center justify-between text-xs font-bold text-cocoa-500">
          <span className="flex items-center gap-1"><Icon name="target" size={14} /> Mục tiêu tuần này</span>
          <span className="font-cozy text-sm text-cocoa-700">
            {fmt(progress)} / {fmt(target)} mUSDC
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-4 flex-1 overflow-hidden rounded-full border-2 border-cocoa-700/40 bg-white">
            <div
              className={`h-full rounded-full transition-all duration-500 ${goalDone ? "bg-leaf-400" : "bg-gradient-to-r from-blush-400 to-blush-300"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-lg">{goalDone ? <Icon name="check" size={20} className="text-leaf-600" /> : <Icon name="clock" size={20} className="text-cocoa-500" />}</span>
        </div>
        <p className="mt-1.5 text-xs font-semibold text-cocoa-500">
          {target === 0n
            ? "Đặt mục tiêu ở tab Mục tiêu để bắt đầu xây tầng mới."
            : goalDone
              ? `Tầng ${floors + 1} sẽ khởi công khi kỳ này kết thúc!`
              : `Còn ${fmt(remaining)} mUSDC để xây xong Tầng ${floors + 1} · ${pct}%`}
        </p>
        {account.pendingTarget > 0n && (
          <p className="mt-1 text-[11px] font-semibold text-cocoa-500">
            📌 Từ kỳ #{account.pendingTargetEpoch.toString()}: mục tiêu {fmt(account.pendingTarget)} mUSDC/tuần
          </p>
        )}
      </div>

      {/* tòa nhà (phóng to theo màn hình + tự co chiều cao, có nút zoom) + màn ăn mừng */}
      <div className="relative mt-4" style={{ height: natural * scale }}>
        {/* nút zoom bên phải tòa nhà */}
        <div className="absolute -right-1 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2">
          <button
            className="btn-cream !px-0 !py-0 font-cozy text-lg font-extrabold"
            style={{ width: 36, height: 36 }}
            disabled={scale >= 2.2}
            onClick={() => setZoom(Math.min(2.2, scale + 0.15))}
            title="Phóng to"
          >
            +
          </button>
          <button
            className="btn-cream !px-0 !py-0 font-cozy text-lg font-extrabold"
            style={{ width: 36, height: 36 }}
            disabled={scale <= 0.4}
            onClick={() => setZoom(Math.max(0.4, scale - 0.15))}
            title="Thu nhỏ"
          >
            −
          </button>
          <button
            className="btn-cream !px-0 !py-0 text-sm font-extrabold"
            style={{ width: 36, height: 36 }}
            onClick={() => setZoom(fit)}
            title="Vừa khung hình"
          >
            ⛶
          </button>
        </div>
        <div ref={wrapRef} className="mx-auto w-fit" style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
        <Building
          key={celebrateKey}
          floors={floors}
          night={night}
          building={building}
          celebrating={celebrateKey > 0}
          goalDone={goalDone}
        />
        {showParty && !building && (
          <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center">
            <div
              className="rounded-2xl border-[3px] border-cocoa-700/70 bg-cream-100 px-4 py-2 text-center font-cozy text-lg font-extrabold text-cocoa-700 shadow-chunky"
              style={{ animation: "bannerPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              🎉 TẦNG {floors + 1} HOÀN THÀNH!
            </div>
            <div className="big-jump mt-4 text-6xl" style={{ filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.3))" }}>
              🐈
            </div>
            <div
              className="mt-3 rounded-full border-2 border-leaf-500/50 bg-leaf-300/60 px-3 py-1 font-cozy text-xs font-extrabold text-leaf-600"
              style={{ animation: "bannerPop 0.5s 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              +1 🔥 Chuỗi kiên trì · +1 🏗️ Tầng mới
            </div>
          </div>
        )}
        </div>
      </div>

      {/* countdown + CTA */}
      <div className="mx-auto mt-3 max-w-xs text-center">
        <div
          className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 font-cozy text-sm font-bold ${
            countdown?.startsWith("00:")
              ? "animate-pulse border-blush-500 bg-blush-400 text-white shadow-chunkySm"
              : "border-cocoa-700/40 bg-white/80 text-cocoa-700"
          }`}
        >
          <Icon name="clock" size={15} /> Còn {countdown} để giữ chuỗi
        </div>
        <button
          className="btn-cozy mt-3 w-full text-lg"
          onClick={() => (isDemo ? onDepositStart() : setSheetOpen(true))}
        >
          {isDemo
            ? "Mô phỏng gửi tiền — xem tòa nhà lớn lên"
            : goalDone
              ? "Gửi thêm"
              : `Gửi ${fmt(remaining)} mUSDC hoàn thành tầng`}
        </button>
        {!account.activated && (
          <>
            <FaucetButton />
            <p className="mt-2 text-xs font-semibold text-cocoa-500">Đặt mục tiêu ở tab Goals để bắt đầu xây nhà nhé!</p>
          </>
        )}
      </div>

      {/* tự bảo vệ streak: đóng băng kỳ khi chưa kịp gửi đủ */}
      {!isDemo && !goalDone && target > 0n && <FreezeEpochButton />}

      {/* chỉ số thật từ on-chain thay băng tin mock */}
      <div className="mx-auto mt-3 flex max-w-xs items-center gap-2 rounded-xl border-2 border-cocoa-700/30 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-cocoa-600">
        <Icon name="chart" size={15} className="shrink-0" />
        <span className="truncate">
          Ngân sách kỳ này: {fmt(currentBudget)} mUSDC · Chờ chia: {fmt(rollover ?? 0n)}
        </span>
      </div>

      <DepositSheet data={data} open={sheetOpen} onClose={() => setSheetOpen(false)} onDeposited={onDepositStart} />
    </div>
  );
}

/** Nút tự trả phí đóng băng kỳ hiện tại — giữ streak khi chưa kịp gửi đủ. */
function FreezeEpochButton() {
  const tx = useTx();
  const allowance = useTokenAllowance(contracts.vault);
  const feeState = useReadContracts({
    contracts: isConfigured(contracts.vault)
      ? [{ address: contracts.vault, abi: streakVaultAbi, functionName: "freezeFee", args: [] }]
      : [],
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
    <div className="mx-auto mt-2 max-w-xs">
      <button className="btn-cream w-full !py-2 text-sm" disabled={tx.step !== null} onClick={freeze}>
        <Icon name="snow" size={16} className="inline -mt-0.5" /> Đóng băng kỳ này ({fmt(fee)} mUSDC) — giữ chuỗi an toàn
      </button>
      <TxFeedback state={tx} />
    </div>
  );
}
