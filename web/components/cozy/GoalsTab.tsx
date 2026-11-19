"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts, isConfigured } from "@/lib/config";
import { streakVaultAbi, yieldDistributorAbi, autoSaverAbi, mockUSDCAbi, goalTemplatesAbi } from "@/lib/abis";
import { fmt, parseAmount } from "@/lib/format";
import { TxFeedback, useTx } from "@/components/useTx";
import { FeatureCard } from "@/components/cozy/panel";
import { Icon } from "@/components/cozy/icons";
import { estimateApy } from "@/components/cozy/HomeTab";
import type { VaultData } from "@/lib/useVaultData";

const SHOWN_EPOCHS = 8;

/** Tab Mục tiêu: đặt mục tiêu, chi tiết APY, biểu đồ, gửi tự động, nhật ký chuỗi. */
export function GoalsTab({ data }: { data: VaultData }) {
  const { account } = data;
  const { run, step, hash, error } = useTx();
  const [input, setInput] = useState("");

  async function setTarget() {
    const amt = parseAmount(input);
    if (!amt) return;
    const ok = await run("Đặt mục tiêu", [
      {
        label: "Đang lưu mục tiêu…",
        call: { address: contracts.vault, abi: streakVaultAbi, functionName: "setWeeklyTarget", args: [amt] },
      },
    ]);
    if (ok) setInput("");
  }

  const streak = account?.streak ?? 0n;
  const baseApy = 4.8;
  const bonusApy = Math.min(Number(streak) * 0.5, 2.5);
  const totalApy = baseApy + bonusApy;
  const weeklyTarget = account?.currentTarget ?? 0n;
  // lãi ước tính một kỳ cho mức gửi tuần hiện tại
  const weeklyInterest =
    weeklyTarget > 0n ? (Number(weeklyTarget) * (totalApy / 100)) / 52 : 0;

  return (
    <div className="space-y-3 px-4 pb-28 pt-2">
      {/* đặt mục tiêu */}
      <div className="card-cream p-4">
        <h3 className="flex items-center gap-1.5 font-cozy text-lg font-bold"><Icon name="target" size={20} className="text-cocoa-600" /> Mục tiêu tuần</h3>
        <p className="mt-0.5 text-xs font-semibold text-cocoa-500">
          {account?.activated ? "Thay đổi áp dụng từ kỳ kế tiếp." : "Lần đầu đặt có hiệu lực ngay kỳ này."} Hiện tại:{" "}
          {fmt(weeklyTarget)} mUSDC/tuần
        </p>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <input
              className="input-cozy pr-16"
              inputMode="decimal"
              placeholder="VD: 5"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cocoa-500">mUSDC</span>
          </div>
          <button className="btn-cozy shrink-0" disabled={step !== null || !parseAmount(input)} onClick={setTarget}>
            Lưu
          </button>
        </div>
        <TxFeedback state={{ step, hash, error }} />
      </div>

      {/* hiệu suất sinh lợi */}
      <div className="card-cream p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-cozy font-bold">⚡ Hiệu suất sinh lợi</h4>
          <span className="rounded-full bg-leaf-300/50 px-2.5 py-0.5 font-cozy text-xs font-extrabold text-leaf-600">
            {totalApy.toFixed(1)}% APY
          </span>
        </div>
        <div className="mt-2 space-y-2 text-sm font-semibold">
          <div className="flex items-center justify-between rounded-xl border-2 border-cream-300 bg-white/80 px-3 py-2">
            <span className="flex items-center gap-2 text-cocoa-600">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Lãi cơ bản (Base Yield)
            </span>
            <span className="font-cozy font-extrabold text-cocoa-700">{baseApy.toFixed(1)}% APY</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border-2 border-cream-300 bg-white/80 px-3 py-2">
            <span className="flex items-center gap-2 text-cocoa-600">
              <span className="h-2.5 w-2.5 rounded-full bg-blush-400" /> Thưởng duy trì chuỗi (Streak Bonus)
            </span>
            <span className="font-cozy font-extrabold text-blush-500">+{bonusApy.toFixed(1)}% APY</span>
          </div>
          <p className="text-[11px] text-cocoa-500">
            Base: nguồn yield mock tham chiếu USDC Lending. Bonus: +0.5% mỗi tuần giữ chuỗi (tối đa +2.5%) — bạn đang
            có chuỗi {streak.toString()} tuần.
          </p>
        </div>

        {/* biểu đồ biến động APY (mock) */}
        <div className="mt-3 rounded-xl border-2 border-cream-300 bg-white/80 p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-cocoa-500">
            <span>📉 Biến động APY 6 kỳ gần nhất (mock)</span>
            <span className="rounded-full bg-cream-200 px-2 py-0.5">Rất ổn định</span>
          </div>
          <ApyChart />
          <div className="mt-1 flex justify-between text-[10px] font-semibold text-cocoa-500">
            <span>Kỳ trước</span>
            <span className="font-cozy font-extrabold text-leaf-600">Hiện tại: {totalApy.toFixed(1)}%</span>
          </div>
        </div>

        {weeklyTarget > 0n && (
          <div className="mt-2 flex items-center justify-between rounded-xl border-2 border-dashed border-lavender-400 bg-lavender-300/20 px-3 py-2 text-sm font-semibold text-cocoa-600">
            <span>🧮 Gửi {fmt(weeklyTarget)} mUSDC/tuần → lãi kỳ này ước tính</span>
            <span className="font-cozy font-extrabold text-lavender-500">
              +{weeklyInterest >= 0.01 ? weeklyInterest.toFixed(2) : "<0.01"} mUSDC
            </span>
          </div>
        )}
      </div>

      {/* gửi tự động */}
      <AutoSaveCard data={data} />

      <EpochHistory currentEpoch={account?.currentEpoch} />
    </div>
  );
}

