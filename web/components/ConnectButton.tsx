"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId } from "wagmi";
import { targetChainId, fuji } from "@/lib/config";

/** Giải mã lỗi kết nối ví thành thông báo tiếng Việt gọn gàng —
 *  tuyệt đối không để ngườ dùng bấm nút mà không có phản hồi gì. */
function describeConnectError(e: unknown): string {
  const name = (e as { name?: string })?.name ?? "";
  const msg = (e as { message?: string })?.message ?? "";
  if (
    name.includes("UserRejectedRequestError") ||
    name.includes("ResourceUnavailableError") ||
    /user rejected|request rejected|already processing/i.test(msg)
  ) {
    return "Bạn đã từ chối (hoặc đang mở một yêu cầu kết nối khác) trong ví. Kiểm tra popup MetaMask rồi bấm lại.";
  }
  if (name.includes("ConnectorNotFoundError") || /connector not found/i.test(msg)) {
    return "Chưa phát hiện ví trong trình duyệt. Cài MetaMask (hoặc mở khóa ví) rồi tải lại trang.";
  }
  return `Không kết nối được ví${msg ? `: ${msg.slice(0, 120)}` : "."}`;
}

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
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
          {isPending ? "Đang kết nối…" : "Kết nối ví"}
        </button>
        {notice && (
          <div
            role="alert"
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-danger/40 bg-surface p-3 text-xs font-semibold leading-relaxed text-danger shadow-card"
          >
            {notice}
            <div className="mt-2 flex gap-3">
              <button className="font-bold text-ink underline" onClick={() => setNotice(null)}>
                Đóng
              </button>
              {!globalThis.window?.ethereum && (
                <a
                  className="font-bold text-cta underline"
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Cài MetaMask
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const wrongChain = chainId !== targetChainId;

  if (wrongChain) {
    return (
      <button className="btn-primary !h-9 !px-3.5 !py-1.5 text-sm" onClick={() => switchChain({ chainId: targetChainId })}>
        Chuyển {fuji.name}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-lg border border-border bg-surface px-2.5 py-1.5 font-mono text-xs font-bold text-ink-soft sm:inline">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <button className="btn-secondary !h-9 !px-3 !py-1.5 text-xs" onClick={() => disconnect()}>
        Ngắt
      </button>
    </div>
  );
}
