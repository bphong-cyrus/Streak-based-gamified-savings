"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { mockUSDCAbi, streakVaultAbi, yieldDistributorAbi, mockYieldSourceAbi } from "@/lib/abis";

export interface AccountView {
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
  depositCount?: bigint;
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
  if (diff <= 0) return "Hết hạn";
  const s = Math.floor(diff / 1000);
  const pad = (x: number) => String(x).padStart(2, "0");
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} ngày ${pad(h)}:${pad(m)}`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
  return `${pad(m)}:${pad(s % 60)}`;
}

/** Mọi dữ liệu on-chain dashboard cần, fetch theo nhóm và tự refetch. */
export function useVaultData() {
  const { address } = useAccount();

  const base = useReadContracts({
    contracts: [
      { address: contracts.vault, abi: streakVaultAbi, functionName: "startAt" },
      { address: contracts.vault, abi: streakVaultAbi, functionName: "epochDuration" },
      { address: contracts.vault, abi: streakVaultAbi, functionName: "hasStarted" },
      { address: contracts.vault, abi: streakVaultAbi, functionName: "getParticipants" },
      { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "nextEpochToFinalize" },
      { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "canFinalize" },
      { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "rollover" },
      { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "totalClaimable" },
    ],
    query: { refetchInterval: 10_000 },
  });

  const wallet = useReadContracts({
    contracts: address
      ? [
          { address: contracts.vault, abi: streakVaultAbi, functionName: "getAccount", args: [address] },
          { address: contracts.token, abi: mockUSDCAbi, functionName: "balanceOf", args: [address] },
          { address: contracts.token, abi: mockUSDCAbi, functionName: "allowance", args: [address, contracts.vault] },
          { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "claimableYield", args: [address] },
          { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "claimedYield", args: [address] },
        ]
      : [],
    query: { refetchInterval: 5_000, enabled: !!address },
  });

  const startAt = base.data?.[0]?.result as bigint | undefined;
  const epochDuration = base.data?.[1]?.result as bigint | undefined;
  const hasStarted = base.data?.[2]?.result as boolean | undefined;
  const account = wallet.data?.[0]?.result as AccountView | undefined;

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
    participants: (base.data?.[3]?.result as string[] | undefined) ?? [],
    nextEpochToFinalize: base.data?.[4]?.result as bigint | undefined,
    canFinalize: base.data?.[5]?.result as boolean | undefined,
    rollover: base.data?.[6]?.result as bigint | undefined,
    totalClaimable: base.data?.[7]?.result as bigint | undefined,
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
