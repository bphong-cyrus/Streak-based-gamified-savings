"use client";

import { useState } from "react";
import { contracts } from "@/lib/config";
import { mockUSDCAbi, streakVaultAbi } from "@/lib/abis";
import { parseAmount, fmt } from "@/lib/format";
import { useTx, TxFeedback } from "@/components/useTx";
import { Icon } from "@/components/cozy/icons";
import type { VaultData } from "@/lib/useVaultData";

interface Props {
  data: VaultData;
  open: boolean;
  onClose: () => void;
  /** gọi sau khi gửi thành công để chạy animation xây tầng */
  onDeposited: () => void;
}

/** Bottom sheet gửi / rút gốc, tự approve khi thiếu allowance. */
export function DepositSheet({ data, open, onClose, onDeposited }: Props) {
  const { run, step, hash, error } = useTx();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const { account, allowance, tokenBalance } = data;

  if (!open) return null;
  const busy = step !== null;

  async function submit() {
    const amt = parseAmount(amount);
    if (!amt) return;
    if (mode === "deposit") {
      const calls: Parameters<typeof run>[1] = [];
      if ((allowance ?? 0n) < amt) {
        calls.push({
          label: "Đang cấp quyền mUSDC…",
          call: { address: contracts.token, abi: mockUSDCAbi, functionName: "approve", args: [contracts.vault, amt] },
        });
      }
      calls.push({
        label: "Đang gửi tiết kiệm…",
        call: { address: contracts.vault, abi: streakVaultAbi, functionName: "deposit", args: [amt] },
      });
      const ok = await run("Gửi tiết kiệm", calls);
      if (ok) {
        setAmount("");
        onDeposited();
        onClose();
      }
    } else {
      const ok = await run("Rút gốc", [
        {
          label: "Đang rút về ví…",
          call: { address: contracts.vault, abi: streakVaultAbi, functionName: "withdraw", args: [amt] },
        },
      ]);
      if (ok) {
        setAmount("");
        onClose();
      }
    }
  }

  const target = account?.currentTarget ?? 0n;
  const progress = account?.currentProgress ?? 0n;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa-800/50" onClick={busy ? undefined : onClose}>
      <div className="w-full max-w-md rounded-t-3xl border-[3px] border-b-0 border-cocoa-700/70 bg-cream-50 p-5 pb-8 shadow-chunky" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-cocoa-500/30" />

        <div className="mb-4 flex gap-2">
          <button
            className={`flex-1 rounded-xl border-[3px] py-2 font-cozy font-bold transition ${mode === "deposit" ? "border-cocoa-700/80 bg-leaf-400 text-white shadow-chunkySm" : "border-cream-300 bg-white text-cocoa-500"}`}
            onClick={() => setMode("deposit")}
          >
            <span className="inline-flex items-center gap-1.5"><Icon name="wallet" size={16} /> Gửi tuần này</span>
          </button>
          <button
            className={`flex-1 rounded-xl border-[3px] py-2 font-cozy font-bold transition ${mode === "withdraw" ? "border-cocoa-700/80 bg-blush-400 text-white shadow-chunkySm" : "border-cream-300 bg-white text-cocoa-500"}`}
            onClick={() => setMode("withdraw")}
          >
            <span className="inline-flex items-center gap-1.5"><Icon name="hatch" size={16} /> Rút gốc</span>
          </button>
        </div>

        {mode === "deposit" ? (
          <p className="mb-3 text-sm font-semibold text-cocoa-500">
            Gửi đủ mục tiêu trước hạn chót để +1 tầng và giữ streak. Tiến độ kỳ này:{" "}
            <span className="text-cocoa-700">
              {fmt(progress)} / {fmt(target)} mUSDC
            </span>
          </p>
        ) : (
          <p className="mb-3 text-sm font-semibold text-cocoa-500">
            Gốc luôn thuộc về bạn, rút bất cứ lúc nào. Gốc khả dụng:{" "}
            <span className="text-cocoa-700">{fmt(account?.principal)} mUSDC</span>
          </p>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              className="input-cozy w-full pr-16"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cocoa-500">mUSDC</span>
          </div>
          <button
            className="btn-cream shrink-0 !px-3"
            disabled={busy}
            onClick={() => setAmount(mode === "deposit" ? fmt(tokenBalance, 6).replace(/\s/g, "") : fmt(account?.principal, 6).replace(/\s/g, ""))}
          >
            Tối đa
          </button>
        </div>

        <div className="mt-2 text-xs font-semibold text-cocoa-500">
          {mode === "deposit" ? `Ví bạn có ${fmt(tokenBalance, 2)} mUSDC` : "Rút trong kỳ sẽ trừ tiến độ tuần này"}
        </div>

        <button className="btn-cozy mt-4 w-full" disabled={busy || !parseAmount(amount)} onClick={submit}>
          {mode === "deposit" ? <span className="inline-flex items-center gap-1.5"><Icon name="hammer" size={17} /> Gửi & xây tầng</span> : "Rút về ví"}
        </button>

        <TxFeedback state={{ step, hash, error }} />
      </div>
    </div>
  );
}
