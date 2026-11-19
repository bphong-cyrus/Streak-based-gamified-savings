"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { CozyApp } from "@/components/cozy/CozyApp";
import { Sky } from "@/components/cozy/Sky";
import { Building } from "@/components/cozy/Building";
import { Icon } from "@/components/cozy/icons";
import { useCozyTheme } from "@/components/cozy/useThemeLanding";
import { buildMockData } from "@/lib/mockData";
import { IDENTITIES } from "@/lib/identity";

export default function Home() {
  const { isConnected } = useAccount();
  const [theme, setTheme] = useCozyTheme();
  // ?demo chỉ có trên client — đợi mount để tránh hydration mismatch (server luôn render landing).
  const [demo, setDemo] = useState<boolean | null>(null);
  useEffect(() => {
    setDemo(new URLSearchParams(window.location.search).has("demo"));
  }, []);
  const night = theme === "night";

  return (
    <div className={`min-h-screen ${night ? "night-ui" : ""}`}>
      <Sky night={night} />
      {demo === null ? (
        <div className="relative z-10 min-h-screen" />
      ) : demo ? (
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

      {/* tòa nhà minh họa 2.5D — đúng component dùng trong app, thu nhỏ lại */}
      <div className="mt-2 h-[300px] w-full overflow-hidden">
        <div className="flex justify-center" style={{ transform: "scale(0.58)", transformOrigin: "top center" }}>
          <Building floors={3} night={night} building={false} celebrating={false} goalDone={false} />
        </div>
      </div>

      {/* dàn nhân vật chibi sinh động */}
      <div className="mt-5 w-full">
        <div className="flex flex-wrap items-end justify-center gap-2">
          {IDENTITIES.map((id, i) => (
            <div key={id.key} className="avatar-bob flex flex-col items-center" style={{ animationDelay: `${i * 0.18}s` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/identities/${id.key}.svg`}
                alt={id.name}
                className="h-16 w-16 rounded-full border-2 border-cocoa-700/50 bg-cream-50 object-cover shadow-chunkySm"
                style={{ objectPosition: "50% 28%" }}
                draggable={false}
              />
              <span className="mt-0.5 rounded-full bg-white/70 px-1.5 text-[9px] font-extrabold text-cocoa-600">
                {id.icon}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center font-cozy text-xs font-bold text-white/90 drop-shadow-[0_1px_0_rgba(70,56,39,0.5)]">
          5 bạn thú đang chờ chủ nhân — kết nối ví rồi chọn nhân vật của bạn! ✨
        </p>
      </div>

      <div className="card-cream mt-4 w-full space-y-2 p-4 text-sm font-semibold text-cocoa-600">
        {[
          ["hammer", "Gửi đủ mục tiêu mỗi tuần → +1 tầng nhà"],
          ["flame", "Streak càng dài → phần thưởng lãi càng lớn"],
          ["wallet", "Tiền gốc luôn của bạn, rút anytime"],
          ["users", "Cùng bạn bè giữ nhịp, không lo mất streak"],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-cocoa-700/30 bg-white/80 text-cocoa-600">
              <Icon name={icon as "hammer"} size={16} />
            </span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <ConnectButton />
        <button className="btn-cream !py-2 text-sm" onClick={onTryDemo}>
          Xem thử giao diện (không cần ví)
        </button>
      </div>
      <p className="mt-3 text-center text-xs font-bold text-white/80 drop-shadow-[0_1px_0_rgba(70,56,39,0.5)]">
        Avalanche Fuji Testnet · mUSDC demo
      </p>
    </div>
  );
}
