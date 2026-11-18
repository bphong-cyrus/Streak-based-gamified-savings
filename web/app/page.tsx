"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { CozyApp } from "@/components/cozy/CozyApp";
import { Sky } from "@/components/cozy/Sky";
import { useCozyTheme } from "@/components/cozy/useThemeLanding";
import { buildMockData } from "@/lib/mockData";
import { IDENTITIES } from "@/lib/identity";

export default function Home() {
  const { isConnected } = useAccount();
  const [theme, setTheme] = useCozyTheme();
  const [demo, setDemo] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo"),
  );
  const night = theme === "night";

  return (
    <div className="min-h-screen">
      <Sky night={night} />
      {demo ? (
        <CozyApp theme={theme} onThemeChange={setTheme} demoData={buildMockData()} onExitDemo={() => setDemo(false)} />
      ) : !isConnected ? (
        <Landing night={night} onTryDemo={() => setDemo(true)} />
      ) : (
        <CozyApp theme={theme} onThemeChange={setTheme} />
      )}
    </div>
  );
}

function Landing({ night, onTryDemo }: { night: boolean; onTryDemo: () => void }) {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 pb-10">
      <div className="text-center">
        <div className="font-cozy text-5xl font-extrabold text-white drop-shadow-[0_3px_0_rgba(70,56,39,0.5)]">
          Cozy Save
        </div>
        <p className="mt-1 font-cozy text-lg font-bold text-white/90 drop-shadow-[0_2px_0_rgba(70,56,39,0.4)]">
          Gửi tiền mỗi tuần — xây tòa nhà của bạn
        </p>
      </div>

      {/* tòa nhà minh họa */}
      <div className="mt-4 text-7xl" style={{ filter: "drop-shadow(0 6px 4px rgba(0,0,0,0.25))" }}>
        {night ? "🌃" : "🏡"}
      </div>

      {/* dàn nhân vật chibi sinh động */}
      <div className="mt-5 w-full">
        <div className="flex flex-wrap items-end justify-center gap-2">
          {IDENTITIES.slice(0, 8).map((id, i) => (
            <div key={id.key} className="avatar-bob flex flex-col items-center" style={{ animationDelay: `${i * 0.18}s` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/identities/${i + 1}.png`}
                alt={id.name}
                className="h-14 w-14 rounded-full border-2 border-cocoa-700/50 bg-cream-50 object-cover shadow-chunkySm"
                style={{ objectPosition: "50% 12%" }}
                draggable={false}
              />
              <span className="mt-0.5 rounded-full bg-white/70 px-1.5 text-[9px] font-extrabold text-cocoa-600">
                {id.icon}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center font-cozy text-xs font-bold text-white/90 drop-shadow-[0_1px_0_rgba(70,56,39,0.5)]">
          8 identity đang chờ chủ nhân — kết nối ví rồi chọn nhân vật của bạn! ✨
        </p>
      </div>

      <div className="card-cream mt-6 w-full space-y-2 p-4 text-sm font-semibold text-cocoa-600">
        {[
          ["🏗️", "Gửi đủ mục tiêu mỗi tuần → +1 tầng nhà"],
          ["🔥", "Streak càng dài → phần thưởng lãi càng lớn"],
          ["💸", "Tiền gốc luôn của bạn, rút anytime"],
          ["👥", "Cùng bạn bè giữ nhịp, không lo mất streak"],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-center gap-2">
            <span>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <ConnectButton />
        <button className="btn-cream !py-2 text-sm" onClick={onTryDemo}>
          ✨ Xem thử giao diện (không cần ví)
        </button>
      </div>
      <p className="mt-3 text-center text-xs font-bold text-white/80 drop-shadow-[0_1px_0_rgba(70,56,39,0.5)]">
        Avalanche Fuji Testnet · mUSDC demo
      </p>
    </div>
  );
}
