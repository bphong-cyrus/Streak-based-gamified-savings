"use client";

import { useState, type ReactNode } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { mockUSDCAbi } from "@/lib/abis";
import { Icon, type IconName } from "@/components/cozy/icons";

/** Card khung chuẩn cho một tính năng: icon + tiêu đề + mô tả + nội dung.
 *  collapsible (mặc định false): header thành nút toggle, body thu gọn —
 *  áp dụng Hick's Law để giảm số lựa chọn hiển thị cùng lúc trên màn hình. */
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
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-cocoa-700/40 bg-white/80 text-cocoa-600 shadow-chunkySm">
          <Icon name={icon} size={22} />
        </span>
        <div>
          <h3 className="font-cozy text-lg font-bold leading-tight">{title}</h3>
          {desc && <p className="text-[11px] font-semibold text-cocoa-500">{desc}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {badge && (
          <span className="rounded-full border-2 border-cocoa-700/30 bg-white/80 px-2 py-0.5 font-cozy text-[10px] font-extrabold text-cocoa-600">
            {badge}
          </span>
        )}
        {collapsible && (
          <Icon name="chevron" size={18} className={`chevron-rotate text-cocoa-500 ${open ? "open" : ""}`} />
        )}
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <div className="card-cream p-4">
        {head}
        <div className="mt-3">{children}</div>
      </div>
    );
  }

  return (
    <div className="card-cream p-4">
      <button
        type="button"
        className="block w-full text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
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

/** Ô chỉ số tối giản kiểu fintech: label nhỏ + số lớn, không khung. */
export function Stat({ label, value, tone }: { label: string; value: string | undefined; tone?: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-bold uppercase tracking-wide text-cocoa-500/90">{label}</div>
      {value === undefined ? (
        <div className="skeleton mx-auto mt-1.5 h-5 w-3/4" aria-hidden />
      ) : (
        <div className={`mt-0.5 font-cozy text-lg font-extrabold leading-tight ${tone ?? "text-cocoa-700"}`}>{value}</div>
      )}
    </div>
  );
}

/** Nhãn nhỏ phân cấp cho từng dòng thao tác — tránh cảm giác "đống form". */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="text-xs font-bold text-cocoa-500">{children}</div>;
}

/** Dòng thao tác chuẩn: input co giãn + nút cố định, không bao giờ bị bóp méo. */
export function ActionRow({ children }: { children: ReactNode }) {
  return <div className="flex items-stretch gap-2">{children}</div>;
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
