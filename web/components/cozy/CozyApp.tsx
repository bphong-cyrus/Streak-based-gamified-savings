"use client";

import { useEffect, useState } from "react";
import { useChainId } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { Sky } from "@/components/cozy/Sky";
import { HomeTab } from "@/components/cozy/HomeTab";
import { GoalsTab } from "@/components/cozy/GoalsTab";
import { PlayTab } from "@/components/cozy/PlayTab";
import { ToolsTab } from "@/components/cozy/ToolsTab";
import { GroupTab } from "@/components/cozy/GroupTab";
import { MeTab } from "@/components/cozy/MeTab";
import { Icon, type IconName } from "@/components/cozy/icons";
import { isMuted, setMuted, sfx, unlockAudio } from "@/lib/sound";
import { Onboarding } from "@/components/cozy/Onboarding";
import { IdentityAvatar } from "@/lib/identity";
import { useVaultData, type VaultData } from "@/lib/useVaultData";
import { useGemsData } from "@/lib/useGemsData";
import { shortAddr } from "@/lib/format";
import { targetChainId } from "@/lib/config";
import type { ThemeMode } from "@/components/cozy/useThemeLanding";

type TabKey = "home" | "goals" | "group" | "play" | "tools" | "me";

const TABS: Array<{ key: TabKey; icon: IconName; label: string }> = [
  { key: "home", icon: "home", label: "Nhà" },
  { key: "goals", icon: "target", label: "Mục tiêu" },
  { key: "group", icon: "users", label: "Nhóm" },
  { key: "play", icon: "gamepad", label: "Chơi" },
  { key: "tools", icon: "wrench", label: "Tiện ích" },
  { key: "me", icon: "cat", label: "Tôi" },
];

interface CozyAppProps {
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
  /** Dữ liệu mẫu khi xem demo không cần ví. */
  demoData?: VaultData;
  onExitDemo?: () => void;
}

