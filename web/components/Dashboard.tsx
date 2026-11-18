"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { mockUSDCAbi, streakVaultAbi, yieldDistributorAbi, mockYieldSourceAbi } from "@/lib/abis";

export function fmt(amount: bigint | undefined, digits = 2): string {
  if (amount === undefined) return "—";
  const n = Number(formatUnits(amount, 6));
  return n.toLocaleString("vi-VN", { maximumFractionDigits: digits });
}

function useCountdown(targetSec: bigint | undefined): string {
  const target = targetSec ? Number(targetSec) * 1000 : undefined;
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return "—";
  const diff = target - Date.now();
  if (diff <= 0) return "Đã hết hạn";
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const pad = (x: number) => String(x).padStart(2, "0");
  if (d > 0) return `${d} ngày ${pad(h % 24)}:${pad(m % 60)}:${pad(s % 60)}`;
  if (h > 0) return `${pad(h)}:${pad(m % 60)}:${pad(s % 60)}`;
  return `${pad(m % 60)}:${pad(s % 60)}`;
}

export function useVaultData() {
  const { address } = useAccount();

  const base = useReadContracts({
    contracts: [
      { address: contracts.vault, abi: streakVaultAbi, functionName: "startAt" },
      { address: contracts.vault, abi: streakVaultAbi, functionName: "epochDuration" },
      { address: contracts.vault, abi: streakVaultAbi, functionName: "hasStarted" },
      { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "nextEpochToFinalize" },
      { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "canFinalize" },
      { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "rollover" },
      {
        address: contracts.distributor,
        abi: yieldDistributorAbi,
        functionName: "getEpochSummary",
        args: [BigInt(0)],
      },
    ],
    query: { refetchInterval: 10_000 },
  });

  const wallet = useReadContracts({
    contracts: address
      ? [
          { address: contracts.vault, abi: streakVaultAbi, functionName: "getAccount", args: [address] },
          { address: contracts.token, abi: mockUSDCAbi, functionName: "balanceOf", args: [address] },
          { address: contracts.token, abi: mockUSDCAbi, functionName: "allowance", args: [address, contracts.vault] },
          {
            address: contracts.distributor,
            abi: yieldDistributorAbi,
            functionName: "claimableYield",
            args: [address],
          },
          { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "claimedYield", args: [address] },
        ]
      : [],
    query: { refetchInterval: 5_000, enabled: !!address },
  });

  const startAt = base.data?.[0]?.result as bigint | undefined;
  const epochDuration = base.data?.[1]?.result as bigint | undefined;
  const hasStarted = base.data?.[2]?.result as boolean | undefined;
  const account = wallet.data?.[0]?.result as
    | {
        principal: bigint;
        currentTarget: bigint;
        pendingTarget: bigint;
        pendingTargetEpoch: bigint;
        streak: bigint;
        activated: boolean;
        activationEpoch: bigint;
        currentEpoch: bigint;
        currentDeposited: bigint;
        currentWithdrawn: bigint;
        currentProgress: bigint;
      }
    | undefined;

  const currentEpochLocal = useMemo(() => {
    if (startAt === undefined || epochDuration === undefined) return undefined;
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (now < startAt) return 0n;
    return (now - startAt) / epochDuration;
  }, [startAt, epochDuration, account?.currentEpoch]);

  const budget = useReadContracts({
    contracts:
      currentEpochLocal !== undefined
        ? [
            {
              address: contracts.yieldSource,
              abi: mockYieldSourceAbi,
              functionName: "budgetOf",
              args: [currentEpochLocal],
            },
          ]
        : [],
    query: { refetchInterval: 10_000, enabled: currentEpochLocal !== undefined },
  });

  const epochEnd =
    startAt !== undefined && epochDuration !== undefined && account !== undefined
      ? startAt + (account.currentEpoch + 1n) * epochDuration
      : undefined;

  const countdown = useCountdown(hasStarted ? epochEnd : startAt);

  return {
    address,
    startAt,
    epochDuration,
    hasStarted,
    nextEpochToFinalize: base.data?.[3]?.result as bigint | undefined,
    canFinalize: base.data?.[4]?.result as boolean | undefined,
    rollover: base.data?.[5]?.result as bigint | undefined,
    account,
    tokenBalance: wallet.data?.[1]?.result as bigint | undefined,
    allowance: wallet.data?.[2]?.result as bigint | undefined,
    claimable: wallet.data?.[3]?.result as bigint | undefined,
    claimed: wallet.data?.[4]?.result as bigint | undefined,
    currentBudget: budget.data?.[0]?.result as bigint | undefined,
    countdown,
  };
}

