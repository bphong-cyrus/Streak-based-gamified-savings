"use client";

import { formatUnits } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { gemsAbi, missionsAbi, gemShopAbi } from "@/lib/abis";

export interface MissionView {
  id: bigint;
  kind: number; // 0 WeeklyTarget, 1 StreakMilestone, 2 DepositCount, 3 TotalSaved
  param: bigint;
  gemReward: bigint;
  recurring: boolean;
  active: boolean;
  canClaim: boolean;
}

export const MISSION_KINDS: Record<number, { icon: string; label: (param: bigint) => string }> = {
  0: { icon: "🎯", label: () => "Gửi đủ mục tiêu tuần này" },
  1: { icon: "🔥", label: (p) => `Đạt streak ${p.toString()} tuần` },
  2: { icon: "📥", label: (p) => `Gửi tiết kiệm ${p.toString()} lần` },
  3: { icon: "🏦", label: (p) => `Gốc từ ${Number(formatUnits(p, 6)).toLocaleString("vi-VN")} mUSDC` },
};

/** Catalog mặc định khớp với seed trong DeployAll.s.sol. Giá đọc on-chain. */
export const THEMES = [
  { id: 1, name: "Hiện đại", icon: "🏢" },
  { id: 2, name: "Fantasy", icon: "🏰" },
  { id: 3, name: "Nhật Bản", icon: "⛩️" },
  { id: 4, name: "Đồng quê", icon: "🌻" },
];

export const DECORS = [
  { id: 1, name: "Đèn bàn", icon: "💡" },
  { id: 2, name: "Kệ sách", icon: "📚" },
  { id: 3, name: "Ghế sofa", icon: "🛋️" },
  { id: 4, name: "Cây lớn", icon: "🪴" },
  { id: 5, name: "Tranh treo", icon: "🖼️" },
  { id: 6, name: "Mèo cưng", icon: "🐈" },
];

export interface ShopItemView {
  id: number;
  name: string;
  icon: string;
  price: bigint; // 0 = chưa bán
  owned: boolean;
}

/** Dữ liệu vòng tiền tệ trong game: số dư Gems, danh sách nhiệm vụ, catalog shop. */
export function useGemsData({ enabled = true }: { enabled?: boolean } = {}) {
  const { address } = useAccount();

  const balance = useReadContracts({
    contracts: address
      ? [
          { address: contracts.gems, abi: gemsAbi, functionName: "balanceOf", args: [address] },
          { address: contracts.gems, abi: gemsAbi, functionName: "allowance", args: [address, contracts.gemShop] },
        ]
      : [],
    query: { refetchInterval: 5_000, enabled: enabled && !!address, refetchOnWindowFocus: false },
  });

  const count = useReadContract_count({ enabled });
  const n = count !== undefined ? Number(count) : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const missionCalls: any[] = [];
  for (let i = 0; i < n; i++) {
    missionCalls.push({ address: contracts.missions, abi: missionsAbi, functionName: "missions", args: [BigInt(i)] });
    if (address) {
      missionCalls.push({
        address: contracts.missions,
        abi: missionsAbi,
        functionName: "canClaim",
        args: [BigInt(i), address],
      });
    }
  }

  const missionData = useReadContracts({
    contracts: missionCalls,
    query: { refetchInterval: 8_000, enabled: enabled && missionCalls.length > 0, refetchOnWindowFocus: false },
  });

  const missions: MissionView[] = [];
  for (let i = 0; i < n; i++) {
    const m = missionData.data?.[i * (address ? 2 : 1)]?.result as
      | { kind: number; param: bigint; gemReward: bigint; recurring: boolean; active: boolean }
      | undefined;
    if (!m) continue;
    missions.push({
      id: BigInt(i),
      kind: m.kind,
      param: m.param,
      gemReward: m.gemReward,
      recurring: m.recurring,
      active: m.active,
      canClaim: address ? ((missionData.data?.[i * 2 + 1]?.result as boolean | undefined) ?? false) : false,
    });
  }

  // catalog shop: giá + sở hữu
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shopCalls: any[] = [];
  for (const t of THEMES) {
    shopCalls.push({ address: contracts.gemShop, abi: gemShopAbi, functionName: "themePrice", args: [BigInt(t.id)] });
    if (address) {
      shopCalls.push({
        address: contracts.gemShop,
        abi: gemShopAbi,
        functionName: "ownedThemes",
        args: [address, BigInt(t.id)],
      });
    }
  }
  for (const d of DECORS) {
    shopCalls.push({ address: contracts.gemShop, abi: gemShopAbi, functionName: "decorPrice", args: [BigInt(d.id)] });
    if (address) {
      shopCalls.push({
        address: contracts.gemShop,
        abi: gemShopAbi,
        functionName: "ownedDecors",
        args: [address, BigInt(d.id)],
      });
    }
  }

  const shopData = useReadContracts({
    contracts: shopCalls,
    query: { refetchInterval: 8_000, enabled: enabled && shopCalls.length > 0, refetchOnWindowFocus: false },
  });

  const step = address ? 2 : 1;
  const themes: ShopItemView[] = THEMES.map((t, i) => ({
    ...t,
    price: (shopData.data?.[i * step]?.result as bigint | undefined) ?? 0n,
    owned: address ? ((shopData.data?.[i * step + 1]?.result as boolean | undefined) ?? false) : false,
  }));
  const decors: ShopItemView[] = DECORS.map((d, i) => ({
    ...d,
    price: (shopData.data?.[(THEMES.length + i) * step]?.result as bigint | undefined) ?? 0n,
    owned: address ? ((shopData.data?.[(THEMES.length + i) * step + 1]?.result as boolean | undefined) ?? false) : false,
  }));

  return {
    address,
    gemsBalance: (balance.data?.[0]?.result as bigint | undefined) ?? 0n,
    gemsAllowance: (balance.data?.[1]?.result as bigint | undefined) ?? 0n,
    missions,
    themes,
    decors,
    missionCount: n,
  };
}

function useReadContract_count({ enabled }: { enabled: boolean }): bigint | undefined {
  const { data } = useReadContracts({
    contracts: [{ address: contracts.missions, abi: missionsAbi, functionName: "missionCount" }],
    query: { refetchInterval: 30_000, enabled, refetchOnWindowFocus: false },
  });
  return data?.[0]?.result as bigint | undefined;
}

export function fmtGems(amount: bigint | undefined): string {
  if (amount === undefined) return "0";
  return Number(formatUnits(amount, 18)).toLocaleString("vi-VN", { maximumFractionDigits: 0 });
}
