"use client";

import { useEffect, useState } from "react";
import { Building } from "@/components/cozy/Building";
import { DepositSheet } from "@/components/cozy/DepositSheet";
import { fmt } from "@/lib/format";
import { fmtGems } from "@/lib/useGemsData";
import type { VaultData } from "@/lib/useVaultData";

interface Props {
  data: VaultData;
  night: boolean;
  building: boolean;
  celebrateKey: number;
  gemsBalance: bigint;
  onDepositStart: () => void;
}

function Tile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-cream-300 bg-cream-100/95 p-2.5 shadow-chunkySm">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-cocoa-500">
        <span>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-0.5 font-cozy text-lg font-extrabold leading-tight ${tone ?? "text-cocoa-700"}`}>{value}</div>
      {sub && <div className="text-[10px] font-semibold text-cocoa-500">{sub}</div>}
    </div>
  );
}

/** APY ước tính từ thiết kế: lãi cơ bản 4.8% + thưởng chuỗi 0.5%/tuần (tối đa +2.5%). */
export function estimateApy(streak: bigint): number {
  return 4.8 + Math.min(Number(streak) * 0.5, 2.5);
}

/** Tab Home: báo cáo tóm tắt gọn nhẹ — chi tiết số liệu nằm ở tab Mục tiêu. */
export function HomeTab({ data, night, building, celebrateKey, gemsBalance, onDepositStart }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showParty, setShowParty] = useState(false);
  const { account, claimable, claimed, countdown, hasStarted } = data;

  // Màn ăn mừng sau khi xây xong tầng (~3s)
  useEffect(() => {
    if (celebrateKey === 0) return;
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
  const floors = Number(account.streak);
  const interestTotal = (claimed ?? 0n) + (claimable ?? 0n);
  const apy = estimateApy(account.streak);
  const remaining = target > progress ? target - progress : 0n;

  return (
    <div className="px-4 pb-28 pt-2">
      {/* 4 chỉ số tóm tắt */}
      <div className="grid grid-cols-2 gap-2">
        <Tile icon="🏦" label="Tiết kiệm" value={`${fmt(account.principal)}`} sub="mUSDC" />
        <Tile icon="📈" label="Lãi tích lũy" value={`+${fmt(interestTotal)}`} sub={`~${apy.toFixed(1)}% APY (ước tính)`} tone="text-leaf-600" />
        <Tile icon="🔥" label="Chuỗi kiên trì" value={`${account.streak} tuần`} sub={goalDone ? "Đạt phong độ cao!" : "Cố lên nào!"} tone="text-blush-500" />
        <Tile icon="🐾" label="Điểm Paws" value={fmtGems(gemsBalance)} sub="Đổi nội thất nhà" tone="text-lavender-500" />
      </div>

      {/* tiến độ tuần này */}
      <div className="card-cream mt-2 p-3">
        <div className="flex items-center justify-between text-xs font-bold text-cocoa-500">
          <span className="flex items-center gap-1">🎯 Mục tiêu tuần này</span>
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
          <span className="text-lg">{goalDone ? "✅" : "⏳"}</span>
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

      {/* tòa nhà + màn ăn mừng hoàn thành tầng */}
      <div className="relative mt-4">
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

      {/* countdown + CTA */}
      <div className="mx-auto mt-3 max-w-xs text-center">
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-cocoa-700/40 bg-white/80 px-4 py-1.5 font-cozy text-sm font-bold text-cocoa-700">
          ⏰ Còn {countdown} để giữ chuỗi
        </div>
        <button className="btn-cozy mt-3 w-full text-lg" onClick={() => setSheetOpen(true)}>
          {goalDone ? "💰 Gửi thêm" : `🏗️ Gửi ${fmt(remaining)} mUSDC hoàn thành tầng`}
        </button>
      </div>

      {/* băng tin thị trường */}
      <div className="mx-auto mt-3 flex max-w-xs items-center gap-2 rounded-xl border-2 border-cocoa-700/30 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-cocoa-600">
        <span>📊</span>
        <span className="truncate">Lãi suất USDC Lending (mock): 6.2% APY · Aave v3 tham chiếu</span>
      </div>

      <DepositSheet data={data} open={sheetOpen} onClose={() => setSheetOpen(false)} onDeposited={onDepositStart} />
    </div>
  );
}
