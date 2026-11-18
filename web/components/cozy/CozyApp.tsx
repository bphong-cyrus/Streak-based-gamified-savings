"use client";

import { useEffect, useState } from "react";
import { useChainId } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { Sky } from "@/components/cozy/Sky";
import { HomeTab } from "@/components/cozy/HomeTab";
import { GoalsTab } from "@/components/cozy/GoalsTab";
import { RewardsTab } from "@/components/cozy/RewardsTab";
import { GroupTab } from "@/components/cozy/GroupTab";
import { MeTab, type ThemeMode } from "@/components/cozy/MeTab";
import { mascotOf } from "@/components/cozy/Building";
import { useVaultData } from "@/lib/useVaultData";
import { shortAddr } from "@/lib/format";
import { targetChainId } from "@/lib/config";

type TabKey = "home" | "goals" | "group" | "rewards" | "me";

const TABS: Array<{ key: TabKey; icon: string; label: string }> = [
  { key: "home", icon: "🏠", label: "Nhà" },
  { key: "goals", icon: "🎯", label: "Mục tiêu" },
  { key: "group", icon: "👥", label: "Nhóm" },
  { key: "rewards", icon: "🎁", label: "Quà" },
  { key: "me", icon: "😺", label: "Tôi" },
];

function useTheme(): [ThemeMode, (t: ThemeMode) => void] {
  const [theme, setTheme] = useState<ThemeMode>("day");
  useEffect(() => {
    const saved = localStorage.getItem("cozy-theme");
    if (saved === "day" || saved === "night") {
      setTheme(saved);
    } else {
      const h = new Date().getHours();
      setTheme(h >= 18 || h < 6 ? "night" : "day");
    }
  }, []);
  const change = (t: ThemeMode) => {
    setTheme(t);
    localStorage.setItem("cozy-theme", t);
  };
  return [theme, change];
}

/** Vỏ app: bầu trờ, header, tab content, bottom nav, animation xây tầng. */
export function CozyApp() {
  const data = useVaultData();
  const chainId = useChainId();
  const [tab, setTab] = useState<TabKey>("home");
  const [theme, setTheme] = useTheme();
  const night = theme === "night";
  const wrongChain = chainId !== targetChainId;

  // animation xây tầng: building → celebrate
  const [building, setBuilding] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [pendingCelebrate, setPendingCelebrate] = useState(false);

  useEffect(() => {
    if (!pendingCelebrate) return;
    setBuilding(true);
    const t1 = setTimeout(() => {
      setBuilding(false);
      setCelebrateKey((k) => k + 1);
    }, 1400);
    const t2 = setTimeout(() => setPendingCelebrate(false), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pendingCelebrate]);

  if (wrongChain) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="card-cream w-full max-w-sm p-6 text-center">
          <div className="text-4xl">🗺️</div>
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
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-cocoa-700/50 bg-cream-100 text-xl shadow-chunkySm">
            {mascotOf(data.address)}
          </span>
          <div>
            <div className="font-cozy text-lg font-extrabold leading-none text-white drop-shadow-[0_2px_0_rgba(70,56,39,0.45)]">
              Cozy Save
            </div>
            <div className={`text-[11px] font-bold ${night ? "text-indigo-200" : "text-sky-100"}`}>
              {data.address ? `Hi, ${shortAddr(data.address)}! ✨` : "Tiết kiệm mọc nhà 🏡"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-cocoa-700/50 bg-cream-100 text-lg shadow-chunkySm active:translate-y-0.5"
            onClick={() => setTheme(night ? "day" : "night")}
            title={night ? "Chuyển ban ngày" : "Chuyển ban đêm"}
          >
            {night ? "☀️" : "🌙"}
          </button>
          <ConnectButton />
        </div>
      </header>

      {/* nội dung tab */}
      <main className="pt-1">
        {tab === "home" && (
          <HomeTab
            data={data}
            night={night}
            building={building}
            celebrateKey={celebrateKey}
            onDepositStart={() => setPendingCelebrate(true)}
          />
        )}
        {tab === "goals" && <GoalsTab data={data} />}
        {tab === "group" && <GroupTab data={data} />}
        {tab === "rewards" && <RewardsTab data={data} />}
        {tab === "me" && <MeTab data={data} theme={theme} onThemeChange={setTheme} />}
      </main>

      {/* bottom nav */}
      <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
        <div className="flex justify-between rounded-2xl border-[3px] border-cocoa-700/70 bg-cream-100 px-2 py-1.5 shadow-chunky">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`flex w-14 flex-col items-center gap-0.5 rounded-xl py-1 transition ${
                tab === t.key ? "bg-leaf-400/90 shadow-chunkySm" : "opacity-70 hover:opacity-100"
              }`}
              onClick={() => setTab(t.key)}
            >
              <span className="text-lg leading-none">{t.icon}</span>
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
