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
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-10">
      <div className="w-full text-center md:text-left">
        <div className="font-cozy text-5xl font-extrabold text-white drop-shadow-[0_3px_0_rgba(70,56,39,0.5)] md:text-6xl">
          Cozy Save
        </div>
        <p className="mt-1 font-cozy text-lg font-bold text-white/90 drop-shadow-[0_2px_0_rgba(70,56,39,0.4)]">
          Gửi tiền mỗi tuần — xây tòa nhà của bạn
        </p>
      </div>

      <div className="mt-4 flex w-full flex-col items-center gap-5 md:flex-row md:items-start md:gap-8">
      {/* cột trái: điểm nổi bật + CTA */}
      <div className="order-2 w-full max-w-md md:order-1 md:flex-1">
        <div className="card-cream w-full space-y-2 p-4 text-sm font-semibold text-cocoa-600">
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

        {/* Vì sao Cozy Save — phần dành cho giám khảo */}
        <div className="mt-4 w-full rounded-2xl border-2 border-dashed border-cocoa-700/40 bg-white/25 p-4 backdrop-blur-[2px]">
          <h3 className="text-center font-cozy text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(70,56,39,0.5)]">
            Vì sao Cozy Save?
          </h3>
          <div className="mt-2 space-y-2 text-left text-sm font-semibold text-white/95 drop-shadow-[0_1px_0_rgba(70,56,39,0.5)]">
            <p>
              <strong>Vấn đề:</strong> ngườ trẻ khó giữ thói quen gửi tiền đều — thiếu động lực, dễ bỏ cuộc sau vài tuần.
            </p>
            <p>
              <strong>Giải pháp:</strong> streak game hoá — gửi đều mỗi kỳ thì streak tăng và phần thưởng lãi tăng theo;
              bỏ kỳ thì streak về 0. Toà nhà 3D của bạn lớn lên cùng thói quen tốt.
            </p>
            <p>
              <strong>Trên Avalanche:</strong> mọi thứ ghi on-chain — vault, phần thưởng, 25+ hợp đồng mở rộng
              (nhóm bạn bè, hụi điện tử, xổ số tiết kiệm, tín dụng streak...) đều đối chiếu được trên Snowtrace.
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ["25+", "hợp đồng"],
              ["6", "tab tính năng"],
              ["100%", "gốc của bạn"],
            ].map(([num, label]) => (
              <div key={label} className="rounded-xl border-2 border-white/40 bg-white/20 px-2 py-1.5">
                <div className="font-cozy text-lg font-extrabold text-white">{num}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/85">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3 md:flex-row">
          <ConnectButton />
          <button className="btn-cream !py-2 text-sm" onClick={onTryDemo}>
            Xem thử giao diện (không cần ví)
          </button>
        </div>
        <p className="mt-3 text-center text-xs font-bold text-white/80 drop-shadow-[0_1px_0_rgba(70,56,39,0.5)] md:text-left">
          Avalanche Fuji Testnet · mUSDC demo
        </p>
      </div>

      {/* cột phải: tòa nhà 3D + dàn nhân vật */}
      <div className="order-1 flex w-full flex-col items-center md:order-2 md:w-[420px]">
        {/* mobile: nhà nhỏ giữa trang */}
        <div className="mt-2 h-[290px] w-full overflow-hidden md:hidden">
          <div className="flex justify-center" style={{ transform: "scale(0.55)", transformOrigin: "top center" }}>
            <Building floors={3} night={night} building={false} celebrating={false} goalDone={false} />
          </div>
        </div>
        {/* desktop: nhà to rõ */}
        <div className="hidden md:block">
          <div style={{ transform: "scale(0.8)", transformOrigin: "top center" }}>
            <Building floors={3} night={night} building={false} celebrating={false} goalDone={false} />
          </div>
        </div>

        {/* dàn nhân vật chibi sinh động */}
        <div className="mt-4 w-full md:-mt-2">
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
            5 bạn thú đang chờ chủ nhân — kết nối ví rồi chọn nhân vật của bạn!
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
