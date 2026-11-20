"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { HomeTab } from "@/components/cozy/HomeTab";
import { GoalsTab } from "@/components/cozy/GoalsTab";
import { RewardsTab } from "@/components/cozy/RewardsTab";
import { MeTab } from "@/components/cozy/MeTab";
import { useVaultData, type VaultData } from "@/lib/useVaultData";
import { targetChainId } from "@/lib/config";
import { Icon, type IconName } from "@/components/cozy/icons";
import { sfx, unlockAudio } from "@/lib/sound";
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
  const [demoSim, setDemoSim] = useState<{ tokenSpent: bigint; principalAdded: bigint; staged: boolean }>({
    tokenSpent: 0n,
    principalAdded: 0n,
    staged: false,
  });
  const demoAcc = demoData?.account;
  const data = demoData
    ? {
        ...demoData,
        tokenBalance: (demoData.tokenBalance ?? 0n) - demoSim.tokenSpent,
        account: demoAcc
          ? {
              ...demoAcc,
              principal: demoAcc.principal + demoSim.principalAdded,
              streak: demoAcc.streak + BigInt(demoBoost),
              currentEpoch: demoAcc.currentEpoch + BigInt(demoBoost),
              depositCount: (demoAcc.depositCount ?? 0n) + BigInt(demoBoost),
              currentProgress:
                demoBoost > 0 ? 0n : demoSim.staged ? demoAcc.currentTarget : demoAcc.currentProgress,
              currentDeposited:
                demoBoost > 0 ? 0n : demoSim.staged ? demoAcc.currentTarget : demoAcc.currentDeposited,
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

  function handleDemoDeposit() {
    const acc = data.account;
    if (!acc || building || demoSim.staged) return;
    const target = acc.currentTarget ?? 0n;
    const progress = acc.currentProgress ?? 0n;
    const remaining = target > progress ? target - progress : 0n;
    if (remaining <= 0n) return;
    setDemoSim((s) => ({
      tokenSpent: s.tokenSpent + remaining,
      principalAdded: s.principalAdded + remaining,
      staged: true,
    }));
    setBuildKey((k) => k + 1);
  }

  useEffect(() => {
    if (buildKey === 0) return;
    setBuilding(true);
    const t1 = setTimeout(() => {
      setBuilding(false);
      setCelebrateKey((k) => k + 1);
      if (demoData) {
        setDemoBoost((b) => b + 1);
        setDemoSim((s) => ({ ...s, staged: false }));
      }
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
            Savient xây nhà trên Avalanche Fuji C-Chain (chain ID {targetChainId}).
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Savient" className="h-8 w-8 rounded-[9px] shadow-chunkySm" draggable={false} />
            <span className="font-cozy text-2xl font-extrabold text-ink">Savient</span>
            {demoData && (
              <span
                data-testid="demo-badge"
                className="hidden rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-bold text-ink-soft sm:inline-block"
              >
                Bản thử
              </span>
            )}
          </div>

          {/* Desktop tabs */}
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Điều hướng chính">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => switchTab(t.key)}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex min-h-[44px] items-center gap-2 px-1 py-2 text-sm font-bold transition ${
                    active ? "text-ink" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <Icon name={t.icon} size={18} />
                  {t.label}
                  <span
                    className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-cta transition-transform ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50"
                    }`}
                  />
                </button>
              );
            })}
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
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Mobile header compact */}
      <div className="fixed left-0 right-0 top-0 z-30 lg:hidden">
        <div className="mx-auto flex h-14 max-w-app items-center justify-between px-4 pt-1">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Savient" className="h-7 w-7 rounded-lg" draggable={false} />
            <span className="font-cozy text-xl font-extrabold text-ink">Savient</span>
            {demoData && (
              <span data-testid="demo-badge" className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                Bản thử
              </span>
            )}
          </div>
          <ConnectButton />
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
            onDemoDeposit={handleDemoDeposit}
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


