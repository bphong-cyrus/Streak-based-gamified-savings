"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { contracts } from "@/lib/config";
import { mockUSDCAbi, streakVaultAbi } from "@/lib/abis";
import { useTx, TxFeedback } from "@/components/useTx";
import { fmt, type VaultData } from "@/components/Dashboard";

function parseAmount(raw: string): bigint | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed || Number.isNaN(Number(trimmed))) return null;
  try {
    return parseUnits(trimmed, 6);
  } catch {
    return null;
  }
}

export function SaveActions({ data }: { data: VaultData }) {
  const { run, step, hash, error } = useTx();
  const [targetInput, setTargetInput] = useState("");
  const [depositInput, setDepositInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const { account, allowance } = data;

  async function setTarget() {
    const amount = parseAmount(targetInput);
    if (!amount || amount <= 0n) return;
    const ok = await run("Đặt mục tiêu", [
      {
        label: "Đặt mục tiêu tuần",
        call: {
          address: contracts.vault,
          abi: streakVaultAbi,
          functionName: "setWeeklyTarget",
          args: [amount],
        },
      },
    ]);
    if (ok) setTargetInput("");
  }

  async function deposit() {
    const amount = parseAmount(depositInput);
    if (!amount || amount <= 0n) return;
    const calls: Parameters<typeof run>[1] = [];
    if ((allowance ?? 0n) < amount) {
      calls.push({
        label: "Cấp quyền sử dụng mUSDC (approve)",
        call: { address: contracts.token, abi: mockUSDCAbi, functionName: "approve", args: [contracts.vault, amount] },
      });
    }
    calls.push({
      label: "Gửi tiết kiệm",
      call: { address: contracts.vault, abi: streakVaultAbi, functionName: "deposit", args: [amount] },
    });
    const ok = await run("Gửi tiết kiệm", calls);
    if (ok) setDepositInput("");
  }

  async function withdraw() {
    const amount = parseAmount(withdrawInput);
    if (!amount || amount <= 0n) return;
    const ok = await run("Rút gốc", [
      {
        label: "Rút gốc về ví",
        call: { address: contracts.vault, abi: streakVaultAbi, functionName: "withdraw", args: [amount] },
      },
    ]);
    if (ok) setWithdrawInput("");
  }

  const busy = step !== null;
  const maxWithdraw = account?.principal ?? 0n;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {/* Đặt mục tiêu */}
      <div className="card">
        <h3 className="mb-1 font-semibold">🎯 Mục tiêu tuần</h3>
        <p className="mb-3 text-xs text-slate-400">
          {account?.activated
            ? "Thay đổi áp dụng từ kỳ kế tiếp."
            : "Lần đầu đặt sẽ có hiệu lực ngay kỳ hiện tại."}
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            inputMode="decimal"
            placeholder="VD: 5"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
          />
          <button className="btn-primary shrink-0" disabled={busy || !targetInput} onClick={setTarget}>
            Đặt
          </button>
        </div>
        {account?.currentTarget !== undefined && account.currentTarget > 0n && (
          <p className="mt-2 text-xs text-slate-400">Hiện tại: {fmt(account.currentTarget)} mUSDC / tuần</p>
        )}
      </div>

      {/* Gửi tiền */}
      <div className="card">
        <h3 className="mb-1 font-semibold">💰 Gửi tiết kiệm</h3>
        <p className="mb-3 text-xs text-slate-400">
          Số tiền gửi tính vào tiến độ kỳ này. Cần approve nếu là lần gửi đầu.
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            inputMode="decimal"
            placeholder="VD: 5"
            value={depositInput}
            onChange={(e) => setDepositInput(e.target.value)}
          />
          <button className="btn-primary shrink-0" disabled={busy || !depositInput} onClick={deposit}>
            Gửi
          </button>
        </div>
        <button
          className="mt-2 text-xs text-flame-400 underline disabled:opacity-40"
          disabled={busy}
          onClick={() => depositInput && setDepositInput(String(Number(depositInput.replace(",", "."))))}
        >
          {data.tokenBalance !== undefined && `Ví bạn có ${fmt(data.tokenBalance)} mUSDC`}
        </button>
      </div>

      {/* Rút tiền */}
      <div className="card">
        <h3 className="mb-1 font-semibold">🏧 Rút gốc</h3>
        <p className="mb-3 text-xs text-slate-400">
          Gốc luôn của bạn, rút bất cứ lúc nào không mất streak đã chốt. Rút trong kỳ sẽ trừ tiến độ kỳ.
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            inputMode="decimal"
            placeholder="VD: 5"
            value={withdrawInput}
            onChange={(e) => setWithdrawInput(e.target.value)}
          />
          <button
            className="btn-ghost shrink-0"
            disabled={busy || !withdrawInput}
            onClick={() => {
              setWithdrawInput(fmt(maxWithdraw, 6).replace(/\s/g, ""));
            }}
          >
            Tối đa
          </button>
          <button className="btn-primary shrink-0" disabled={busy || !withdrawInput} onClick={withdraw}>
            Rút
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">Gốc khả dụng: {fmt(maxWithdraw)} mUSDC</p>
      </div>

      <div className="sm:col-span-3">
        <TxFeedback state={{ step, hash, error }} />
      </div>
    </div>
  );
}
