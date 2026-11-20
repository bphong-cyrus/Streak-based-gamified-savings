"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { CozyApp } from "@/components/cozy/CozyApp";
import { useCozyTheme } from "@/components/cozy/useThemeLanding";
import { buildMockData } from "@/lib/mockData";

/** Bẫy lỗi toàn cục: hiện message lỗi thật trên màn hình (kể cả lỗi nằm ngoài
 *  error boundary như event handler / promise). Giúp debug trên môi trường ngườ
 *  dùng thật (Vercel) — thu nhỏ ở góc dưới, bấm để xem chi tiết. */
function useGlobalErrorTrap() {
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const format = (e: ErrorEvent | PromiseRejectionEvent) => {
      if (e instanceof PromiseRejectionEvent) {
        const r = e.reason as { message?: string; stack?: string } | string;
        return typeof r === "string" ? r : `${r?.message ?? "Lỗi không xác định"}\n${r?.stack ?? ""}`;
      }
      return `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack ?? ""}`;
    };
    const onError = (e: ErrorEvent) => setErr(format(e));
    const onRejection = (e: PromiseRejectionEvent) => {
      e.preventDefault();
      setErr(format(e));
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return { err, clear: () => setErr(null) };
}

function GlobalErrorBadge({ err, onClose }: { err: string; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-3 left-3 z-[60] max-w-md">
      {open ? (
        <div className="rounded-xl border border-danger/50 bg-surface p-3 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <strong className="font-cozy text-sm text-danger">Lỗi phát hiện (gửi kèm ảnh này khi báo bug)</strong>
            <button className="text-xs font-bold text-ink-soft" onClick={onClose}>Đóng</button>
          </div>
          <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-ink">{err}</pre>
        </div>
      ) : (
        <button
          className="rounded-full border border-danger/50 bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger shadow-card"
          onClick={() => setOpen(true)}
        >
          ⚠ Có lỗi — bấm xem chi tiết
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const { isConnected } = useAccount();
  const [theme, setTheme] = useCozyTheme();
  const [demoForced, setDemoForced] = useState<boolean | null>(null);
  const { err, clear } = useGlobalErrorTrap();

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
      {err && <GlobalErrorBadge err={err} onClose={clear} />}
    </div>
  );
}
