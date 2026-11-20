"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useDisconnect } from "wagmi";
import { contracts } from "@/lib/config";
import { fmt, shortAddr } from "@/lib/format";
import { IdentityAvatar, useIdentityIndex, pickIdentity, IDENTITIES } from "@/lib/identity";
import { isDemoMode } from "@/lib/demo";
import { resetOnboarding } from "@/components/cozy/Onboarding";
import type { ThemeMode } from "@/components/cozy/useThemeLanding";
import type { VaultData } from "@/lib/useVaultData";
import { RecentTxPanel } from "@/components/cozy/RecentTxPanel";
import { Icon } from "@/components/cozy/icons";
import { isMuted, setMuted, sfx } from "@/lib/sound";
import { Guard } from "@/components/cozy/Guard";

// WebGL chỉ chạy client — tắt SSR để tránh lỗi hydrate/render máy chủ.
const IdentityPreview3D = dynamic(() => import("@/components/cozy/IdentityPreview3D").then((m) => m.IdentityPreview3D), {
  ssr: false,
  loading: () => (
    <div className="flex h-44 w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-cta" />
    </div>
  ),
});
const PetThumb3D = dynamic(() => import("@/components/cozy/PetThumb3D").then((m) => m.PetThumb3D), {
  ssr: false,
  loading: () => <div className="mx-auto h-20 w-full animate-pulse rounded-xl bg-surface-sunken" />,
});

interface Props {
  data: VaultData;
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
}

