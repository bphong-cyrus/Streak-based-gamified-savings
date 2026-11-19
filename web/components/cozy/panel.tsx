"use client";

import { useState, type ReactNode } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { mockUSDCAbi } from "@/lib/abis";
import { Icon, type IconName } from "@/components/cozy/icons";

export function FeatureCard({
  icon,
  title,
  desc,
  badge,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  icon: IconName;
  title: string;
  desc?: string;
  badge?: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const head = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-sunken text-ink-soft shadow-card">
          <Icon name={icon} size={22} />
        </span>
        <div>
          <h3 className="font-cozy text-lg font-bold leading-tight text-ink">{title}</h3>
          {desc && <p className="text-[11px] font-semibold text-ink-soft">{desc}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {badge && (
          <span className="rounded-full border border-border bg-surface-sunken px-2 py-0.5 font-cozy text-[10px] font-extrabold text-ink-soft">
            {badge}
          </span>
        )}
        {collapsible && <Icon name="chevron" size={18} className={`chevron-rotate text-ink-muted ${open ? "open" : ""}`} />}
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <div className="card p-4">
        {head}
        <div className="mt-3">{children}</div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <button type="button" className="block w-full text-left" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {head}
      </button>
      <div className={`section-body ${open ? "open" : ""}`}>
        <div>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string | undefined; tone?: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{label}</div>
      {value === undefined ? (
        <div className="mx-auto mt-0.5 h-5 w-12 animate-pulse rounded bg-surface-sunken" />
      ) : (
        <div className={`mt-0.5 font-cozy text-lg font-extrabold leading-tight tabular-nums ${tone ?? "text-ink"}`}>{value}</div>
      )}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="text-xs font-bold text-ink-muted">{children}</div>;
}

export function ActionRow({ children }: { children: ReactNode }) {
  return <div className="flex items-stretch gap-2">{children}</div>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TxCall = { label: string; call: any };

export function useTokenAllowance(spender: `0x${string}` | undefined) {
  const { address } = useAccount();
  const { data } = useReadContracts({
    contracts: address && spender ? [{ address: contracts.token, abi: mockUSDCAbi, functionName: "allowance", args: [address, spender] }] : [],
    query: { refetchInterval: 10_000, enabled: !!address && !!spender },
  });
  return (data?.[0]?.result as bigint | undefined) ?? 0n;
}

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
