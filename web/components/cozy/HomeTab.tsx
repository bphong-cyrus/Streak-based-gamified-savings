"use client";

import { useState } from "react";
import { Building, mascotOf } from "@/components/cozy/Building";
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

function Pill({ icon, label, value, tone }: { icon: string; label: string; value: string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border-2 border-cocoa-700/40 bg-white/80 px-2 py-1.5">
      <span className="text-base">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide text-cocoa-500">{label}</div>
        <div className={`truncate font-cozy text-sm font-extrabold ${tone ?? "text-cocoa-700"}`}>{value}</div>
      </div>
    </div>
  );
}

/** Tab Home: thông tin chính + tòa nhà. */
export function HomeTab({ data, night, building, celebrateKey, gemsBalance, onDepositStart }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { account, claimable, claimed, countdown, hasStarted } = data;

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
  const mascot = mascotOf(data.address);
  const interestTotal = (claimed ?? 0n) + (claimable ?? 0n);

  return (
    <div className="px-4 pb-28 pt-2">
      {/* stats bar */}
      <div className="grid grid-cols-4 gap-2">
        <Pill icon="🏦" label="Tiết kiệm" value={fmt(account.principal)} />
        <Pill icon="🌱" label="Lãi" value={`+${fmt(interestTotal)}`} tone="text-leaf-600" />
        <Pill icon="🔥" label="Streak" value={`${account.streak}t`} tone="text-blush-500" />
        <Pill icon="💎" label="Gems" value={fmtGems(gemsBalance)} tone="text-lavender-500" />
      </div>

      {/* weekly goal */}
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
        {account.pendingTarget > 0n && (
          <p className="mt-1 text-[11px] font-semibold text-cocoa-500">
            📌 Từ kỳ #{account.pendingTargetEpoch.toString()}: mục tiêu {fmt(account.pendingTarget)} mUSDC/tuần
          </p>
        )}
      </div>

      {/* tòa nhà */}
      <div className="mt-4">
        <Building
          key={celebrateKey}
          floors={floors}
          night={night}
          building={building}
          celebrating={celebrateKey > 0}
          mascot={mascot}
          goalDone={goalDone}
        />
      </div>

      {/* countdown + CTA */}
      <div className="mx-auto mt-3 max-w-xs text-center">
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-cocoa-700/40 bg-white/80 px-4 py-1.5 font-cozy text-sm font-bold text-cocoa-700">
          ⏰ Còn {countdown} để giữ streak
        </div>
        <button className="btn-cozy mt-3 w-full text-lg" onClick={() => setSheetOpen(true)}>
          {goalDone ? "💰 Gửi thêm" : "🏗️ Gửi tuần này"}
        </button>
        {!account.activated && (
          <p className="mt-2 text-xs font-semibold text-cocoa-500">Đặt mục tiêu ở tab Goals để bắt đầu xây nhà nhé!</p>
        )}
      </div>

      <DepositSheet data={data} open={sheetOpen} onClose={() => setSheetOpen(false)} onDeposited={onDepositStart} />
    </div>
  );
}