export function MeTab({ data, theme, onThemeChange }: Props) {
  const { disconnect } = useDisconnect();
  const { address, tokenBalance, claimed, account } = data;
  const currentIdx = useIdentityIndex(address);
  const currentIdentity = IDENTITIES[currentIdx] ?? IDENTITIES[0];
  const isDemo = isDemoMode();
  const [muted, setMutedState] = useState(isMuted());

  function select(i: number) {
    pickIdentity(address, i);
  }

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      <div className="space-y-4">
        {/* Hồ sơ gọn */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-cocoa-700/50 bg-cream-50 shadow-chunkySm">
              <PetThumb3D variant={currentIdentity.key} />
            </div>
            <div className="flex-1">
              <h3 className="font-cozy text-xl font-extrabold text-ink">{currentIdentity.name}</h3>
              <p className="text-sm font-semibold text-ink-soft">{currentIdentity.vi}</p>
              {!isDemo && address && (
                <p className="mt-0.5 font-mono text-xs font-semibold text-ink-muted">{shortAddr(address)}</p>
              )}
            </div>
            {!isDemo && address && (
              <button className="btn-secondary !h-9 !px-3 !py-1.5 text-xs" onClick={() => disconnect()}>
                Ngắt
              </button>
            )}
          </div>
          <div className="mt-4 flex items-center gap-4 border-t border-border pt-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Chuỗi hiện tại</div>
              <div className="font-cozy text-lg font-extrabold tabular-nums text-ink">{account?.streak.toString() ?? 0} kỳ</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Đã nhận lãi</div>
              <div className="font-cozy text-lg font-extrabold tabular-nums text-cta">+{fmt(claimed)} mUSDC</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Số dư ví</div>
              <div className="font-cozy text-lg font-extrabold tabular-nums text-ink">{fmt(tokenBalance, 2)} mUSDC</div>
            </div>
          </div>
        </div>

        {/* Xem trước nhân vật 3D */}
        <div className="card overflow-hidden p-4">
          <h4 className="flex items-center gap-1.5 font-cozy font-bold text-ink">
            <Icon name="cat" size={18} className="text-ink-soft" /> Nhân vật 3D của bạn
          </h4>
          <div className="mt-2 h-44 w-full">
            <Guard
              fallback={
                <img
                  src={`/identities/${currentIdentity.key}.svg`}
                  alt={currentIdentity.name}
                  className="mx-auto h-40 object-contain"
                  draggable={false}
                />
              }
            >
              <IdentityPreview3D variant={currentIdentity.key} />
            </Guard>
          </div>
          <p className="text-center text-xs font-semibold text-ink-soft">
            {currentIdentity.name} · {currentIdentity.vi} — xoay chậm để ngắm từ mọi góc.
          </p>
        </div>

        {/* Chọn nhân vật */}
        <div className="card p-4">
          <h4 className="flex items-center gap-1.5 font-cozy font-bold text-ink">
            <Icon name="cat" size={18} className="text-ink-soft" /> Chọn nhân vật
          </h4>
          <p className="text-xs font-semibold text-ink-soft">Chạm vào nhân vật để chọn làm avatar — lưu trên trình duyệt của bạn.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {IDENTITIES.map((id, i) => {
              const mine = i === currentIdx;
              return (
                <button
                  key={id.key}
                  className={`rounded-xl border p-2 text-center transition active:scale-95 ${
                    mine ? "border-cta bg-cta/5" : "border-border bg-surface hover:border-cta/50"
                  }`}
                  onClick={() => select(i)}
                >
                  <div className="mx-auto h-20 w-full">
                    <PetThumb3D variant={id.key} />
                  </div>
                  <div className="mt-1 truncate text-[10px] font-bold text-ink">{id.name}</div>
                  <div className="truncate text-[9px] font-semibold text-ink-soft">{id.vi}</div>
                  {mine && <div className="mt-0.5 text-[9px] font-extrabold text-cta">Đang dùng</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <RecentTxPanel />
        <OnChainInfoCard />

        <div className="card p-4">
          <h4 className="flex items-center gap-1.5 font-cozy font-bold text-ink">
            <Icon name="book" size={18} className="text-ink-soft" /> Hướng dẫn
          </h4>
          <p className="mt-1 text-xs font-semibold text-ink-soft">Bạn có thể xem lại bài hướng dẫn 3 bước bất cứ lúc nào.</p>
          <button
            className="btn-secondary mt-3 w-full"
            onClick={() => {
              resetOnboarding();
              window.location.reload();
            }}
          >
            Xem lại hướng dẫn
          </button>
        </div>

        {/* Giao diện */}
        <div className="card p-4">
          <h4 className="flex items-center gap-1.5 font-cozy font-bold text-ink">
            <Icon name="sun" size={18} className="text-ink-soft" /> Giao diện
          </h4>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              className={`rounded-xl border py-3 font-cozy font-bold transition active:translate-y-[1px] ${
                theme === "day" ? "border-cta bg-cta/5 text-ink" : "border-border bg-surface text-ink-soft"
              }`}
              onClick={() => onThemeChange("day")}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="sun" size={16} /> Ban ngày
              </span>
            </button>
            <button
              className={`rounded-xl border py-3 font-cozy font-bold transition active:translate-y-[1px] ${
                theme === "night" ? "border-cta bg-cta/5 text-ink" : "border-border bg-surface text-ink-soft"
              }`}
              onClick={() => onThemeChange("night")}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="moon" size={16} /> Ban đêm
              </span>
            </button>
          </div>
          <p className="mt-3 text-xs font-semibold text-ink-soft">Mặc định theo giờ máy bạn. Cửa sổ tòa nhà sẽ sáng đèn ấm vào ban đêm.</p>
        </div>

        {/* Âm thanh */}
        <div className="card p-4">
          <h4 className="flex items-center gap-1.5 font-cozy font-bold text-ink">
            <Icon name="volume" size={18} className="text-ink-soft" /> Âm thanh
          </h4>
          <button
            className={`mt-3 w-full rounded-xl border py-3 font-cozy font-bold transition active:translate-y-[1px] ${
              muted ? "border-border bg-surface text-ink-soft" : "border-cta bg-cta/5 text-ink"
            }`}
            onClick={() => {
              const m = !muted;
              setMuted(m);
              setMutedState(m);
              if (!m) sfx.click();
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Icon name="volume" size={16} className={muted ? "opacity-40" : undefined} />
              {muted ? "Đang tắt âm thanh" : "Đang bật âm thanh"}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}

/** Địa chỉ contract trên Fuji — bằng chứng nhanh cho giám khảo. */
function OnChainInfoCard() {
  return (
  <div className="card p-4">
    <h4 className="flex items-center gap-1.5 font-cozy font-bold text-ink">
      <Icon name="bank" size={18} className="text-ink-soft" /> Thông tin trên chuỗi (Fuji Testnet)
    </h4>
    <dl className="mt-3 space-y-2 text-xs font-semibold text-ink-soft">
      {(
        [
          ["Vault (gốc & streak)", contracts.vault],
          ["Distributor (thưởng)", contracts.distributor],
          ["DailyCheckIn (điểm danh)", contracts.dailyCheckIn],
          ["SavingsGoal (mục tiêu)", contracts.goal],
          ["StreakNFT (huy hiệu)", contracts.nft],
          ["FaucetDrip (vòi mới)", contracts.faucetDrip],
          ["Token mUSDC", contracts.token],
        ] as const
      ).map(([label, addr]) => (
        <ContractRow key={label} label={label} addr={addr} />
      ))}
    </dl>
    <p className="mt-3 text-[11px] font-semibold text-ink-soft">
      Mọi giao dịch trong app đều kèm link Snowtrace để đối chiếu — không server nào giữ tiền ngườ dùng.
    </p>
  </div>
  );
}

function ContractRow({ label, addr }: { label: string; addr: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://testnet.snowtrace.io/address/${addr}`;
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="truncate">{label}</dt>
      <dd className="flex items-center gap-1.5">
        <a className="font-mono text-ink underline" href={url} target="_blank" rel="noopener noreferrer">
          {shortAddr(addr)}
        </a>
        <button
          className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-extrabold text-ink-soft transition hover:bg-surface-sunken active:translate-y-[1px]"
          onClick={() => {
            navigator.clipboard.writeText(addr);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          title="Sao chép địa chỉ"
          aria-label={`Sao chép địa chỉ ${label}`}
        >
          {copied ? "Đã copy" : "Copy"}
        </button>
      </dd>
    </div>
  );
}
