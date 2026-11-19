"use client";

import type { ReactNode } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { mockUSDCAbi } from "@/lib/abis";
import { Icon, type IconName } from "@/components/cozy/icons";

/** Card khung chuẩn cho một tính năng: icon + tiêu đề + mô tả + nội dung. */
export function FeatureCard({
  icon,
  title,
  desc,
  badge,
  children,
}: {
  icon: IconName;
  title: string;
  desc?: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div className="card-cream p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-cocoa-700/40 bg-white/80 text-cocoa-600 shadow-chunkySm">
            <Icon name={icon} size={22} />
          </span>
          <div>
            <h3 className="font-cozy text-lg font-bold leading-tight">{title}</h3>
            {desc && <p className="text-[11px] font-semibold text-cocoa-500">{desc}</p>}
          </div>
        </div>
        {badge && (
          <span className="shrink-0 rounded-full border-2 border-cocoa-700/30 bg-white/80 px-2 py-0.5 font-cozy text-[10px] font-extrabold text-cocoa-600">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Ô chỉ số nhỏ trong lưới thống kê của panel. */
export function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border-2 border-cream-300 bg-white/80 p-2 text-center">
      <div className="text-[10px] font-bold uppercase text-cocoa-500">{label}</div>
      <div className={`font-cozy text-sm font-extrabold ${tone ?? "text-cocoa-700"}`}>{value}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TxCall = { label: string; call: any };

/** allowance mUSDC của ví hiện tại cho một contract (để tự approve khi thiếu). */
export function useTokenAllowance(spender: `0x${string}` | undefined) {
  const { address } = useAccount();
  const { data } = useReadContracts({
    contracts:
      address && spender
        ? [{ address: contracts.token, abi: mockUSDCAbi, functionName: "allowance", args: [address, spender] }]
        : [],
    query: { refetchInterval: 10_000, enabled: !!address && !!spender },
  });
  return (data?.[0]?.result as bigint | undefined) ?? 0n;
}

/** Chèn bước approve mUSDC vào đầu chuỗi tx nếu allowance chưa đủ. */
export function withTokenApprove(
  calls: TxCall[],
  spender: `0x${string}` | undefined,
  amount: bigint,
  allowance: bigint,
): TxCall[] {
  if (!spender || allowance >= amount) return calls;
  return [
    {
      label: "Đang cấp quyền mUSDC…",
      call: { address: contracts.token, abi: mockUSDCAbi, functionName: "approve", args: [spender, amount] },
    },
    ...calls,
  ];
}
