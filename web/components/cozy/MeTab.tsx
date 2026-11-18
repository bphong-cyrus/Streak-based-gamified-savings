"use client";

import { useDisconnect } from "wagmi";
import { contracts } from "@/lib/config";
import { fmt, shortAddr } from "@/lib/format";
import { mascotOf } from "@/components/cozy/Building";
import type { VaultData } from "@/lib/useVaultData";

export type ThemeMode = "day" | "night";

interface Props {
  data: VaultData;
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
}

/** Tab Me: hồ sơ, cài đặt giao diện, thông tin ví & hợp đồng. */
export function MeTab({ data, theme, onThemeChange }: Props) {
  const { disconnect } = useDisconnect();
  const { address, tokenBalance, claimed, account } = data;

  return (
    <div className="space-y-3 px-4 pb-28 pt-2">
      {/* hồ sơ */}
      <div className="card-cream p-4 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-cocoa-700/60 bg-white text-5xl shadow-chunkySm">
          {mascotOf(address)}
        </div>
        <h3 className="mt-2 font-cozy text-xl font-extrabold">{shortAddr(address)}</h3>
        <p className="text-xs font-semibold text-cocoa-500">
          🔥 Streak dài nhất hiện tại: {account?.streak.toString() ?? 0} tuần · 🌱 Đã nhận {fmt(claimed)} mUSDC lãi
        </p>
        <button className="btn-cream mt-3" onClick={() => disconnect()}>
          🔌 Ngắt kết nối ví
        </button>
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
