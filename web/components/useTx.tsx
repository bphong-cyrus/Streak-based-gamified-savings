"use client";

import { useCallback, useState } from "react";
import { useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { BaseError } from "viem";
import { wagmiConfig, explorerTx } from "@/lib/config";

export interface TxState {
  step: string | null;
  hash: string | null;
  error: string | null;
}

/** Gói writeContractAsync + chờ receipt, trả về trạng thái để hiển thị. */
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<TxState>({ step: null, hash: null, error: null });

  const run = useCallback(
    async (label: string, calls: Array<{ label: string; call: Parameters<typeof writeContractAsync>[0] }>) => {
      setState({ step: null, hash: null, error: null });
      try {
        for (const c of calls) {
          setState((s) => ({ ...s, step: c.label }));
          const hash = await writeContractAsync(c.call);
          setState((s) => ({ ...s, hash }));
          await waitForTransactionReceipt(wagmiConfig, { hash, chainId: wagmiConfig.chains[0].id });
        }
        setState({ step: null, hash: null, error: null });
        return true;
      } catch (e) {
        const err = e as BaseError;
        const msg =
          err.name === "UserRejectedRequestError" || err.message.includes("User denied")
            ? "Bạn đã từ chối ký giao dịch."
            : (err.shortMessage ?? err.message);
        setState({ step: null, hash: null, error: `${label}: ${msg}` });
        return false;
      }
    },
    [writeContractAsync],
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
