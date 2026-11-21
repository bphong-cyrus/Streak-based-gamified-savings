"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { LanguagePicker } from "@/components/LanguagePicker";
import { describeConnectError } from "@/components/ConnectButton";
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
  const { t: translate } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-3 left-3 z-[60] max-w-md">
      {open ? (
        <div className="rounded-xl border border-danger/50 bg-surface p-3 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <strong className="font-cozy text-sm text-danger">{translate("Lỗi phát hiện (gửi kèm ảnh này khi báo bug)")}</strong>
            <button className="text-xs font-bold text-ink-soft" onClick={onClose}>{translate("Đóng")}</button>
          </div>
          <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-ink">{err}</pre>
        </div>
      ) : (
        <button
          className="rounded-full border border-danger/50 bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger shadow-card"
          onClick={() => setOpen(true)}
        >
          {translate("⚠ Có lỗi — bấm xem chi tiết")}
        </button>
      )}
    </div>
  );
}

/** Màn chọn khi chưa kết nối ví: tách bạch rõ "dữ liệu mẫu" và "ví thật"
 *  để ngườ mới không đọc nhầm số demo thành tài sản của mình. */
function LandingGate({ onTryDemo }: { onTryDemo: () => void }) {
  const { t: translate } = useLanguage();
  const { connect, connectors, isPending } = useConnect();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
      <div className="absolute end-4 top-4"><LanguagePicker /></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Savient" className="h-20 w-20 rounded-2xl shadow-card" draggable={false} />
      <h1 className="mt-4 font-cozy text-4xl font-extrabold text-ink">Savient</h1>
      <p className="mt-1 text-sm font-bold tracking-wide text-ink-soft">Saving · Convenient · Consistent</p>
      <p className="mt-3 max-w-sm text-sm font-semibold text-ink-soft">
        {translate("Tiết kiệm gamified trên Avalanche Fuji — gửi đủ mỗi kỳ, nhà 3D mọc tầng, streak càng dài thưởng càng lớn. Rút gốc luôn đủ 100%.")}
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <button
          data-testid="try-demo"
          className="btn-primary w-full text-lg active:translate-y-[2px]"
          onClick={onTryDemo}
        >
          {translate("Xem bản thử (dữ liệu mẫu)")}
        </button>
        <button
          data-testid="connect-cta"
          className="btn-secondary w-full"
          disabled={isPending}
          onClick={() => {
            setErr(null);
            const connector = connectors[0];
            if (!connector) {
              setErr("Không tìm thấy ví — hãy cài Core hoặc MetaMask rồi tải lại trang.");
              return;
            }
            connect({ connector }, { onError: (error) => setErr(describeConnectError(error)) });
          }}
        >
          {isPending ? translate("Đang mở ví…") : translate("Kết nối ví Avalanche Fuji")}
        </button>
      </div>
      {err && <p role="alert" className="mt-3 max-w-sm text-xs font-bold text-danger">{translate(err)}</p>}
      <p className="mt-4 text-[11px] font-semibold text-ink-muted">
        {translate("Bản thử = số liệu mô phỏng, không phải số dư thật · Mạng Fuji (testnet) — không dùng tiền thật.")}
      </p>
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

  const showDemo = demoForced === true;
  // Chưa kết nối và chưa ép demo → màn chọn, không tự đưa vào dashboard mô phỏng.
  if (!isConnected && !showDemo) {
    return (
      <div className="min-h-screen">
        <LandingGate onTryDemo={() => setDemoForced(true)} />
        {err && <GlobalErrorBadge err={err} onClose={clear} />}
      </div>
    );
  }

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
