"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { LanguagePicker } from "@/components/LanguagePicker";
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

/** Nút chuyển sáng/tối nhanh ở header, kế bên nút kết nối ví. */
function ThemeToggle({ night, onToggle }: { night: boolean; onToggle: () => void }) {
  const { t: translate } = useLanguage();
  return (
    <button
      onClick={() => {
        sfx.click();
        onToggle();
      }}
      aria-label={night ? translate("Chuyển sang giao diện sáng") : translate("Chuyển sang giao diện tối")}
      title={night ? translate("Giao diện tối — bấm để sáng") : translate("Giao diện sáng — bấm để tối")}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink-soft shadow-card transition hover:bg-surface-sunken hover:text-ink active:translate-y-[1px]"
    >
      <Icon name={night ? "sun" : "moon"} size={17} />
    </button>
  );
}

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
  const { t: translate } = useLanguage();
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

  const { chainId, isConnecting, isReconnecting } = useAccount();
  const [tab, setTab] = useState<TabKey>("home");
  const night = theme === "night";
  const wrongChain = !demoData && chainId !== undefined && chainId !== targetChainId;

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
  }

  // Bước 2 của bản thử: chốt kỳ (mô phỏng) — lúc này tầng/streak/thưởng mới tăng cùng nhau.
  function handleDemoSettle() {
    if (!demoData || building || !demoSim.staged) return;
    setBuildKey((k) => k + 1);
  }

  useEffect(() => {
    if (buildKey === 0 || !demoData) return;
    setBuilding(true);
    const t1 = setTimeout(() => {
      setBuilding(false);
      setCelebrateKey((k) => k + 1);
      setDemoBoost((b) => b + 1);
      setDemoSim((s) => ({ ...s, staged: false }));
    }, 2200);
    return () => clearTimeout(t1);
  }, [buildKey, demoData]);

  if (wrongChain) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="card w-full max-w-sm p-6 text-center">
          <div className="mx-auto w-fit"><Icon name="flag" size={40} className="text-ink-muted" /></div>
          <h2 className="mt-2 font-cozy text-xl font-bold text-ink">{translate("Bạn đang ở mạng khác")}</h2>
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            {translate("Savient xây nhà trên Avalanche Fuji C-Chain (chain ID {0}).", [targetChainId])}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <LanguagePicker />
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
      <header className="fixed left-0 right-0 top-0 z-30 hidden lg:block">
        <div className="mx-auto flex h-16 max-w-app items-center justify-between px-4 md:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={night ? "/logo.png" : "/logo-light.png"}
              alt="Savient"
              className="h-8 w-8 rounded-[9px] shadow-chunkySm"
              draggable={false}
            />
            <span data-testid="brand" className="font-cozy text-2xl font-extrabold text-ink">Savient</span>
            {demoData && (
              <span
                data-testid="demo-badge"
                className="hidden shrink-0 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-bold text-ink-soft sm:inline-block"
              >
                {translate("Bản thử")}
              </span>
            )}
          </div>

          {/* Desktop tabs */}
          <nav className="hidden items-center gap-3 lg:flex xl:gap-6" aria-label={translate("Điều hướng chính")}>
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
                  {translate(t.label)}
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
                {translate("Đang kết nối…")}
              </span>
            )}
            {demoData && demoForced && isConnected && (
              <button className="btn-secondary !h-9 !px-3 !py-1.5 text-xs" onClick={onExitDemo}>
                {translate("Thoát bản thử")}
              </button>
            )}
            <ThemeToggle night={night} onToggle={() => onThemeChange(night ? "day" : "night")} />
            <LanguagePicker />
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Mobile header compact */}
      <div className="fixed left-0 right-0 top-0 z-30 lg:hidden">
        <div className="mx-auto flex h-14 max-w-app items-center justify-between px-4 pt-1">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={night ? "/logo.png" : "/logo-light.png"} alt="Savient" className="h-7 w-7 rounded-lg" draggable={false} />
            <span data-testid="brand" className="font-cozy text-xl font-extrabold text-ink">Savient</span>
            {demoData && (
              <span data-testid="demo-badge" className="hidden rounded-full border border-border bg-surface px-2 py-0.5 min-[370px]:inline-block text-[10px] font-bold text-ink-soft">
                {translate("Bản thử")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle night={night} onToggle={() => onThemeChange(night ? "day" : "night")} />
            <LanguagePicker />
            <ConnectButton />
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
            onDepositStart={() => {
              // Live mode: deposit chỉ ghi nhận giao dịch; tầng chỉ tăng SAU KHI kỳ được chốt on-chain.
              if (demoData) setBuildKey((k) => k + 1);
            }}
            onDemoDeposit={handleDemoDeposit}
            onDemoSettle={handleDemoSettle}
            demoStaged={demoSim.staged}
            isDemo={!!demoData}
          />
        )}
        {tab === "goals" && <GoalsTab data={data} />}
        {tab === "rewards" && <RewardsTab data={data} />}
        {tab === "me" && <MeTab data={data} theme={theme} onThemeChange={onThemeChange} />}
      </main>

      <Onboarding />

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden" aria-label={translate("Điều hướng chính")}>
        <div className="mx-auto max-w-app px-4 pb-4 pt-2">
          <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-surface/95 px-2 py-1.5 shadow-card backdrop-blur-md">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 transition ${
                  tab === t.key ? "bg-cta text-white shadow-button" : "text-ink-soft hover:bg-surface-sunken"
                }`}
                onClick={() => switchTab(t.key)}
                aria-current={tab === t.key ? "page" : undefined}
              >
                <Icon name={t.icon} size={20} />
                <span className="text-[10px] font-bold">{translate(t.label)}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}


