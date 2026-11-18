"use client";

import { useDisconnect } from "wagmi";
import { contracts } from "@/lib/config";
import { fmt, shortAddr } from "@/lib/format";
import { IdentityAvatar, identityOf, useIdentityIndex, pickIdentity, IDENTITIES } from "@/lib/identity";
import type { ThemeMode } from "@/components/cozy/useThemeLanding";
import type { VaultData } from "@/lib/useVaultData";

interface Props {
  data: VaultData;
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
}

/** Tab Me: hồ sơ, chọn nhân vật, cài đặt giao diện, thông tin ví & hợp đồng. */
export function MeTab({ data, theme, onThemeChange }: Props) {
  const { disconnect } = useDisconnect();
  const { address, tokenBalance, claimed, account } = data;
  const current = useIdentityIndex(address);

  function select(i: number) {
    pickIdentity(address, i);
  }

  return (
    <div className="space-y-3 px-4 pb-28 pt-2">
      {/* hồ sơ */}
      <div className="card-cream p-4 text-center">
        <div className="mx-auto w-fit">
          <IdentityAvatar address={address} className="h-24 w-24" />
        </div>
        <h3 className="mt-2 font-cozy text-xl font-extrabold">{shortAddr(address)}</h3>
        <p className="font-cozy text-sm font-bold text-lavender-500">
          {identityOf(address).icon} {identityOf(address).name}
        </p>
        <p className="text-xs font-semibold text-cocoa-500">{identityOf(address).vi}</p>
        <p className="mt-1 text-xs font-semibold text-cocoa-500">
          🔥 Streak dài nhất hiện tại: {account?.streak.toString() ?? 0} tuần · 🌱 Đã nhận {fmt(claimed)} mUSDC lãi
        </p>
        <button className="btn-cream mt-3" onClick={() => disconnect()}>
          🔌 Ngắt kết nối ví
        </button>
      </div>

      {/* chọn identity */}
      <div className="card-cream p-4">
        <h4 className="font-cozy font-bold">🧸 Chọn nhân vật của bạn</h4>
        <p className="text-xs font-semibold text-cocoa-500">
          Chạm vào nhân vật để chọn làm avatar — lựa chọn lưu trên trình duyệt của bạn.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {IDENTITIES.map((id, i) => {
            const mine = i === current;
            return (
              <button
                key={id.key}
                className={`rounded-xl border-2 p-1.5 text-center transition active:translate-y-0.5 ${mine ? "border-leaf-500 bg-leaf-300/30 shadow-chunkySm" : "border-cream-300 bg-white/70 hover:border-lavender-400"}`}
                onClick={() => select(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/identities/${i + 1}.png`}
                  alt={id.name}
                  className="mx-auto h-14 w-14 rounded-full border border-cocoa-700/30 object-cover"
                  style={{ objectPosition: "50% 12%" }}
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

      {/* giao diện day/night */}
      <div className="card-cream p-4">
        <h4 className="font-cozy font-bold">🎨 Giao diện</h4>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            className={`rounded-xl border-[3px] py-3 font-cozy font-bold transition ${
              theme === "day" ? "border-cocoa-700/80 bg-leaf-400 text-white shadow-chunkySm" : "border-cream-300 bg-white text-cocoa-500"
            }`}
            onClick={() => onThemeChange("day")}
          >
            ☀️ Ban ngày
          </button>
          <button
            className={`rounded-xl border-[3px] py-3 font-cozy font-bold transition ${
              theme === "night" ? "border-cocoa-700/80 bg-lavender-500 text-white shadow-chunkySm" : "border-cream-300 bg-white text-cocoa-500"
            }`}
            onClick={() => onThemeChange("night")}
          >
            🌙 Ban đêm
          </button>
        </div>
        <p className="mt-2 text-xs font-semibold text-cocoa-500">
          Mặc định theo giờ máy bạn. Cửa sổ tòa nhà sẽ sáng đèn ấm vào ban đêm!
        </p>
      </div>

      {/* thông tin on-chain */}
      <div className="card-cream p-4">
        <h4 className="font-cozy font-bold">⛓️ Trên chuỗi (Fuji Testnet)</h4>
        <dl className="mt-2 space-y-1.5 text-xs font-semibold text-cocoa-500">
          <div className="flex justify-between gap-2">
            <dt>Số dư mUSDC</dt>
            <dd className="font-cozy text-sm font-extrabold text-cocoa-700">{fmt(tokenBalance, 2)}</dd>
          </div>
          {(
            [
              ["Vault (gốc & streak)", contracts.vault],
              ["Distributor (thưởng)", contracts.distributor],
              ["Token mUSDC", contracts.token],
            ] as const
          ).map(([label, addr]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt>{label}</dt>
              <dd>
                <a
                  className="underline"
                  href={`https://testnet.snowtrace.io/address/${addr}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddr(addr)}
                </a>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] font-semibold text-cocoa-500">
          Mỗi giao dịch trong app đều kèm link Snowtrace để đối chiếu khi demo.
        </p>
      </div>
    </div>
  );
}
