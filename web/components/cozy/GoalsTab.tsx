"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/config";
import { streakVaultAbi, yieldDistributorAbi, savingsGoalAbi } from "@/lib/abis";
import { normalizeDigits, parseAmount } from "@/lib/format";
import { TxFeedback, useTx } from "@/components/useTx";
import { FeatureCard, Stat, FieldLabel, ActionRow } from "@/components/cozy/panel";
import { Icon } from "@/components/cozy/icons";
import type { VaultData } from "@/lib/useVaultData";

const PRESETS = [5, 10, 25, 50];

export function GoalsTab({ data }: { data: VaultData }) {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      <div className="space-y-4">
        <ActiveGoalBanner data={data} />
        <WeeklyTargetCard data={data} />
      </div>
      <div className="space-y-4">
        <SavingsGoalCard data={data} />
        <RewardMechanismCard data={data} />
      </div>
    </div>
  );
}

function ActiveGoalBanner({ data }: { data: VaultData }) {
  const { t: translate, formatAmount: fmt } = useLanguage();
  const { account } = data;
  const target = account?.currentTarget ?? 0n;
  const progress = account?.currentProgress ?? 0n;
  const pct = target > 0n ? Math.min(100, Number((progress * 100n) / target)) : 0;
  if (!target) return null;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-cozy text-lg font-bold text-ink">
          <Icon name="rocket" size={20} className="text-cta" />{" "}{translate("Mục tiêu kỳ này")}
        </h3>
        <span className="font-cozy text-sm font-extrabold tabular-nums text-ink">{pct}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={translate("Tiến độ mục tiêu kỳ này")}>
        <div className="h-full rounded-full bg-cta transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-ink-soft">
        {translate("{0} / {1} mUSDC · còn {2} mUSDC nữa", [fmt(progress), fmt(target), fmt(target > progress ? target - progress : 0n)])}
      </p>
    </div>
  );
}

function WeeklyTargetCard({ data }: { data: VaultData }) {
  const { t: translate, formatAmount: fmt } = useLanguage();
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
    <div className="card p-4">
      <h3 className="flex items-center gap-1.5 font-cozy text-lg font-bold text-ink">
        <Icon name="target" size={20} className="text-ink-soft" />{" "}{translate("Mục tiêu mỗi kỳ")}
      </h3>
      <p className="mt-0.5 text-xs font-semibold text-ink-soft">
        {account?.activated ? translate("Thay đổi áp dụng từ kỳ kế tiếp.") : translate("Lần đầu đặt có hiệu lực ngay kỳ này.")}{" "}{translate("Hiện tại:{0}", [" "])}
        <span className="text-ink">{translate("{0} mUSDC/kỳ", [fmt(account?.currentTarget ?? 0n)])}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-extrabold text-ink-soft shadow-card transition hover:border-cta hover:text-cta active:translate-y-[1px]"
            onClick={() => setInput(String(p))}
          >
            {p} mUSDC
          </button>
        ))}
      </div>
      <ActionRow>
        <div className="relative mt-3 flex-1">
          <input
            className="input w-full pr-16"
            inputMode="decimal" dir="ltr"
            placeholder={translate("VD: {0}", [5])}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">mUSDC</span>
        </div>
        <button className="btn-primary mt-3 shrink-0" disabled={step !== null || !parseAmount(input)} onClick={setTarget}>
          {translate("Lưu")}
        </button>
      </ActionRow>
      <TxFeedback state={{ step, hash, error, info }} />
    </div>
  );
}

