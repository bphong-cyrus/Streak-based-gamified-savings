"use client";

import { useCallback, useState } from "react";
import { useWriteContract, useSwitchChain, useChainId } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { BaseError } from "viem";
import { wagmiConfig, targetChainId, fuji, explorerTx } from "@/lib/config";
import { sfx } from "@/lib/sound";

export interface TxState {
  step: string | null;
  hash: string | null;
  error: string | null;
}

export interface TxLogEntry {
  label: string;
  hash: string;
  at: number;
}

/** Nhật ký giao dịch thành công gần đây — lưu localStorage, hiển thị ở tab Tôi. */
export function readTxLog(): TxLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("cozy-txlog") ?? "[]") as TxLogEntry[];
  } catch {
    return [];
  }
}

function pushTxLog(entry: TxLogEntry) {
  const log = [entry, ...readTxLog()].slice(0, 8);
  localStorage.setItem("cozy-txlog", JSON.stringify(log));
  window.dispatchEvent(new Event("cozy-txlog"));
}

/** Gói writeContractAsync + chờ receipt, trả về trạng thái để hiển thị. Tự chuyển chain nếu ví đang sai mạng. */
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const currentChainId = useChainId();
  const [state, setState] = useState<TxState>({ step: null, hash: null, error: null });

  const run = useCallback(
    async (label: string, calls: Array<{ label: string; call: Parameters<typeof writeContractAsync>[0] }>) => {
      setState({ step: null, hash: null, error: null });
      try {
        // Ép đúng mạng trước khi gửi — tránh lỗi "Unsupported Network" của MetaMask
        if (currentChainId !== targetChainId) {
          setState((s) => ({ ...s, step: "Đang chuyển sang Avalanche Fuji…" }));
          await switchChainAsync({ chainId: targetChainId, ...fuji });
        }
        for (const c of calls) {
          setState((s) => ({ ...s, step: c.label }));
          const hash = await writeContractAsync(c.call);
          setState((s) => ({ ...s, hash }));
          await waitForTransactionReceipt(wagmiConfig, {
            hash,
            chainId: fuji.id,
            timeout: 90_000,
            retryCount: 5,
            retryDelay: 2_000,
          });
          pushTxLog({ label: c.label, hash, at: Date.now() });
        }
        setState({ step: null, hash: null, error: null });
        sfx.success();
        return true;
      } catch (e) {
        const err = e as BaseError;
        const raw = err.message ?? "";
        const msg =
          err.name === "UserRejectedRequestError" || raw.includes("User denied")
            ? "Bạn đã từ chối ký giao dịch."
            : raw.includes("HTTP request failed")
              ? "Kết nối RPC Fuji bị gián đoạn — thử lại sau vài giây (giao dịch có thể đã thực hiện, kiểm tra Snowtrace trước khi gửi lại)."
              : (err.shortMessage ?? err.message);
        setState({ step: null, hash: null, error: `${label}: ${msg}` });
        sfx.error();
        return false;
      }
    },
    [writeContractAsync, switchChainAsync, currentChainId],
  );

  return { run, ...state };
}

export function TxFeedback({ state }: { state: TxState }) {
  if (!state.step && !state.error) return null;
  return (
    <div
      className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
        state.error ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-mint-500/40 bg-mint-500/10 text-mint-400"
      }`}
    >
      {state.error ?? (
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-mint-400 border-t-transparent" />
          {state.step}…
        </span>
      )}
      {state.hash && !state.error && (
        <a
          className="mt-1 block truncate text-xs underline opacity-80"
          href={explorerTx(state.hash)}
          target="_blank"
          rel="noreferrer"
        >
          Xem giao dịch: {state.hash}
        </a>
      )}
    </div>
  );
}
