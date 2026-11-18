"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { streakVaultAbi } from "@/lib/abis";
import { fmt, shortAddr } from "@/lib/format";
import { IdentityAvatar, identityOf } from "@/lib/identity";
import type { VaultData } from "@/lib/useVaultData";

const FLOOR_COLORS = ["#ffd9a8", "#ffc9d4", "#c9bdf5", "#bfe8c9", "#fde9a9", "#bfe3f2"];

/** Tab Nhóm: tòa nhà chung — mỗi thành viên chiếm một tầng, cùng giữ nhịp gửi tiền. */
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

  const totalSaved = members.reduce((s, m) => s + m.principal, 0n);
  const totalStreak = members.reduce((s, m) => s + m.streak, 0n);

  return (
    <div className="space-y-3 px-4 pb-28 pt-2">
      {/* tổng quan nhóm */}
      <div className="card-cream p-4">
        <h3 className="font-cozy text-lg font-bold">🏢 Tòa nhà chung</h3>
        <p className="mt-0.5 text-xs font-semibold text-cocoa-500">
          {members.length} cư dân · tiền của từng ngườii vẫn thuộc về họ, nhóm chỉ để cùng nhau giữ nhịp gửi đều.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border-2 border-cream-300 bg-white/80 p-2">
            <div className="text-[10px] font-bold uppercase text-cocoa-500">Tổng tích lũy</div>
            <div className="font-cozy text-sm font-extrabold text-cocoa-700">{fmt(totalSaved)}</div>
          </div>
          <div className="rounded-xl border-2 border-cream-300 bg-white/80 p-2">
            <div className="text-[10px] font-bold uppercase text-cocoa-500">Tổng chuỗi</div>
            <div className="font-cozy text-sm font-extrabold text-blush-500">🔥 {totalStreak.toString()}</div>
          </div>
          <div className="rounded-xl border-2 border-cream-300 bg-white/80 p-2">
            <div className="text-[10px] font-bold uppercase text-cocoa-500">Cư dân</div>
            <div className="font-cozy text-sm font-extrabold text-cocoa-700">{members.length}</div>
          </div>
        </div>
      </div>

      {/* tòa nhà: mỗi thành viên một tầng */}
      <div className="card-cream p-4">
        <h4 className="mb-2 font-cozy font-bold">🐈 Các tầng trong nhà</h4>
        {members.length === 0 ? (
          <p className="text-sm font-semibold text-cocoa-500">Chưa có cư dân nào. Hãy là ngườii đầu tiên!</p>
        ) : (
          <div className="flex flex-col-reverse gap-1.5">
            {members.map((m, idx) => {
              const identity = identityOf(m.address);
              const isMe = m.address === data.address;
              return (
                <div
                  key={m.address}
                  className="relative flex items-center gap-3 rounded-xl border-2 px-3 py-2"
                  style={{
                    background: FLOOR_COLORS[idx % FLOOR_COLORS.length],
                    borderColor: "rgba(70,56,39,0.6)",
                    boxShadow: "inset 0 3px 0 rgba(255,255,255,0.35), 0 2px 0 rgba(70,56,39,0.25)",
                  }}
                >
                  <IdentityAvatar address={m.address} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-cozy text-sm font-bold text-cocoa-700">
                      {isMe ? "Bạn" : identity.name} · {shortAddr(m.address)}
                    </div>
                    <div className="text-xs font-semibold text-cocoa-600">
                      Tầng {idx + 1} · đã gửi {fmt(m.principal)} mUSDC · {identity.vi}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-cozy text-sm font-extrabold text-blush-500">🔥 {m.streak.toString()}</div>
                    <div className="text-[10px] font-bold uppercase text-cocoa-500">tuần</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card-cream border-dashed p-4 text-center">
        <div className="text-2xl">🚧</div>
        <p className="mt-1 text-xs font-semibold text-cocoa-500">
          Nhắc hạn cho bạn bè, tặng Streak Freeze và thử thách nhóm đang trong lộ trình — sắp ra mắt.
        </p>
      </div>
    </div>
  );
}