function SavingsGoalCard({ data }: { data: VaultData }) {
  const { t: translate, formatAmount: fmt } = useLanguage();
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
    // deadline nhập theo SỐ KỲ (tương đối) → đổi sang kỳ tuyệt đối trước khi ghi chuỗi.
    const dl = BigInt(deadline || "0") + currentEpoch;
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
    <FeatureCard icon="rocket" title={translate("Mục tiêu dài hạn")} desc={translate("Cam kết một mốc gốc + hạn chót — ghi trực tiếp lên chuỗi")}>
      {g?.active ? (
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
            <span>{translate("Gốc hiện tại / mục tiêu")}</span>
            <span className="font-cozy text-sm tabular-nums text-ink">
              {fmt(g.progress)} / {fmt(g.targetAmount)} mUSDC · {pct}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={translate("Tiến độ mục tiêu tiết kiệm")}>
            <div className={`h-full rounded-full transition-all duration-700 ${g.reached ? "bg-cta" : "bg-terracotta"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold text-ink-soft">
            <span>
              {translate("Hạn: trước kỳ #{0} ·", [g.deadlineEpoch.toString()])}{" "}{g.reached ? translate("Đã đạt — chiến tích on-chain!") : translate("Còn cố lên!")}
            </span>
            {!g.reached && g.progress >= g.targetAmount && (
              <button className="btn-primary shrink-0 !px-3 !py-1.5 text-xs" disabled={tx.step !== null} onClick={() =>
                tx.run("Ghi nhận đạt mục tiêu", [
                  { label: "Đang ghi nhận GoalReached…", call: { address: contracts.goal, abi: savingsGoalAbi, functionName: "checkReached", args: [] } },
                ])
              }>
                {translate("Ghi nhận")}
              </button>
            )}
          </div>
          <button
            className="btn-secondary mt-3 w-full !py-2 text-xs"
            disabled={tx.step !== null}
            onClick={() =>
              tx.run("Huỷ mục tiêu", [
                { label: "Đang huỷ mục tiêu…", call: { address: contracts.goal, abi: savingsGoalAbi, functionName: "cancelGoal", args: [] } },
              ])
            }
          >
            {translate("Huỷ mục tiêu này")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <FieldLabel>{translate("Mốc gốc muốn đạt (mUSDC)")}</FieldLabel>
            <div className="mt-1 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-extrabold text-ink-soft shadow-card transition hover:border-cta hover:text-cta active:translate-y-[1px]"
                  onClick={() => setAmount(String(p))}
                >
                  {p}
                </button>
              ))}
            </div>
            <ActionRow>
              <input className="input mt-2 flex-1" inputMode="decimal" placeholder={translate("VD: {0}", [50])} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </ActionRow>
          </div>
          <div>
            <FieldLabel>{translate("Hạn chót — chọn theo số kỳ (đang ở kỳ #{0})", [currentEpoch.toString()])}</FieldLabel>
            <div className="mt-1 flex flex-wrap gap-2">
              {[
                { n: 3, label: translate("3 kỳ") },
                { n: 7, label: translate("7 kỳ") },
                { n: 30, label: translate("30 kỳ") },
              ].map(({ n, label }) => {
                const selected = deadline === String(n);
                return (
                  <button
                    key={n}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-extrabold shadow-card transition active:translate-y-[1px] ${
                      selected ? "border-cta bg-cta text-white" : "border-border bg-surface text-ink-soft hover:border-cta hover:text-cta"
                    }`}
                    aria-pressed={selected}
                    onClick={() => setDeadline(String(n))}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <ActionRow>
              <input
                className="input mt-2 flex-1"
                inputMode="numeric" dir="ltr"
                placeholder={translate("Hoặc nhập số kỳ…")}
                aria-label={translate("Số kỳ làm hạn chót")}
                value={deadline}
                onChange={(e) => setDeadline(normalizeDigits(e.target.value).replace(/[^0-9]/g, ""))}
              />
              <button
                className="btn-primary mt-2 shrink-0"
                disabled={tx.step !== null || !parseAmount(amount) || !deadline || BigInt(deadline) <= 0n || currentEpoch + BigInt(deadline) <= currentEpoch}
                onClick={setGoal}
              >
                {translate("Cam kết")}
              </button>
            </ActionRow>
            {deadline && BigInt(deadline) > 0n && (
              <p className="mt-1 text-[11px] font-semibold text-ink-soft">
                {translate("Tương ứng kỳ #{0} — ghi trực tiếp lên chuỗi khi bấm Cam kết.", [(currentEpoch + BigInt(deadline)).toString()])}
              </p>
            )}
          </div>
        </div>
      )}
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

function RewardMechanismCard({ data }: { data: VaultData }) {
  const { t: translate, formatAmount: fmt } = useLanguage();
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
    <FeatureCard icon="bolt" title={translate("Cơ chế chia thưởng")} desc={translate("Tham số đọc trực tiếp từ YieldDistributor trên Fuji")} collapsible defaultOpen={false}>
      <div className="grid grid-cols-2 gap-3">
        <Stat label={translate("Chia theo gốc")} value={baseRatio !== undefined ? `${byPrincipal}%` : undefined} tone="text-cta" />
        <Stat label="Chia theo streak" value={baseRatio !== undefined ? `${byStreak}%` : undefined} tone="text-terracotta" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label={translate("Ngân sách kỳ này")} value={`${fmt(currentBudget)} mUSDC`} />
        <Stat label={translate("Rollover chờ chia")} value={`${fmt(rollover)} mUSDC`} />
      </div>
      <p className="mt-3 text-xs font-semibold text-ink-soft">
        {translate("Mỗi kỳ chốt, ngân sách yield (trừ phí {0}%) chia cho những ví giữ streak: một phần theo tỷ trọng gốc, phần còn lại theo trọng số streak — gửi càng đều, phần chia càng lớn.", [Number(feeBps) / 100])}
      </p>
    </FeatureCard>
  );
}
