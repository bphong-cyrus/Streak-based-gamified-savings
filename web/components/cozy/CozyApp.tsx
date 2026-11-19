"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useChainId } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { HomeTab } from "@/components/cozy/HomeTab";
import { GoalsTab } from "@/components/cozy/GoalsTab";
import { RewardsTab } from "@/components/cozy/RewardsTab";
import { MeTab } from "@/components/cozy/MeTab";
import { IdentityAvatar } from "@/lib/identity";
import { useVaultData, type VaultData } from "@/lib/useVaultData";
import { shortAddr } from "@/lib/format";
import { targetChainId } from "@/lib/config";
import { Icon, type IconName } from "@/components/cozy/icons";
import { isMuted, setMuted, sfx, unlockAudio } from "@/lib/sound";
import { Onboarding } from "@/components/cozy/Onboarding";
import { setDemoMode } from "@/lib/demo";
import type { ThemeMode } from "@/components/cozy/useThemeLanding";

type TabKey = "home" | "goals" | "rewards" | "me";

const TABS: Array<{ key: TabKey; icon: IconName; label: string }> = [
  { key: "home", icon: "home", label: "Nhà" },
  { key: "goals", icon: "target", label: "Mục tiêu" },
  { key: "rewards", icon: "trophy", label: "Thưởng" },
  { key: "me", icon: "cat", label: "Hồ sơ" },
];

interface CozyAppProps {
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
  /** Dữ liệu mẫu khi xem demo không cần ví (?demo=1 hoặc ví chưa kết nối). */
  demoData?: VaultData;
  onExitDemo?: () => void;
  /** CTA hiển thị trong banner demo (VD: nút kết nối ví khi chưa đăng nhập). */
  demoCta?: React.ReactNode;
}

