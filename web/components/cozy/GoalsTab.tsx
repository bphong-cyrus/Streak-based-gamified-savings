"use client";

import { useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { streakVaultAbi, yieldDistributorAbi, savingsGoalAbi } from "@/lib/abis";
import { fmt, parseAmount } from "@/lib/format";
import { TxFeedback, useTx } from "@/components/useTx";
import { FeatureCard, Stat, FieldLabel, ActionRow } from "@/components/cozy/panel";
import { Icon } from "@/components/cozy/icons";
import type { VaultData } from "@/lib/useVaultData";

/** Tab Mục tiêu: đặt mục tiêu tuần (vault), mục tiêu tiết kiệm (SavingsGoal), cơ chế chia thưởng. */
export function GoalsTab({ data }: { data: VaultData }) {
  return (
    <div className="space-y-3 px-4 pb-28 pt-2">
      <WeeklyTargetCard data={data} />
      <SavingsGoalCard data={data} />
      <RewardMechanismCard data={data} />
    </div>
  );
}

/** Đặt mục tiêu tuần — áp dụng từ kỳ kế tiếp. */
function WeeklyTargetCard({ data }: { data: VaultData }) {
  const { account } = data;
  const { run, step, hash, error, info } = useTx();
  const [input, setInput] = useState("");

  async function setTarget() {
    const amt = parseAmount(input);
    if (!amt) return;
    const ok = await run("Đặt mục tiêu", [
      { label: "Đang lưu mục tiêu…", call: { address: contracts.vault, abi: streakVaultAbi, functionName: "setWeeklyTarget", args: [amt] } },
    ]);
    if (ok) setInput("");
  }

  return (
    <div className="card-cream p-4">
      <h3 className="flex items-center gap-1.5 font-cozy text-lg font-bold">
        <Icon name="target" size={20} className="text-cocoa-600" /> Mục tiêu tuần
      </h3>
      <p className="mt-0.5 text-xs font-semibold text-cocoa-500">
        {account?.activated ? "Thay đổi áp dụng từ kỳ kế tiếp." : "Lần đầu đặt có hiệu lực ngay kỳ này."} Hiện tại:{" "}
        {fmt(account?.currentTarget ?? 0n)} mUSDC/tuần
      </p>
      <ActionRow>
        <div className="relative mt-2 flex-1">
          <input
            className="input-cozy w-full pr-16"
            inputMode="decimal"
            placeholder="VD: 5"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cocoa-500">mUSDC</span>
        </div>
        <button className="btn-cozy mt-2 shrink-0" disabled={step !== null || !parseAmount(input)} onClick={setTarget}>
          Lưu
        </button>
      </ActionRow>
      <TxFeedback state={{ step, hash, error, info }} />
    </div>
  );
}

/** Mục tiêu tiết kiệm on-chain (SavingsGoal): đặt mốc gốc + hạn kỳ, theo dõi progress, ghi nhận đạt. */
function SavingsGoalCard({ data }: { data: VaultData }) {
  const tx = useTx();
  const { address } = useAccount();
  const currentEpoch = data.account?.currentEpoch ?? 0n;
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  const state = useReadContracts({
    contracts: address ? [{ address: contracts.goal, abi: savingsGoalAbi, functionName: "statusOf", args: [address] }] : [],
    query: { refetchInterval: 15_000, enabled: !!address },
  });
  const g = state.data?.[0]?.result as
    | { targetAmount: bigint; deadlineEpoch: bigint; progress: bigint; reached: boolean; active: boolean }
    | undefined;

  async function setGoal() {
    const amt = parseAmount(amount);
    const dl = BigInt(deadline || "0");
    if (!amt || dl <= currentEpoch) return;
    const ok = await tx.run("Đặt mục tiêu tiết kiệm", [
      { label: "Đang đăng ký mục tiêu on-chain…", call: { address: contracts.goal, abi: savingsGoalAbi, functionName: "setGoal", args: [amt, dl] } },
    ]);
    if (ok) {
      setAmount("");
      setDeadline("");
    }
  }

  const pct = g && g.targetAmount > 0n ? Math.min(100, Number((g.progress * 100n) / g.targetAmount)) : 0;

  return (
    <FeatureCard
      icon="rocket"
      title="Mục tiêu tiết kiệm lớn"
      desc="Cam kết một mốc gốc + hạn chót — ghi trực tiếp lên chuỗi, không sửa được ngược"
    >
      {g?.active ? (
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-cocoa-500">
            <span>Gốc hiện tại / mục tiêu</span>
            <span className="font-cozy text-sm text-cocoa-700">
              {fmt(g.progress)} / {fmt(g.targetAmount)} mUSDC · {pct}%
            </span>
          </div>
          <div className="mt-1.5 h-4 overflow-hidden rounded-full bg-cocoa-700/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ mục tiêu tiết kiệm">
            <div
              className={`h-full rounded-full transition-all duration-700 ${g.reached ? "bg-gradient-to-r from-leaf-400 to-leaf-500" : "bg-gradient-to-r from-lavender-400 to-lavender-300"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold text-cocoa-500">
            <span>
              Hạn: trước kỳ #{g.deadlineEpoch.toString()} · {g.reached ? "Đã đạt — chiến tích on-chain!" : "Còn cố lên!"}
            </span>
            {!g.reached && g.progress >= g.targetAmount && (
              <button className="btn-cozy shrink-0 !px-3 !py-1.5 text-xs" disabled={tx.step !== null} onClick={() =>
                tx.run("Ghi nhận đạt mục tiêu", [
                  { label: "Đang ghi nhận GoalReached…", call: { address: contracts.goal, abi: savingsGoalAbi, functionName: "checkReached", args: [] } },
                ])
              }>
                Ghi nhận
              </button>
            )}
          </div>
          <button
            className="btn-cream mt-2 w-full !py-1.5 text-xs"
            disabled={tx.step !== null}
            onClick={() =>
              tx.run("Huỷ mục tiêu", [
                { label: "Đang huỷ mục tiêu…", call: { address: contracts.goal, abi: savingsGoalAbi, functionName: "cancelGoal", args: [] } },
              ])
            }
          >
            Huỷ mục tiêu này
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div>
            <FieldLabel>Mốc gốc muốn đạt (mUSDC)</FieldLabel>
            <ActionRow>
              <input className="input-cozy mt-1 flex-1" inputMode="decimal" placeholder="VD: 50" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </ActionRow>
          </div>
          <div>
            <FieldLabel>Hạn chót (kỳ #, đang ở kỳ #{currentEpoch.toString()})</FieldLabel>
            <ActionRow>
              <input
                className="input-cozy mt-1 flex-1"
                inputMode="numeric"
                placeholder={`VD: ${(currentEpoch + 4n).toString()}`}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value.replace(/[^0-9]/g, ""))}
              />
              <button
                className="btn-cozy mt-1 shrink-0"
                disabled={tx.step !== null || !parseAmount(amount) || !deadline || BigInt(deadline) <= currentEpoch}
                onClick={setGoal}
              >
                Cam kết
              </button>
            </ActionRow>
          </div>
        </div>
      )}
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Cơ chế chia thưởng: baseRatioBps đọc từ YieldDistributor — không APY "ước tính" nào phía client. */
function RewardMechanismCard({ data }: { data: VaultData }) {
  const { currentBudget, rollover } = data;
  const state = useReadContracts({
    contracts: [
      { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "baseRatioBps", args: [] },
      { address: contracts.distributor, abi: yieldDistributorAbi, functionName: "yieldFeeBps", args: [] },
    ],
    query: { refetchInterval: 60_000 },
  });
  const baseRatio = state.data?.[0]?.result as bigint | undefined;
  const feeBps = (state.data?.[1]?.result as bigint | undefined) ?? 0n;
  const byPrincipal = baseRatio !== undefined ? Number(baseRatio) / 100 : 0;
  const byStreak = baseRatio !== undefined ? 100 - byPrincipal : 0;

  return (
    <FeatureCard icon="bolt" title="Cơ chế chia thưởng" desc="Tham số đọc trực tiếp từ YieldDistributor trên Fuji">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Chia theo gốc" value={baseRatio !== undefined ? `${byPrincipal}%` : undefined} tone="text-sky-600" />
        <Stat label="Chia theo streak" value={baseRatio !== undefined ? `${byStreak}%` : undefined} tone="text-blush-500" />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat label="Ngân sách kỳ này" value={`${fmt(currentBudget)} mUSDC`} />
        <Stat label="Rollover chờ chia" value={`${fmt(rollover)} mUSDC`} />
      </div>
      <p className="mt-2 text-xs font-semibold text-cocoa-500">
        Mỗi kỳ chốt, ngân sách yield (trừ phí {Number(feeBps) / 100}%) chia cho những ví giữ streak: một phần theo tỷ
        trọng gốc, phần còn lại theo trọng số streak — gửi càng đều, phần chia càng lớn.
      </p>
    </FeatureCard>
  );
}
