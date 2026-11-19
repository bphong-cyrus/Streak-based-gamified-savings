"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { CozyApp } from "@/components/cozy/CozyApp";
import { Sky } from "@/components/cozy/Sky";
import { useCozyTheme } from "@/components/cozy/useThemeLanding";
import { buildMockData } from "@/lib/mockData";

export default function Home() {
  const { isConnected } = useAccount();
  const [theme, setTheme] = useCozyTheme();
  const [demoForced, setDemoForced] = useState<boolean | null>(null);
  useEffect(() => {
    setDemoForced(new URLSearchParams(window.location.search).has("demo"));
  }, []);
  const night = theme === "night";

  // ?demo=1 -> luôn demo. Chưa kết nối ví -> vào thẳng Dashboard dạng demo kèm CTA kết nối.
  // Kết nối xong -> app thật tự động.
  const showDemo = demoForced === true || !isConnected;

  return (
    <div className={`min-h-screen ${night ? "night-ui" : ""}`}>
      <Sky night={night} />
      {demoForced === null ? (
        <div className="relative z-10 min-h-screen" />
      ) : showDemo ? (
        <CozyApp
          theme={theme}
          onThemeChange={setTheme}
          demoData={buildMockData()}
          onExitDemo={() => setDemoForced(false)}
          demoCta={
            !isConnected ? (
              <ConnectButton />
            ) : undefined
          }
        />
      ) : (
        <CozyApp theme={theme} onThemeChange={setTheme} />
      )}
    </div>
  );
}
