"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts, isConfigured } from "@/lib/config";
import { streakVaultAbi, streakGroupsAbi, freezeGiftAbi, mentorHubAbi } from "@/lib/abis";
import { fmt, shortAddr } from "@/lib/format";
import { IdentityAvatar, identityOf } from "@/lib/identity";
import { TxFeedback, useTx } from "@/components/useTx";
import { FeatureCard, Stat } from "@/components/cozy/panel";
import type { VaultData } from "@/lib/useVaultData";

const FLOOR_COLORS = ["#ffd9a8", "#ffc9d4", "#c9bdf5", "#bfe8c9", "#fde9a9", "#bfe3f2"];

/** Tab Nhóm: tòa nhà chung + nhóm bạn bè on-chain (StreakGroups) + tặng Streak Freeze. */
export function GroupTab({ data }: { data: VaultData }) {
  const participants = data.participants;
  const { address } = useAccount();
  const groupsLive = isConfigured(contracts.groups);
  const giftLive = isConfigured(contracts.freezeGift);

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
          {members.length} cư dân · tiền của từng ngườ vẫn thuộc về họ, nhóm chỉ để cùng nhau giữ nhịp gửi đều.
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
          <p className="text-sm font-semibold text-cocoa-500">Chưa có cư dân nào. Hãy là ngườ đầu tiên!</p>
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
                  {giftLive && address && m.address !== address && (
                    <div className="flex shrink-0 flex-col gap-1">
                      <FreezeGiftButton to={m.address} />
                      <InsuranceGiftButton to={m.address} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {giftLive && (
          <p className="mt-2 text-[11px] font-semibold text-cocoa-500">
            ❄️ Nút bên cạnh là tặng Streak Freeze kỳ này cho cư dân (phí bạn trả thay).
          </p>
        )}
      </div>

      <MentorHubCard />

      {groupsLive ? (
        <GroupsPanel />
      ) : (
        <div className="card-cream border-dashed p-4 text-center">
          <div className="text-2xl">🚧</div>
          <p className="mt-1 text-xs font-semibold text-cocoa-500">
            Nhóm bạn bè on-chain chưa được cấu hình cho chain này.
          </p>
        </div>
      )}
    </div>
  );
}

/** Nút tặng freeze kỳ hiện tại cho một ví (FreezeGift). */
function FreezeGiftButton({ to }: { to: string }) {
  const tx = useTx();
  async function gift() {
    await tx.run("Tặng Streak Freeze", [
      {
        label: `Đang tặng freeze cho ${shortAddr(to)}…`,
        call: {
          address: contracts.freezeGift,
          abi: freezeGiftAbi,
          functionName: "giftFreeze",
          args: [to as `0x${string}`],
        },
      },
    ]);
  }
  return (
    <div className="shrink-0">
      <button
        className="w-full rounded-xl border-2 border-sky-400/60 bg-sky-200/60 px-2 py-1 text-xs font-extrabold text-sky-700 active:translate-y-0.5"
        disabled={tx.step !== null}
        title="Tặng Streak Freeze kỳ này"
        onClick={gift}
      >
        {tx.step ? "…" : "❄️ Tặng freeze"}
      </button>
      <TxFeedback state={{ step: tx.step, hash: tx.hash, error: tx.error }} />
    </div>
  );
}

/** Nút tặng insurance kỳ hiện tại cho một ví (FreezeGift.giftInsurance). */
function InsuranceGiftButton({ to }: { to: string }) {
  const tx = useTx();
  async function gift() {
    await tx.run("Tặng Streak Insurance", [
      {
        label: `Đang tặng insurance cho ${shortAddr(to)}…`,
        call: {
          address: contracts.freezeGift,
          abi: freezeGiftAbi,
          functionName: "giftInsurance",
          args: [to as `0x${string}`],
        },
      },
    ]);
  }
  return (
    <div className="shrink-0">
      <button
        className="w-full rounded-xl border-2 border-lavender-400/60 bg-lavender-300/50 px-2 py-1 text-xs font-extrabold text-lavender-500 active:translate-y-0.5"
        disabled={tx.step !== null}
        title="Tặng Streak Insurance kỳ này"
        onClick={gift}
      >
        {tx.step ? "…" : "🛡️ Tặng insurance"}
      </button>
      <TxFeedback state={{ step: tx.step, hash: tx.hash, error: tx.error }} />
    </div>
  );
}

/** Panel nhóm bạn bè on-chain: tạo nhóm / tham gia bằng mã mờ / xem tiến độ thành viên. */
function GroupsPanel() {
  const { address } = useAccount();
  const createTx = useTx();
  const joinTx = useTx();
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [joinId, setJoinId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [viewId, setViewId] = useState<bigint | null>(null);

  async function createGroup() {
    if (!name || !invite) return;
    const ok = await createTx.run("Tạo nhóm", [
      {
        label: "Đang tạo nhóm on-chain…",
        call: {
          address: contracts.groups,
          abi: streakGroupsAbi,
          functionName: "createGroup",
          args: [name, invite],
        },
      },
    ]);
    if (ok) {
      setName("");
      setInvite("");
    }
  }

  async function joinGroup() {
    if (!joinId || !joinCode) return;
    const id = BigInt(joinId);
    const ok = await joinTx.run("Tham gia nhóm", [
      {
        label: `Đang tham gia nhóm #${joinId}…`,
        call: {
          address: contracts.groups,
          abi: streakGroupsAbi,
          functionName: "joinGroup",
          args: [id, joinCode],
        },
      },
    ]);
    if (ok) setViewId(id);
  }

  return (
    <div className="card-cream p-4">
      <h4 className="font-cozy font-bold">🫂 Nhóm bạn bè (on-chain)</h4>
      <p className="mt-0.5 text-xs font-semibold text-cocoa-500">
        Tạo nhóm bằng mã mờ, rủ bạn vào, cùng theo dõi ai đạt mục tiêu tuần này. Streak nhóm = số kỳ liên tiếp cả
        nhóm đều đạt.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <div className="flex gap-2">
          <input
            className="input-cozy flex-1"
            placeholder="Tên nhóm (VD: Lớp 12A)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input-cozy w-24"
            placeholder="Mã mờ"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
          />
          <button
            className="btn-cozy shrink-0"
            disabled={!address || !name || !invite || createTx.step !== null}
            onClick={createGroup}
          >
            Tạo
          </button>
        </div>
        <TxFeedback state={{ step: createTx.step, hash: createTx.hash, error: createTx.error }} />

        <div className="flex gap-2">
          <input
            className="input-cozy w-24"
            inputMode="numeric"
            placeholder="ID nhóm"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
          />
          <input
            className="input-cozy flex-1"
            placeholder="Mã mờ"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button
            className="btn-cozy shrink-0"
            disabled={!address || !joinId || !joinCode || joinTx.step !== null}
            onClick={joinGroup}
          >
            Tham gia
          </button>
        </div>
        <TxFeedback state={{ step: joinTx.step, hash: joinTx.hash, error: joinTx.error }} />

        <div className="flex gap-2">
          <input
            className="input-cozy flex-1"
            inputMode="numeric"
            placeholder="Xem nhóm theo ID…"
            value={viewId !== null ? viewId.toString() : ""}
            onChange={(e) => setViewId(e.target.value ? BigInt(e.target.value) : null)}
          />
        </div>
      </div>

      {viewId !== null && <GroupView groupId={viewId} />}
    </div>
  );
}

function GroupView({ groupId }: { groupId: bigint }) {
  const { data } = useReadContracts({
    contracts: [
      { address: contracts.groups, abi: streakGroupsAbi, functionName: "getGroup", args: [groupId] },
      { address: contracts.groups, abi: streakGroupsAbi, functionName: "groupStreak", args: [groupId] },
      { address: contracts.groups, abi: streakGroupsAbi, functionName: "memberProgress", args: [groupId] },
    ],
    query: { refetchInterval: 10_000 },
  });

  const g = data?.[0]?.result as
    | { id: bigint; name: string; creator: string; createdAtEpoch: bigint; members: string[] }
    | undefined;
  const groupStreak = (data?.[1]?.result as bigint | undefined) ?? 0n;
  const progress = data?.[2]?.result as
    | { members: string[]; progresses: bigint[]; targets: bigint[] }
    | undefined;

  if (!g || g.id === 0n)
    return <p className="mt-3 text-xs font-semibold text-cocoa-500">Không tìm thấy nhóm #{groupId.toString()}.</p>;

  return (
    <div className="mt-3 rounded-xl border-2 border-leaf-500/40 bg-white/70 p-3">
      <div className="flex items-center justify-between">
        <div className="font-cozy font-bold text-cocoa-700">
          {g.name} <span className="text-xs text-cocoa-500">#{g.id.toString()}</span>
        </div>
        <div className="font-cozy text-sm font-extrabold text-blush-500">🔥 nhóm {groupStreak.toString()} kỳ</div>
      </div>
      <ul className="mt-2 space-y-1.5">
        {g.members.map((m, i) => {
          const p = progress?.progresses?.[i] ?? 0n;
          const t = progress?.targets?.[i] ?? 0n;
          const done = t > 0n && p >= t;
          return (
            <li key={m} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-cocoa-600">{shortAddr(m)}</span>
              <span className={done ? "font-bold text-leaf-600" : "font-semibold text-cocoa-500"}>
                {done ? "✅ đạt" : `${fmt(p)}/${fmt(t)} mUSDC`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** MentorHub: chọn mentor một lần duy nhất, báo cáo mốc streak để mentor nhận thưởng. */
function MentorHubCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.mentorHub);
  const [mentorAddr, setMentorAddr] = useState("");

  const state = useReadContracts({
    contracts: live && address
      ? [
          { address: contracts.mentorHub, abi: mentorHubAbi, functionName: "mentorOf", args: [address] },
          { address: contracts.mentorHub, abi: mentorHubAbi, functionName: "menteeCount", args: [address] },
          { address: contracts.mentorHub, abi: mentorHubAbi, functionName: "milestonesEarned", args: [address] },
          { address: contracts.mentorHub, abi: mentorHubAbi, functionName: "earnings", args: [address] },
          { address: contracts.mentorHub, abi: mentorHubAbi, functionName: "prizePool", args: [] },
        ]
      : [],
    query: { refetchInterval: 15_000, enabled: live && !!address },
  });
  const myMentor = (state.data?.[0]?.result as string | undefined) ?? "0x0000000000000000000000000000000000000000";
  const mentees = (state.data?.[1]?.result as bigint | undefined) ?? 0n;
  const milestones = (state.data?.[2]?.result as bigint | undefined) ?? 0n;
  const earnings = (state.data?.[3]?.result as bigint | undefined) ?? 0n;
  const pool = (state.data?.[4]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function call(fn: string, args: (string | bigint)[], label: string) {
    const ok = await tx.run(label, [{ label, call: { address: contracts.mentorHub, abi: mentorHubAbi, functionName: fn, args } }]);
    if (ok && fn === "setMentor") setMentorAddr("");
  }

  return (
    <FeatureCard icon="grad" title="Mentor tiết kiệm" desc="Gắn mentor một lần duy nhất — mỗi mốc streak bạn đạt, mentor nhận thưởng từ quỹ">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Mentor của bạn" value={myMentor === "0x0000000000000000000000000000000000000000" ? "Chưa có" : shortAddr(myMentor)} tone="text-lavender-500" />
        <Stat label="Học trò của bạn" value={mentees.toString()} />
        <Stat label="Quỹ thưởng" value={fmt(pool)} tone="text-leaf-600" />
      </div>
      {mentees > 0n && (
        <p className="mt-2 text-[11px] font-semibold text-cocoa-500">
          Bạn là mentor: {milestones.toString()} mốc học trò đạt · thu nhập chờ nhận {fmt(earnings)} mUSDC
        </p>
      )}
      {myMentor === "0x0000000000000000000000000000000000000000" ? (
        <div className="mt-2 flex gap-2">
          <input
            className="input-cozy flex-1 font-mono text-xs"
            placeholder="Địa chỉ mentor của bạn"
            value={mentorAddr}
            onChange={(e) => setMentorAddr(e.target.value)}
          />
          <button className="btn-cozy shrink-0" disabled={tx.step !== null || !mentorAddr || !address} onClick={() => call("setMentor", [mentorAddr as `0x${string}`], "Đang gắn mentor…")}>
            Gắn
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button className="btn-cream flex-1" disabled={tx.step !== null} onClick={() => call("reportMilestone", [], "Đang báo mốc streak cho mentor…")}>
            Báo mốc streak
          </button>
          <button className="btn-cozy flex-1" disabled={tx.step !== null || earnings === 0n} onClick={() => call("claimEarnings", [], "Đang nhận thu nhập mentor…")}>
            Nhận {fmt(earnings)}
          </button>
        </div>
      )}
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}
