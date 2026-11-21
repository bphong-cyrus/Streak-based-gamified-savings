"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { targetChainId, fuji } from "@/lib/config";

/** Identify the wallet message so it can be displayed in the selected language. */
export function describeConnectError(e: unknown): string {
  const name = (e as { name?: string })?.name ?? "";
  const msg = (e as { message?: string })?.message ?? "";
  if (
    name.includes("UserRejectedRequestError") ||
    name.includes("ResourceUnavailableError") ||
    /user rejected|request rejected|already processing/i.test(msg)
  ) {
    return "Bạn đã từ chối (hoặc đang mở một yêu cầu kết nối khác) trong ví. Kiểm tra popup MetaMask rồi bấm lại.";
  }
  if (/ConnectorNotFoundError|ProviderNotFoundError/.test(name) || /connector not found|provider not found/i.test(msg)) {
    return "Chưa phát hiện ví trong trình duyệt. Cài MetaMask (hoặc mở khóa ví) rồi tải lại trang.";
  }
  return "Không kết nối được ví. Kiểm tra ví rồi thử lại.";
}

export function ConnectButton() {
  const { t: translate } = useLanguage();
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  // Ngắt kết nối là hành động dễ bấm nhầm — yêu cầu bấm 2 lần (lần 2 xác nhận), tự huỷ sau 3 giây.
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isConnected) {
    const connector = connectors[0];
    return (
      <div className="relative">
        <button
          className="btn-primary !h-9 !px-3.5 !py-1.5 text-sm"
          disabled={isPending}
          onClick={() => {
            if (!connector) {
              setNotice("Không tìm thấy connector ví — tải lại trang thử lại.");
              return;
            }
            setNotice(null);
            connect(
              { connector },
              { onError: (e) => setNotice(describeConnectError(e)) },
            );
          }}
        >
          {isPending ? translate("Đang kết nối…") : translate("Kết nối ví")}
        </button>
        {notice && (
          <div
            role="alert"
            className="absolute end-0 top-full z-50 mt-2 w-72 rounded-xl border border-danger/40 bg-surface p-3 text-xs font-semibold leading-relaxed text-danger shadow-card"
          >
            {translate(notice)}
            <div className="mt-2 flex gap-3">
              <button className="font-bold text-ink underline" onClick={() => setNotice(null)}>
                {translate("Đóng")}
              </button>
              {!globalThis.window?.ethereum && (
                <a
                  className="font-bold text-cta underline"
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {translate("Cài MetaMask")}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const wrongChain = chainId !== undefined && chainId !== targetChainId;

  if (wrongChain) {
    return (
      <button className="btn-primary !h-9 !px-3.5 !py-1.5 text-sm" onClick={() => switchChain({ chainId: targetChainId })}>
        {translate("Chuyển {0}", [fuji.name])}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-lg border border-border bg-surface px-2.5 py-1.5 font-mono text-xs font-bold text-ink-soft sm:inline">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <button
        data-testid="disconnect-btn"
        className={`btn-secondary !h-9 !px-3 !py-1.5 text-xs ${confirming ? "!border-danger/60 !bg-danger/10 text-danger" : ""}`}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            return;
          }
          setConfirming(false);
          disconnect();
        }}
      >
        {confirming ? translate("Chắc chắn ngắt?") : translate("Ngắt")}
      </button>
    </div>
  );
}
