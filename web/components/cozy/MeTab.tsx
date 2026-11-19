"use client";

import { useState } from "react";
import { useDisconnect } from "wagmi";
import { contracts } from "@/lib/config";
import { fmt, shortAddr } from "@/lib/format";
import { IdentityAvatar, identityOf, useIdentityIndex, pickIdentity, IDENTITIES } from "@/lib/identity";
import type { ThemeMode } from "@/components/cozy/useThemeLanding";
import type { VaultData } from "@/lib/useVaultData";
import { RecentTxPanel } from "@/components/cozy/RecentTxPanel";
import { Icon } from "@/components/cozy/icons";

interface Props {
  data: VaultData;
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
}

/** Tab Hồ sơ: danh tính, giao dịch gần đây (Snowtrace), giao diện, địa chỉ contract. */
export function MeTab({ data, theme, onThemeChange }: Props) {
  const { disconnect } = useDisconnect();
  const { address, tokenBalance, claimed, account } = data;
  const currentIdx = useIdentityIndex(address);
  const currentIdentity = IDENTITIES[currentIdx] ?? IDENTITIES[0];

  function select(i: number) {
    pickIdentity(address, i);
  }

  return (
    <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      <div className="space-y-3">
        {/* hồ sơ */}
        <div className="card-cream p-4 text-center">
          <div className="mx-auto w-fit">
            <IdentityAvatar address={address} className="h-24 w-24" />
          </div>
          <h3 className="mt-2 font-cozy text-xl font-extrabold">{shortAddr(address)}</h3>
          <p className="font-cozy text-sm font-bold text-lavender-500">
            {currentIdentity.icon} {currentIdentity.name}
          </p>
          <p className="text-xs font-semibold text-cocoa-500">{currentIdentity.vi}</p>
          <p className="mt-1 text-xs font-semibold text-cocoa-500">
            🔥 Streak dài nhất hiện tại: {account?.streak.toString() ?? 0} tuần · 🌱 Đã nhận {fmt(claimed)} mUSDC lãi
          </p>
          <button className="btn-cream mt-3 active:translate-y-[1px] active:border-b-2" onClick={() => disconnect()}>
            <Icon name="x" size={15} className="inline -mt-0.5" /> Ngắt kết nối ví
          </button>
        </div>

        {/* chọn identity */}
        <div className="card-cream p-4">
          <h4 className="flex items-center gap-1.5 font-cozy font-bold">
            <Icon name="cat" size={18} className="text-cocoa-600" /> Chọn nhân vật của bạn
          </h4>
          <p className="text-xs font-semibold text-cocoa-500">
            Chạm vào nhân vật để chọn làm avatar — lựa chọn lưu trên trình duyệt của bạn.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {IDENTITIES.map((id, i) => {
              const mine = i === currentIdx;
              return (
                <button
                  key={id.key}
                  className={`rounded-xl border-[1.5px] p-1.5 text-center transition active:scale-95 focus-visible:ring-2 focus-visible:ring-leaf-400 focus-visible:ring-offset-1 ${
                    mine ? "border-leaf-500 bg-leaf-300/20" : "border-cream-300 bg-white/70 hover:border-lavender-400"
                  }`}
                  onClick={() => select(i)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/identities/${id.key}.svg`}
                    alt={id.name}
                    className="mx-auto h-20 w-auto object-contain"
                    draggable={false}
                  />
                  <div className="mt-0.5 truncate text-[10px] font-bold text-cocoa-600">
                    {id.icon} {id.name.replace("The ", "")}
                  </div>
                  <div className="truncate text-[9px] font-semibold text-cocoa-500">{id.vi}</div>
                  {mine && <div className="text-[9px] font-extrabold text-leaf-600">✓ Đang dùng</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* giao dịch gần đây */}
        <RecentTxPanel />

        {/* giao diện day/night */}
        <div className="card-cream p-4">
          <h4 className="flex items-center gap-1.5 font-cozy font-bold">
            <Icon name="sun" size={18} className="text-cocoa-600" /> Giao diện
          </h4>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              className={`rounded-xl border-[1.5px] py-3 font-cozy font-bold transition active:translate-y-[1px] ${
                theme === "day" ? "border-leaf-500 bg-leaf-300/25 text-cocoa-700" : "border-cream-300 bg-white text-cocoa-500"
              }`}
              onClick={() => onThemeChange("day")}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="sun" size={16} /> Ban ngày
              </span>
            </button>
            <button
              className={`rounded-xl border-[1.5px] py-3 font-cozy font-bold transition active:translate-y-[1px] ${
                theme === "night" ? "border-leaf-500 bg-leaf-300/25 text-cocoa-700" : "border-cream-300 bg-white text-cocoa-500"
              }`}
              onClick={() => onThemeChange("night")}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="moon" size={16} /> Ban đêm
              </span>
            </button>
          </div>
          <p className="mt-2 text-xs font-semibold text-cocoa-500">
            Mặc định theo giờ máy bạn. Cửa sổ tòa nhà sẽ sáng đèn ấm vào ban đêm!
          </p>
        </div>

        {/* thông tin on-chain */}
        <div className="card-cream p-4">
          <h4 className="flex items-center gap-1.5 font-cozy font-bold">
            <Icon name="bank" size={18} className="text-cocoa-600" /> Trên chuỗi (Fuji Testnet)
          </h4>
          <dl className="mt-2 space-y-1.5 text-xs font-semibold text-cocoa-500">
            <div className="flex justify-between gap-2">
              <dt>Số dư mUSDC</dt>
              <dd className="font-cozy text-sm font-extrabold text-cocoa-700 tabular-nums">{fmt(tokenBalance, 2)}</dd>
            </div>
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
          <p className="mt-3 text-[11px] font-semibold text-cocoa-500">
            Mọi giao dịch trong app đều kèm link Snowtrace để đối chiếu khi demo — không server nào giữ tiền ngườ dùng.
          </p>
        </div>
      </div>
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
        <a className="underline" href={url} target="_blank" rel="noopener noreferrer">
          {shortAddr(addr)}
        </a>
        <button
          className="rounded-md border border-cocoa-700/15 bg-white/70 px-1.5 py-0.5 text-[10px] font-extrabold text-cocoa-600 transition hover:bg-white active:translate-y-[1px]"
          onClick={() => {
            navigator.clipboard.writeText(addr);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          title="Sao chép địa chỉ"
          aria-label={`Sao chép địa chỉ ${label}`}
        >
          {copied ? "✓" : "Copy"}
        </button>
      </dd>
    </div>
  );
}