/** Biểu đồ đường APY đơn giản bằng SVG. */
function ApyChart() {
  const series = [5.6, 5.9, 5.7, 6.0, 6.3, 6.2];
  const min = 5.4;
  const max = 6.5;
  const W = 280;
  const H = 70;
  const pts = series
    .map((v, i) => `${(i / (series.length - 1)) * W},${H - ((v - min) / (max - min)) * H}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full">
      <polyline points={pts} fill="none" stroke="#4fbe7d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {series.map((v, i) => (
        <circle
          key={i}
          cx={(i / (series.length - 1)) * W}
          cy={H - ((v - min) / (max - min)) * H}
          r="4"
          fill="#fff"
          stroke="#4fbe7d"
          strokeWidth="2.5"
        />
      ))}
    </svg>
  );
}

/** Gửi tự động mỗi kỳ qua contract AutoSaver (có thể tự bấm "Gửi hộ ngay"). */
function AutoSaveCard({ data }: { data: VaultData }) {
  const { address, account } = data;
  const { run, step, hash, error } = useTx();

  const reads = useReadContracts({
    contracts: address
      ? [
          { address: contracts.autoSaver, abi: autoSaverAbi, functionName: "plans", args: [address] },
          { address: contracts.autoSaver, abi: autoSaverAbi, functionName: "executable", args: [address] },
          { address: contracts.token, abi: mockUSDCAbi, functionName: "allowance", args: [address, contracts.autoSaver] },
        ]
      : [],
    query: { refetchInterval: 8_000, enabled: !!address },
  });

  const plan = reads.data?.[0]?.result as
    | { amount: bigint; roundUpTo: bigint; lastExecutedEpoch: bigint; active: boolean }
    | undefined;
  const executable = (reads.data?.[1]?.result as boolean | undefined) ?? false;
  const allowance = (reads.data?.[2]?.result as bigint | undefined) ?? 0n;

  const amount = account?.currentTarget ?? 0n;

  async function enable() {
    if (amount === 0n) return;
    const calls: Parameters<typeof run>[1] = [];
    if (allowance < amount) {
      calls.push({
        label: "Đang cấp quyền tự động gửi…",
        call: { address: contracts.token, abi: mockUSDCAbi, functionName: "approve", args: [contracts.autoSaver, amount * 52n] },
      });
    }
    calls.push({
      label: "Đang bật gửi tự động…",
      call: { address: contracts.autoSaver, abi: autoSaverAbi, functionName: "register", args: [amount, 0n] },
    });
    await run("Bật gửi tự động", calls);
  }

  async function disable() {
    await run("Tắt gửi tự động", [
      {
        label: "Đang tắt…",
        call: { address: contracts.autoSaver, abi: autoSaverAbi, functionName: "deactivate" },
      },
    ]);
  }

  async function executeNow() {
    if (!address) return;
    await run("Gửi hộ ngay", [
      {
        label: "Đang thực hiện khoản gửi…",
        call: { address: contracts.autoSaver, abi: autoSaverAbi, functionName: "execute", args: [address] },
      },
    ]);
  }

  const busy = step !== null;
  const active = plan?.active ?? false;

  return (
    <div className="card-cream p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-cozy font-bold">🔁 Gửi tự động mỗi kỳ</h4>
          <p className="text-xs font-semibold text-cocoa-500">
            {active
              ? `Đang bật: gửi ${fmt(plan?.amount)} mUSDC mỗi kỳ, tự động cộng chuỗi.`
              : "Hệ thống tự gửi đúng mục tiêu mỗi kỳ để bạn không bỏ lỡ tuần nào."}
          </p>
        </div>
        <button
          className={`relative h-8 w-14 shrink-0 rounded-full border-2 border-cocoa-700/50 transition ${active ? "bg-leaf-400" : "bg-cream-300"}`}
          disabled={busy || !address || (!active && amount === 0n)}
          onClick={active ? disable : enable}
          title={active ? "Tắt gửi tự động" : "Bật gửi tự động theo mục tiêu hiện tại"}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${active ? "left-7" : "left-1"}`}
          />
        </button>
      </div>
      {active && (
        <button className="btn-cream mt-2 w-full text-sm" disabled={busy || !executable} onClick={executeNow}>
          {executable ? "⚡ Gửi hộ ngay cho kỳ này" : "Kỳ này đã được gửi"}
        </button>
      )}
      {!active && !address && <p className="mt-2 text-[11px] font-semibold text-cocoa-500">Kết nối ví để bật.</p>}
      <TxFeedback state={{ step, hash, error }} />
    </div>
  );
}