/** Vỏ app: header, tab content, bottom nav, animation xây tầng. */
export function CozyApp({ theme, onThemeChange, demoData, onExitDemo, demoCta }: CozyAppProps) {
  const live = useVaultData({ enabled: !demoData });
  const [demoBoost, setDemoBoost] = useState(0);
  const demoAcc = demoData?.account;
  const data = demoData
    ? {
        ...demoData,
        account: demoAcc
          ? {
              ...demoAcc,
              streak: demoAcc.streak + BigInt(demoBoost),
              currentEpoch: demoAcc.currentEpoch + BigInt(demoBoost),
              depositCount: (demoAcc.depositCount ?? 0n) + BigInt(demoBoost),
              ...(demoBoost > 0 ? { currentProgress: 0n, currentDeposited: 0n } : {}),
            }
          : demoAcc,
      }
    : live;

  useEffect(() => {
    setDemoMode(!!demoData);
    return () => setDemoMode(false);
  }, [demoData]);

  const chainId = useChainId();
  const [tab, setTab] = useState<TabKey>("home");
  const night = theme === "night";
  const wrongChain = !demoData && chainId !== targetChainId;
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  function switchTab(t: TabKey) {
    if (t !== tab) sfx.tab();
    setTab(t);
  }

  const [building, setBuilding] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [buildKey, setBuildKey] = useState(0);

  useEffect(() => {
    if (buildKey === 0) return;
    setBuilding(true);
    const t1 = setTimeout(() => {
      setBuilding(false);
      setCelebrateKey((k) => k + 1);
      if (demoData) setDemoBoost((b) => b + 1);
    }, 4600);
    return () => clearTimeout(t1);
  }, [buildKey, demoData]);

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
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-md md:max-w-3xl">
      {/* Floating glassmorphic header pill */}
      <header className="fixed left-1/2 top-3 z-30 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 md:max-w-2xl">
        <div className="flex items-center justify-between rounded-full border border-white/80 bg-[#FFFDF8]/90 px-3 py-2 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <IdentityAvatar address={data.address} className="h-9 w-9" />
            <div>
              <div className="font-cozy text-base font-extrabold leading-none text-[#2C221E]">Cozy Save</div>
              <div className="text-[10px] font-bold text-cocoa-600/80">
                {data.address ? (
                  <>
                    Hi, {shortAddr(data.address)}!{" "}
                    <span className="rounded bg-leaf-300/40 px-1 py-px font-cozy text-[9px] font-extrabold text-leaf-700">
                      Lv.{1 + Math.floor(Number(data.account?.streak ?? 0n) / 2)}
                    </span>
                  </>
                ) : (
                  "Tiết kiệm mọc nhà"
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <HeaderIconButton
              label={night ? "Chuyển ban ngày" : "Chuyển ban đêm"}
              onClick={() => onThemeChange(night ? "day" : "night")}
            >
              <Icon name={night ? "sun" : "moon"} size={18} />
            </HeaderIconButton>
            <HeaderIconButton
              label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
              onClick={() => {
                const m = !muted;
                setMuted(m);
                setMutedState(m);
                if (!m) sfx.click();
              }}
            >
              <Icon name="volume" size={17} className={muted ? "opacity-40" : undefined} />
            </HeaderIconButton>
            {demoData ? (
              <span className="rounded-full border border-[#e3d5b8] bg-white/90 px-3 py-1.5 font-cozy text-xs font-extrabold text-cocoa-600 shadow-sm">
                Demo
              </span>
            ) : (
              <ConnectButton />
            )}
          </div>
        </div>
      </header>

      {demoData && (
        <div className="pointer-events-none fixed left-1/2 top-[4.25rem] z-20 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 md:max-w-2xl">
          <div className="pointer-events-none flex items-center justify-between gap-2 rounded-full border border-cocoa-700/20 bg-white/90 py-1.5 pl-3 pr-1.5 shadow-sm backdrop-blur-sm">
            <span className="text-left text-[11px] font-bold text-cocoa-600">
              {demoCta ? "Bạn đang xem thử không cần ví — kết nối để dùng thật" : "Demo với dữ liệu mẫu — giao dịch sẽ không thực hiện được"}
            </span>
            {demoCta ? (
              <span className="pointer-events-auto">{demoCta}</span>
            ) : (
              <button className="pointer-events-auto shrink-0 text-[11px] font-bold underline" onClick={onExitDemo}>
                Thoát
              </button>
            )}
          </div>
        </div>
      )}

      {/* nội dung tab — pb-36 để bottom nav không che */}
      <main className="px-3 pb-36 pt-28 md:px-4 md:pt-36">
        {tab === "home" && (
          <HomeTab
            data={data}
            night={night}
            building={building}
            celebrateKey={celebrateKey}
            onDepositStart={() => setBuildKey((k) => k + 1)}
            isDemo={!!demoData}
          />
        )}
        {tab === "goals" && <GoalsTab data={data} />}
        {tab === "rewards" && <RewardsTab data={data} />}
        {tab === "me" && <MeTab data={data} theme={theme} onThemeChange={onThemeChange} />}
      </main>

      <Onboarding />

      {/* bottom nav */}
      <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
        <div className="flex justify-between rounded-3xl border border-[#eadfc6] bg-white/95 px-2 py-1.5 shadow-[0_8px_30px_-6px_rgba(70,56,39,0.25)] backdrop-blur-md">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`flex min-h-[44px] w-16 flex-col items-center justify-center gap-0.5 rounded-2xl py-1 transition focus-visible:ring-2 focus-visible:ring-leaf-400 focus-visible:ring-offset-1 ${
                tab === t.key ? "bg-gradient-to-b from-leaf-400 to-leaf-500 text-white shadow-md" : "opacity-75 hover:opacity-100"
              }`}
              onClick={() => switchTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
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

function HeaderIconButton({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e3d5b8] bg-white/90 text-cocoa-600 shadow-sm transition hover:bg-white active:translate-y-[1px] active:scale-95 focus-visible:ring-2 focus-visible:ring-leaf-400 focus-visible:ring-offset-1"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}