export type VaultData = ReturnType<typeof useVaultData>;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-50">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Dashboard({ data }: { data: VaultData }) {
  const { account, hasStarted, countdown, claimable, claimed, tokenBalance, currentBudget, rollover } = data;

  if (hasStarted === false) {
    return (
      <div className="card text-center">
        <div className="text-lg font-semibold">Chưa đến giờ mở kỳ đầu tiên</div>
        <p className="mt-1 text-sm text-slate-400">Vault mở sau {countdown}. Hãy quay lại sớm nhé!</p>
      </div>
    );
  }
  if (!account) return null;

  const target = account.currentTarget;
  const progress = account.currentProgress;
  const pct = target > 0n ? Math.min(100, Number((progress * 100n) / target)) : 0;
  const done = target > 0n && progress >= target;

  return (
    <div className="space-y-4">
      {/* Streak hero */}
      <div className="card relative overflow-hidden">
        <div className="absolute -right-6 -top-8 text-[120px] opacity-15">🔥</div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Streak hiện tại</div>
            <div className="bg-gradient-to-r from-flame-400 to-flame-600 bg-clip-text text-6xl font-extrabold text-transparent">
              {account.streak.toString()}
            </div>
            <div className="text-sm text-slate-400">tuần liên tiếp đạt mục tiêu</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-400">Hạn chót kỳ này</div>
            <div className="font-mono text-lg font-semibold text-slate-100">{countdown}</div>
          </div>
        </div>

        {/* Progress kỳ hiện tại */}
        <div className="mt-5">
          <div className="mb-1 flex justify-between text-sm">
            <span>
              Tiến độ kỳ #{account.currentEpoch.toString()}
              {account.pendingTarget > 0n && (
                <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-300">
                  Kỳ #{account.pendingTargetEpoch.toString()}: mục tiêu {fmt(account.pendingTarget)} mUSDC
                </span>
              )}
            </span>
            <span className={done ? "font-semibold text-mint-400" : "text-slate-300"}>
              {fmt(progress)} / {target > 0n ? fmt(target) : "—"} mUSDC {done && "✓"}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-ink-800">
            <div
              className={`h-full rounded-full transition-all ${done ? "bg-mint-500" : "bg-gradient-to-r from-flame-500 to-flame-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {target === 0n && account.activated && (
            <p className="mt-2 text-xs text-slate-400">
              Bạn chưa có mục tiêu cho kỳ này — đặt mục tiêu bên dưới để bắt đầu streak mới.
            </p>
          )}
          {account.currentWithdrawn > 0n && (
            <p className="mt-2 text-xs text-amber-300/80">
              Đã rút {fmt(account.currentWithdrawn)} mUSDC trong kỳ này, tiến độ tính theo số tiền gửi trừ rút.
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Gốc của bạn" value={`${fmt(account.principal)} mUSDC`} sub="Rút được bất cứ lúc nào" />
        <Stat label="Ví của bạn" value={`${fmt(tokenBalance)} mUSDC`} sub="Số dư mUSDC khả dụng" />
        <Stat label="Thưởng chờ nhận" value={`${fmt(claimable)} mUSDC`} sub={`Đã nhận: ${fmt(claimed)} mUSDC`} />
        <Stat
          label="Ngân sách thưởng kỳ này"
          value={`${fmt(currentBudget)} mUSDC`}
          sub={rollover !== undefined && rollover > 0n ? `Rollover từ kỳ trước: ${fmt(rollover)}` : "Chia theo trọng số streak"}
        />
        <Stat
          label="Mục tiêu tuần"
          value={target > 0n ? `${fmt(target)} mUSDC` : "—"}
          sub={account.pendingTarget > 0n ? `Từ kỳ #${account.pendingTargetEpoch}: ${fmt(account.pendingTarget)}` : "Chưa đổi"}
        />
        <Stat
          label="Kỳ đang mở"
          value={`#${account.currentEpoch.toString()}`}
          sub={account.activated ? `Kích hoạt từ kỳ #${account.activationEpoch.toString()}` : "Chưa tham gia"}
        />
      </div>
    </div>
  );
}