/** Vỏ app: header, tab content, bottom nav, animation xây tầng. Bầu trờ do page.tsx render theo theme. */
export function CozyApp({ theme, onThemeChange, demoData, onExitDemo }: CozyAppProps) {
  const live = useVaultData();
  const data = demoData ?? live;
  const gemsData = useGemsData();
  const chainId = useChainId();
  const [tab, setTab] = useState<TabKey>("home");
  const [muted, setMutedState] = useState(isMuted());

  // Mở khoá AudioContext ở lần chạm đầu tiên (chính sách autoplay của trình duyệt)
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  function switchTab(t: TabKey) {
    if (t !== tab) sfx.tab();
    setTab(t);
  }
  const night = theme === "night";
  const wrongChain = !demoData && chainId !== targetChainId;

  // animation xây tầng: building → celebrate
  const [building, setBuilding] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [pendingCelebrate, setPendingCelebrate] = useState(false);

  useEffect(() => {
    if (!pendingCelebrate) return;
    setBuilding(true);
    // 4.6s: đủ cho chuỗi chạy vào -> đập búa -> lấp lánh của ConstructionSite
    const t1 = setTimeout(() => {
      setBuilding(false);
      setCelebrateKey((k) => k + 1);
    }, 4600);
    const t2 = setTimeout(() => setPendingCelebrate(false), 7800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pendingCelebrate]);

  if (wrongChain) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="card-cream w-full max-w-sm p-6 text-center">
          <div className="mx-auto w-fit"><Icon name="flag" size={40} className="text-cocoa-500" /></div>
          <h2 className="mt-2 font-cozy text-xl font-bold">Bạn đang ở mạng khác</h2>
          <p className="mt-1 text-sm font-semibold text-cocoa-500">
            Cozy Save xây nhà trên Avalanche Fuji C-Chain (chain ID {targetChainId}).
          </p>
          <div className="mt-4 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-md pb-4">
      {/* header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <IdentityAvatar address={data.address} className="h-10 w-10" />
          <div>
            <div className="font-cozy text-lg font-extrabold leading-none text-white drop-shadow-[0_2px_0_rgba(70,56,39,0.45)]">
              Cozy Save
            </div>
            <div className={`text-[11px] font-bold ${night ? "text-indigo-200" : "text-sky-100"}`}>
              {data.address ? (
                <>
                  Hi, {shortAddr(data.address)}!{" "}
                  <span className="rounded bg-cream-100/90 px-1 py-px font-cozy text-[10px] font-extrabold text-lavender-500">
                    Lv.{1 + Math.floor(Number(data.account?.streak ?? 0n) / 2)}
                  </span>
                </>
              ) : (
                "Tiết kiệm mọc nhà"
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-cocoa-700/50 bg-cream-100 text-cocoa-600 shadow-chunkySm active:translate-y-0.5"
            onClick={() => onThemeChange(night ? "day" : "night")}
            title={night ? "Chuyển ban ngày" : "Chuyển ban đêm"}
          >
            <Icon name={night ? "sun" : "moon"} size={19} />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-cocoa-700/50 bg-cream-100 text-cocoa-600 shadow-chunkySm active:translate-y-0.5"
            onClick={() => {
              const m = !muted;
              setMuted(m);
              setMutedState(m);
              if (!m) sfx.click();
            }}
            title={muted ? "Bật âm thanh" : "Tắt âm thanh"}
          >
            <span className="relative">
              <Icon name="volume" size={18} className={muted ? "opacity-40" : undefined} />
            </span>
          </button>
          {demoData ? (
            <span className="rounded-full border-2 border-cocoa-700/50 bg-cream-100 px-3 py-1.5 font-cozy text-xs font-extrabold text-cocoa-600 shadow-chunkySm">
              Demo
            </span>
          ) : (
            <ConnectButton />
          )}
        </div>
      </header>

      {demoData && (
        <button
          className="mx-4 mt-1 flex w-[calc(100%-2rem)] items-center justify-between rounded-xl border-2 border-dashed border-cocoa-700/40 bg-cream-100/90 px-3 py-1.5 text-left text-xs font-bold text-cocoa-600"
          onClick={onExitDemo}
        >
          <span>Demo với dữ liệu mẫu — giao dịch sẽ không thực hiện được</span>
          <span className="pl-2 underline">Thoát</span>
        </button>
      )}

      {/* nội dung tab */}
      <main className="pt-1">
        {tab === "home" && (
          <HomeTab
            data={data}
            night={night}
            building={building}
            celebrateKey={celebrateKey}
            gemsBalance={gemsData.gemsBalance}
            onDepositStart={() => setPendingCelebrate(true)}
            isDemo={!!demoData}
          />
        )}
        {tab === "goals" && <GoalsTab data={data} />}
        {tab === "group" && <GroupTab data={data} />}
        {tab === "play" && <PlayTab data={data} missions={gemsData.missions} gemsBalance={gemsData.gemsBalance} />}
        {tab === "tools" && <ToolsTab />}
        {tab === "me" && (
          <MeTab
            data={data}
            theme={theme}
            onThemeChange={onThemeChange}
            themes={gemsData.themes}
            decors={gemsData.decors}
            gemsBalance={gemsData.gemsBalance}
            gemsAllowance={gemsData.gemsAllowance}
          />
        )}
      </main>

      {/* hướng dẫn lần đầu */}
      <Onboarding />

      {/* bottom nav */}
      <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
        <div className="flex justify-between rounded-2xl border-[3px] border-cocoa-700/70 bg-cream-100 px-2 py-1.5 shadow-chunky">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`flex w-14 flex-col items-center gap-0.5 rounded-xl py-1 transition ${
                tab === t.key ? "bg-leaf-400/90 shadow-chunkySm" : "opacity-70 hover:opacity-100"
              }`}
              onClick={() => switchTab(t.key)}
            >
              <Icon name={t.icon} size={21} className={tab === t.key ? "text-white" : "text-cocoa-600"} />
              <span className={`text-[10px] font-bold ${tab === t.key ? "text-white" : "text-cocoa-600"}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
