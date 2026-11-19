"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { CozyApp } from "@/components/cozy/CozyApp";
import { useCozyTheme } from "@/components/cozy/useThemeLanding";
import { buildMockData } from "@/lib/mockData";

export default function Home() {
  const { isConnected } = useAccount();
  const [theme, setTheme] = useCozyTheme();
  const [demoForced, setDemoForced] = useState<boolean | null>(null);

  useEffect(() => {
    setDemoForced(new URLSearchParams(window.location.search).has("demo"));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("night-ui", theme === "night");
    return () => document.documentElement.classList.remove("night-ui");
  }, [theme]);

  if (demoForced === null) {
    return <div className="min-h-screen bg-[var(--paper)]" />;
  }

  const showDemo = demoForced === true || !isConnected;

  return (
    <div className="min-h-screen">
      {showDemo ? (
        <CozyApp
          theme={theme}
          onThemeChange={setTheme}
          demoData={buildMockData()}
          demoForced={demoForced === true}
          isConnected={isConnected}
          onExitDemo={() => setDemoForced(false)}
        />
      ) : (
        <CozyApp theme={theme} onThemeChange={setTheme} demoForced={false} isConnected={isConnected} />
      )}
    </div>
  );
}
