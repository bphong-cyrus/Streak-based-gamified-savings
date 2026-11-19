"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAccount, useChainId } from "wagmi";
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
  demoData?: VaultData;
  demoForced: boolean;
  isConnected: boolean;
  onExitDemo?: () => void;
}

export function CozyApp({ theme, onThemeChange, demoData, demoForced, isConnected, onExitDemo }: CozyAppProps) {
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
  const { isConnecting, isReconnecting } = useAccount();
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
        <div className="card w-full max-w-sm p-6 text-center">
          <div className="mx-auto w-fit"><Icon name="flag" size={40} className="text-ink-muted" /></div>
          <h2 className="mt-2 font-cozy text-xl font-bold text-ink">Bạn đang ở mạng khác</h2>
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            Cozy Save xây nhà trên Avalanche Fuji C-Chain (chain ID {targetChainId}).
          </p>
          <div className="mt-4 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  const connecting = isConnecting || isReconnecting;

  return (
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-app px-4 pb-32 pt-24 md:px-6 md:pb-28 md:pt-28 lg:px-10">
      {/* Desktop header */}
      <header className="fixed left-0 right-0 top-0 z-30">
        <div className="mx-auto flex h-16 max-w-app items-center justify-between px-4 md:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="font-cozy text-2xl font-extrabold text-ink">Cozy Save</span>
            {demoData && (
              <span className="hidden rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-bold text-ink-soft sm:inline-block">
                Bản thử
              </span>
            )}
          </div>

          {/* Desktop tabs */}
          <nav className="hidden items-center gap-1 rounded-2xl border border-border bg-surface/90 p-1 shadow-card backdrop-blur-md lg:flex">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                aria-current={tab === t.key ? "page" : undefined}
                className={`flex min-h-[40px] items-center gap-2 rounded-xl px-4 py-1.5 text-sm font-bold transition ${
                  tab === t.key ? "bg-cta text-white shadow-button" : "text-ink-soft hover:bg-surface-sunken hover:text-ink"
                }`}
              >
                <Icon name={t.icon} size={18} />
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {connecting && !demoData && (
              <span className="hidden rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-ink-soft md:inline">
                Đang kết nối…
              </span>
            )}
            {demoData && demoForced && isConnected && (
              <button className="btn-secondary !h-9 !px-3 !py-1.5 text-xs" onClick={onExitDemo}>
                Thoát bản thử
              </button>
            )}
            <HeaderIconButton
              label={night ? "Chuyển ban ngày" : "Chuyển ban đêm"}
              onClick={() => onThemeChange(night ? "day" : "night")}
            >
              <Icon name={night ? "sun" : "moon"} size={18} />
            </HeaderIconButton>
            <div className="hidden md:block">
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile header compact */}
      <div className="fixed left-0 right-0 top-0 z-30 lg:hidden">
        <div className="mx-auto flex h-14 max-w-app items-center justify-between px-4 pt-1">
          <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface/95 px-3 py-1.5 shadow-card backdrop-blur-md">
            <IdentityAvatar address={data.address} className="h-8 w-8" />
            <div>
              <div className="font-cozy text-sm font-extrabold leading-none text-ink">Cozy Save</div>
              <div className="text-[10px] font-semibold text-ink-soft">
                {data.address ? shortAddr(data.address) : "Tiết kiệm mọc nhà"}
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
            <div className="md:hidden">
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>

      <main className="min-h-[calc(100vh-8rem)]">
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

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="mx-auto max-w-app px-4 pb-4 pt-2">
          <div className="flex justify-between rounded-2xl border border-border bg-surface/95 px-2 py-1.5 shadow-card backdrop-blur-md">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`flex min-h-[52px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 transition ${
                  tab === t.key ? "bg-cta text-white shadow-button" : "text-ink-soft hover:bg-surface-sunken"
                }`}
                onClick={() => switchTab(t.key)}
                aria-current={tab === t.key ? "page" : undefined}
              >
                <Icon name={t.icon} size={20} />
                <span className="text-[10px] font-bold">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}

function HeaderIconButton({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink-soft shadow-card transition hover:bg-surface-sunken hover:text-ink active:translate-y-[1px]"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}
