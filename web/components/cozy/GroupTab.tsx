"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { streakVaultAbi } from "@/lib/abis";
import { fmt, shortAddr } from "@/lib/format";
import { mascotOf } from "@/components/cozy/Building";
import type { VaultData } from "@/lib/useVaultData";

/** Tab Group: danh sách ngưởi tham gia pool + streak từng ngườii. */
export function GroupTab({ data }: { data: VaultData }) {
  const participants = data.participants;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls: any[] = useMemo(
    () =>
      participants.slice(0, 20).flatMap((p) => [
        { address: contracts.vault, abi: streakVaultAbi, functionName: "getAccount", args: [p] },
      ]),
    [participants],
  );

  const { data: memberData } = useReadContracts({
    contracts: calls,
    query: { refetchInterval: 10_000, enabled: calls.length > 0 },
  });

  const members = useMemo(
    () =>
      participants.slice(0, 20).map((p, i) => {
        const acc = memberData?.[i]?.result as { principal: bigint; streak: bigint } | undefined;
        return { address: p, principal: acc?.principal ?? 0n, streak: acc?.streak ?? 0n };
      }),
    [participants, memberData],
  );

  return (
    <div className="space-y-3 px-4 pb-28 pt-2">
      <div className="card-cream p-4">
        <h3 className="font-cozy text-lg font-bold">👥 Cùng tiết kiệm</h3>
        <p className="mt-0.5 text-xs font-semibold text-cocoa-500">
          {participants.length}/20 ngườii đang xây nhà trong pool này. Tiền gốc và lãi luôn thuộc về từng cá nhân —
          nhóm chỉ để cùng nhau giữ nhịp.
        </p>
      </div>

      <div className="card-cream p-4">
        <h4 className="mb-2 font-cozy font-bold">🏘️ Hàng xóm của bạn</h4>
        {members.length === 0 ? (
          <p className="text-sm font-semibold text-cocoa-500">Chưa có ai tham gia. Hãy là ngườii đầu tiên!</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.address} className="flex items-center gap-3 rounded-xl border-2 border-cream-300 bg-white/80 px-3 py-2">
                <span className="text-2xl">{mascotOf(m.address)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-cozy text-sm font-bold text-cocoa-700">
                    {m.address === data.address ? "Bạn" : shortAddr(m.address)}
                  </div>
                  <div className="text-xs font-semibold text-cocoa-500">Đã tiết kiệm {fmt(m.principal)} mUSDC</div>
                </div>
                <div className="text-right">
                  <div className="font-cozy text-sm font-extrabold text-blush-500">🔥 {m.streak.toString()}</div>
                  <div className="text-[10px] font-bold uppercase text-cocoa-500">tuần</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-cream border-dashed p-4 text-center">
        <div className="text-2xl">🚧</div>
        <p className="mt-1 text-xs font-semibold text-cocoa-500">
          Group challenge, tặng Streak Freeze và nhắc hạn cho bạn bè đang trong lộ trình — sắp ra mắt.
        </p>
      </div>
    </div>
  );
}