interface EpochRow {
  epoch: bigint;
  target: bigint;
  progress: bigint;
  settled: boolean;
  qualified: boolean;
  streakAtSettle: bigint;
  reward: bigint;
  budget: bigint;
  distributed: bigint;
}

function EpochHistory({ currentEpoch }: { currentEpoch: bigint | undefined }) {
  const { address } = useAccount();

  const epochs = useMemo(() => {
    if (currentEpoch === undefined) return [];
    const from = currentEpoch > BigInt(SHOWN_EPOCHS - 1) ? currentEpoch - BigInt(SHOWN_EPOCHS - 1) : 0n;
    const list: bigint[] = [];
    for (let e = from; e <= currentEpoch; e++) list.push(e);
    return list.reverse();
  }, [currentEpoch]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls: any[] = useMemo(
    () =>
      address && epochs.length > 0
        ? epochs.flatMap((e) => [
            { address: contracts.vault, abi: streakVaultAbi, functionName: "getEpochStatus", args: [address, e] },
            { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "rewardOf", args: [address, e] },
            { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "getEpochSummary", args: [e] },
          ])
        : [],
    [address, epochs],
  );

  const { data } = useReadContracts({
    contracts: calls,
    query: { refetchInterval: 10_000, enabled: calls.length > 0 },
  });

  const rows: EpochRow[] = useMemo(() => {
    if (!data) return [];
    return epochs.map((e, i) => {
      const status = data[i * 3]?.result as
        | { target: bigint; progress: bigint; settled: boolean; qualified: boolean; streakAtSettle: bigint }
        | undefined;
      const reward = (data[i * 3 + 1]?.result as bigint | undefined) ?? 0n;
      const summary = data[i * 3 + 2]?.result as
        | { finalized: boolean; budget: bigint; distributed: bigint }
        | undefined;
      return {
        epoch: e,
        target: status?.target ?? 0n,
        progress: status?.progress ?? 0n,
        settled: status?.settled ?? false,
        qualified: status?.qualified ?? false,
        streakAtSettle: status?.streakAtSettle ?? 0n,
        reward,
        budget: summary?.budget ?? 0n,
        distributed: summary?.distributed ?? 0n,
      };
    });
  }, [data, epochs]);

  if (!address || epochs.length === 0) return null;

  return (
    <div className="card-cream p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-cozy text-lg font-bold">📜 Nhật ký chuỗi & thưởng</h3>
        <span className="text-[11px] font-bold text-cocoa-500">Chi tiết</span>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => {
          const isCurrent = r.epoch === currentEpoch;
          const waiting = !isCurrent && !r.settled;
          return (
            <li
              key={r.epoch.toString()}
              className={`flex items-center justify-between rounded-xl border-2 px-3 py-2 ${
                isCurrent ? "border-leaf-500/60 bg-leaf-300/30" : "border-cream-300 bg-white/70"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{r.settled ? (r.qualified ? "✅" : "💔") : isCurrent ? "🔥" : "⏳"}</span>
                <div>
                  <div className="font-cozy text-sm font-bold text-cocoa-700">
                    Kỳ #{r.epoch.toString()}
                    {isCurrent && <span className="ml-1.5 text-xs text-leaf-600">đang diễn ra</span>}
                    {waiting && <span className="ml-1.5 text-xs text-cocoa-500">chờ chốt</span>}
                  </div>
                  <div className="text-xs font-semibold text-cocoa-500">
                    {r.target > 0n ? (
                      <>
                        {fmt(r.progress)}/{fmt(r.target)} mUSDC
                        {r.settled &&
                          (r.qualified ? ` · chuỗi ${r.streakAtSettle.toString()} 🔥` : " · chuỗi về 0")}
                      </>
                    ) : (
                      "Chưa đặt mục tiêu"
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-cozy text-sm font-extrabold ${r.reward > 0n ? "text-leaf-600" : "text-cocoa-500/60"}`}>
                  {r.settled ? `+${fmt(r.reward)}` : "—"}
                </div>
                {r.settled && (
                  <div className="text-[10px] font-semibold text-cocoa-500">
                    ngân sách {fmt(r.budget)} · chia {fmt(r.distributed)}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* mẫu mục tiêu cộng đồng */}
      <GoalTemplatesCard />
    </div>
  );
}

/** Mẫu mục tiêu cộng đồng: tạo, dùng lại kế hoạch của ngườ khác — tác giả nhận 5 Paws mỗi lượt dùng. */
function GoalTemplatesCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.goalTemplates);
  const [name, setName] = useState("");
  const [weekly, setWeekly] = useState("");
  const [total, setTotal] = useState("");

  const countState = useReadContracts({
    contracts: live ? [{ address: contracts.goalTemplates, abi: goalTemplatesAbi, functionName: "templateCount", args: [] }] : [],
    query: { refetchInterval: 30_000, enabled: live },
  });
  const count = Number((countState.data?.[0]?.result as bigint | undefined) ?? 0n);

  const listState = useReadContracts({
    contracts: live
      ? Array.from({ length: Math.min(count, 8) }, (_, i) => ({
          address: contracts.goalTemplates,
          abi: goalTemplatesAbi,
          functionName: "templates",
          args: [BigInt(i + 1)],
        }))
      : [],
    query: { refetchInterval: 30_000, enabled: live && count > 0 },
  });
  const templates = Array.from({ length: Math.min(count, 8) }, (_, i) => listState.data?.[i]?.result as
    | { id: bigint; author: string; name: string; weeklyTarget: bigint; totalGoal: bigint; useCount: bigint }
    | undefined).filter((t): t is NonNullable<typeof t> => !!t);

  if (!live) return null;

  async function create() {
    const w = parseAmount(weekly);
    const t = parseAmount(total);
    if (!name || !w || !t) return;
    const ok = await tx.run("Tạo mẫu mục tiêu", [
      { label: "Đang lưu mẫu on-chain…", call: { address: contracts.goalTemplates, abi: goalTemplatesAbi, functionName: "createTemplate", args: [name, w, t] } },
    ]);
    if (ok) {
      setName("");
      setWeekly("");
      setTotal("");
    }
  }
  async function use(id: bigint) {
    await tx.run("Dùng mẫu mục tiêu", [
      { label: "Đang áp mẫu vào vault của bạn…", call: { address: contracts.goalTemplates, abi: goalTemplatesAbi, functionName: "useTemplate", args: [id] } },
    ]);
  }

  return (
    <FeatureCard icon="layout" title="Mẫu mục tiêu cộng đồng" desc="Ngườ khác chia kế hoạch, bạn một chạm áp dùng — tác giả được thưởng 5 Paws">
      {templates.length > 0 && (
        <ul className="space-y-1.5">
          {templates.map((t) => (
            <li key={t.id.toString()} className="flex items-center justify-between gap-2 rounded-xl border-2 border-cream-300 bg-white/80 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-cozy text-sm font-bold text-cocoa-700">{t.name}</div>
                <div className="text-[11px] font-semibold text-cocoa-500">
                  {fmt(t.weeklyTarget)}/tuần · tổng {fmt(t.totalGoal)} mUSDC · {t.useCount.toString()} lượt dùng
                </div>
              </div>
              <button className="btn-cozy shrink-0 !px-3 !py-1.5 text-xs" disabled={tx.step !== null || !address} onClick={() => use(t.id)}>
                Dùng
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 grid grid-cols-[1fr_80px_80px_auto] gap-2">
        <input className="input-cozy" placeholder="Tên mẫu" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input-cozy" inputMode="decimal" placeholder="/tuần" value={weekly} onChange={(e) => setWeekly(e.target.value)} />
        <input className="input-cozy" inputMode="decimal" placeholder="Tổng" value={total} onChange={(e) => setTotal(e.target.value)} />
        <button className="btn-cozy shrink-0" disabled={tx.step !== null || !name || !parseAmount(weekly) || !parseAmount(total)} onClick={create}>
          Tạo
        </button>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}
