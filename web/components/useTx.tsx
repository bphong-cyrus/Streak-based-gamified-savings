"use client";

import { useCallback, useState } from "react";
import { useWriteContract, useSwitchChain, useChainId } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { BaseError } from "viem";
import { wagmiConfig, targetChainId, fuji, explorerTx } from "@/lib/config";
import { sfx } from "@/lib/sound";
import { isDemoMode } from "@/lib/demo";

export interface TxState {
  step: string | null;
  hash: string | null;
  error: string | null;
  /** Thông báo mô phỏng khi đang ở chế độ demo (không phải lỗi). */
  info?: string | null;
  /** Vị trí bước hiện tại / tổng số bước (1-based) cho tx stepper. */
  stepIndex?: number;
  stepTotal?: number;
}

export interface TxLogEntry {
  label: string;
  hash: string;
  at: number;
}

/** Nhật ký giao dịch thành công gần đây — lưu localStorage, hiển thị ở tab Hồ sơ. */
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

/** Gói writeContractAsync + chờ receipt, trả về trạng thái stepper để hiển thị. Tự chuyển chain nếu ví đang sai mạng. */
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const currentChainId = useChainId();
  const [state, setState] = useState<TxState>({ step: null, hash: null, error: null });

  const run = useCallback(
    async (label: string, calls: Array<{ label: string; call: Parameters<typeof writeContractAsync>[0] }>) => {
      setState({ step: null, hash: null, error: null });
      if (isDemoMode()) {
        setState({ step: null, hash: null, error: null, info: "Chế độ demo — giao dịch chỉ mô phỏng. Kết nối ví để thực hiện thật." });
        return false;
      }
      try {
        if (currentChainId !== targetChainId) {
          setState((s) => ({ ...s, step: "Đang chuyển sang Avalanche Fuji…" }));
          await switchChainAsync({ chainId: targetChainId, ...fuji });
        }
        for (let i = 0; i < calls.length; i++) {
          const c = calls[i];
          setState((s) => ({ ...s, step: c.label, stepIndex: i + 1, stepTotal: calls.length }));
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
        sfx.error();
        const err = e as BaseError;
        const raw = err.message ?? "";
        const msg =
          err.name === "UserRejectedRequestError" || raw.includes("User denied")
            ? "Bạn đã từ chối ký giao dịch."
            : raw.includes("HTTP request failed")
              ? "Kết nối RPC Fuji bị gián đoạn — thử lại sau vài giây (giao dịch có thể đã thực hiện, kiểm tra Snowtrace trước khi gửi lại)."
              : (err.shortMessage ?? err.message);
        setState({ step: null, hash: null, error: `${label}: ${msg}` });
        return false;
      }
    },
    [writeContractAsync, switchChainAsync, currentChainId],
  );

  return { run, ...state };
}

/** Stepper trạng thái giao dịch: Approve (bước 1/n) -> ... -> Success kèm link Snowtrace. */
export function TxFeedback({ state }: { state: TxState }) {
  if (state.info && !state.step && !state.error) {
    return (
      <div role="status" aria-live="polite" className="mt-3 rounded-xl border border-cocoa-700/20 bg-white/70 px-3 py-2 text-sm font-semibold text-cocoa-600">
        {state.info}
      </div>
    );
  }
  if (!state.step && !state.error) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-3 rounded-xl border px-3 py-2.5 text-sm ${
        state.error ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-leaf-500/40 bg-leaf-500/10 text-cocoa-700"
      }`}
    >
      {state.error ?? (
        <div className="flex items-center gap-2.5">
          <span className="flex flex-col items-center gap-0.5">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-leaf-500 border-t-transparent" />
          </span>
          <div>
            {state.stepTotal && state.stepTotal > 1 ? (
              <div className="font-cozy text-xs font-extrabold uppercase tracking-wide text-leaf-600">
                Bước {state.stepIndex}/{state.stepTotal}
              </div>
            ) : null}
            <div className="font-semibold">{state.step}…</div>
          </div>
        </div>
      )}
      {state.hash && !state.error && (
        <a
          className="mt-1 block truncate text-xs font-bold underline opacity-80"
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
