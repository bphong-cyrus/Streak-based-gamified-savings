"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { contracts } from "@/lib/config";
import { mockUSDCAbi, streakVaultAbi } from "@/lib/abis";
import { fmt } from "@/lib/format";
import { useTx, TxFeedback } from "@/components/useTx";
import { Icon } from "@/components/cozy/icons";
import type { VaultData } from "@/lib/useVaultData";

interface Props {
  data: VaultData;
  mode: "deposit" | "withdraw" | null;
  onClose: () => void;
  onDeposited: () => void;
}

export function DepositSheet({ data, mode, onClose, onDeposited }: Props) {
  const { run, step, hash, error, info } = useTx();
  const [amount, setAmount] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const { account, allowance, tokenBalance } = data;
  const open = mode !== null;
  const busy = step !== null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setValidation(null);
      lastFocusedRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  useEffect(() => {
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (open) dialogRef.current?.addEventListener("keydown", trap);
    return () => dialogRef.current?.removeEventListener("keydown", trap);
  }, [open]);

  const isDeposit = mode === "deposit";
  const target = account?.currentTarget ?? 0n;
  const progress = account?.currentProgress ?? 0n;
  const remaining = target > progress ? target - progress : 0n;
  const maxBalance = isDeposit ? (tokenBalance ?? 0n) : (account?.principal ?? 0n);

  const parsed = useMemo(() => parseInput(amount), [amount]);

  useEffect(() => {
    if (!parsed && amount) setValidation("Vui lòng nhập số hợp lệ");
    else if (parsed !== null && parsed <= 0n) setValidation("Số tiền phải lớn hơn 0");
    else if (parsed && parsed > maxBalance) setValidation(`Vượt quá số dư khả dụng (${fmt(maxBalance, 6)} mUSDC)`);
    else setValidation(null);
  }, [parsed, amount, maxBalance]);

  async function submit() {
    if (!parsed || parsed <= 0n || parsed > maxBalance) return;
    if (isDeposit) {
      const calls: Parameters<typeof run>[1] = [];
      if ((allowance ?? 0n) < parsed) {
        calls.push({
          label: "Đang cấp quyền mUSDC…",
          call: { address: contracts.token, abi: mockUSDCAbi, functionName: "approve", args: [contracts.vault, parsed] },
        });
      }
      calls.push({
        label: "Đang gửi tiết kiệm…",
        call: { address: contracts.vault, abi: streakVaultAbi, functionName: "deposit", args: [parsed] },
      });
      const ok = await run("Gửi tiết kiệm", calls);
      if (ok) {
        setAmount("");
        onDeposited();
        onClose();
      }
    } else {
      const ok = await run("Rút gốc", [
        { label: "Đang rút về ví…", call: { address: contracts.vault, abi: streakVaultAbi, functionName: "withdraw", args: [parsed] } },
      ]);
      if (ok) {
        setAmount("");
        onClose();
      }
    }
  }

  function fillMax() {
    setAmount(formatUnits(maxBalance, 6));
  }

  function fillRemaining() {
    if (remaining > 0n && remaining <= maxBalance) {
      setAmount(formatUnits(remaining, 6));
    }
  }

  if (!open) return null;

  const panel = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={isDeposit ? "Gửi tiết kiệm" : "Rút gốc"}
      className="w-full rounded-t-2xl border border-border bg-surface p-5 pb-8 shadow-card md:max-w-md md:rounded-2xl md:pb-6"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border md:hidden" />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-cozy text-xl font-bold text-ink">{isDeposit ? "Gửi tiết kiệm" : "Rút gốc"}</h2>
        <button className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunken" onClick={onClose} disabled={busy} aria-label="Đóng">
          <Icon name="x" size={18} />
        </button>
      </div>

      {isDeposit ? (
        <p className="mb-3 text-sm font-semibold text-ink-soft">
          Gửi đủ mục tiêu trước khi kỳ kết thúc — kỳ được chốt sẽ +1 tầng và giữ streak. Tiến độ kỳ này:{" "}
          <span className="text-ink">{fmt(progress)} / {fmt(target)} mUSDC</span>
        </p>
      ) : (
        <p className="mb-3 text-sm font-semibold text-ink-soft">
          Gốc luôn thuộc về bạn, rút bất cứ lúc nào. Gốc khả dụng:{" "}
          <span className="text-ink">{fmt(account?.principal)} mUSDC</span>
        </p>
      )}

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-muted">Số tiền</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            className="input w-full pr-20"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(normalizeInput(e.target.value))}
            disabled={busy}
            aria-describedby="amount-help"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">mUSDC</span>
        </div>
        <button className="btn-secondary shrink-0 !px-3" disabled={busy} onClick={fillMax}>
          Tối đa
        </button>
      </div>

      {isDeposit && remaining > 0n && remaining <= (tokenBalance ?? 0n) && (
        <button className="mt-2 text-xs font-bold text-cta hover:underline" onClick={fillRemaining} disabled={busy}>
          Điền số còn thiếu: {fmt(remaining)} mUSDC
        </button>
      )}

      <div id="amount-help" className="mt-2 text-xs font-semibold text-ink-soft">
        {isDeposit
          ? `Ví bạn có ${fmt(tokenBalance, 2)} mUSDC · nhập số thập phân, tối đa 6 chữ số lẻ`
          : "Rút trong kỳ sẽ trừ tiến độ kỳ này"}
      </div>

      {validation && <div className="mt-2 text-xs font-bold text-danger" role="alert">{validation}</div>}

      <button className="btn-primary mt-5 w-full" disabled={busy || !parsed || parsed <= 0n || parsed > maxBalance} onClick={submit}>
        {isDeposit ? (
          <span className="inline-flex items-center gap-1.5"><Icon name="hammer" size={17} /> Gửi tiền</span>
        ) : (
          "Rút về ví"
        )}
      </button>

      <TxFeedback state={{ step, hash, error, info }} />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm md:items-center"
      onClick={busy ? undefined : onClose}
      role="presentation"
    >
      {panel}
    </div>
  );
}

function normalizeInput(v: string): string {
  let s = v.replace(/\s/g, "").replace(",", ".");
  s = s.replace(/[^0-9.]/g, "");
  const parts = s.split(".");
  if (parts.length > 2) s = `${parts[0]}.${parts.slice(1).join("")}`;
  if (parts[1]?.length > 6) s = `${parts[0]}.${parts[1].slice(0, 6)}`;
  if (s.startsWith(".")) s = `0${s}`;
  return s;
}

function parseInput(raw: string): bigint | null {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!s || Number.isNaN(Number(s))) return null;
  try {
    return parseUnits(s, 6);
  } catch {
    return null;
  }
}
