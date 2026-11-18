"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { CozyApp } from "@/components/cozy/CozyApp";
import { Sky } from "@/components/cozy/Sky";
import { useCozyTheme } from "@/components/cozy/useThemeLanding";
import { buildMockData } from "@/lib/mockData";

export default function Home() {
  const { isConnected } = useAccount();
  const [theme, setTheme] = useCozyTheme();
  const [demo, setDemo] = useState(false);
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
      <div className="mt-6 text-7xl" style={{ filter: "drop-shadow(0 6px 4px rgba(0,0,0,0.25))" }}>
        {night ? "🌃" : "🏡"}
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
