"use client";

import { useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts, isConfigured } from "@/lib/config";
import {
  savingCircleAbi, savingsBondAbi, termLockAbi, timeCapsuleAbi,
  paycheckSplitterAbi, vaultCreditAbi, emergencyHatchAbi, guardianRecoveryAbi,
  spendingLimitAbi, charityPotAbi,
} from "@/lib/abis";
import { fmt, parseAmount } from "@/lib/format";
import { TxFeedback, useTx } from "@/components/useTx";
import { FeatureCard, Stat, FieldLabel, ActionRow, useTokenAllowance, withTokenApprove } from "@/components/cozy/panel";

/** Tab Tiện ích: các công cụ tài chính cá nhân xung quanh ví tiết kiệm. */
export function ToolsTab() {
  return (
    <div className="space-y-3 px-4 pb-28 pt-2">
      <SavingCircleCard />
      <SavingsBondCard />
      <TermLockCard />
      <TimeCapsuleCard />
      <PaycheckSplitterCard />
      <VaultCreditCard />
      <EmergencyHatchCard />
      <GuardianRecoveryCard />
      <SpendingLimitCard />
      <CharityPotCard />
    </div>
  );
}

/** Hụi điện tử: vòng góp xoay vòng, mỗi kỳ một ngườ nhận pot. */
function SavingCircleCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.savingCircle);
  const allowance = useTokenAllowance(live ? contracts.savingCircle : undefined);
  const [name, setName] = useState("");
  const [commit, setCommit] = useState("");
  const [viewId, setViewId] = useState("");

  const countState = useReadContracts({
    contracts: live ? [{ address: contracts.savingCircle, abi: savingCircleAbi, functionName: "circleCount", args: [] }] : [],
    query: { refetchInterval: 15_000, enabled: live },
  });
  const circleCount = (countState.data?.[0]?.result as bigint | undefined) ?? 0n;
  const id = viewId ? BigInt(viewId) : circleCount;

  const cState = useReadContracts({
    contracts: live && id > 0n && address
      ? [
          { address: contracts.savingCircle, abi: savingCircleAbi, functionName: "getCircle", args: [id] },
        ]
      : [],
    query: { refetchInterval: 10_000, enabled: live && id > 0n && !!address },
  });
  const c = cState.data?.[0]?.result as
    | { name: string; commitAmount: bigint; startEpoch: bigint; members: string[]; nextPayoutRound: bigint; active: boolean }
    | undefined;
  const isMember = c?.members?.some((m) => m.toLowerCase() === address?.toLowerCase()) ?? false;

  if (!live) return null;

  async function call(fn: string, args: unknown[], label: string, amt?: bigint) {
    const base = [{ label, call: { address: contracts.savingCircle, abi: savingCircleAbi, functionName: fn, args } }];
    const calls = amt !== undefined ? withTokenApprove(base, contracts.savingCircle, amt, allowance) : base;
    const ok = await tx.run(label, calls);
    if (ok && fn === "createCircle") setName("");
  }

  return (
    <FeatureCard icon="circle" title="Hụi điện tử" desc="Nhóm 2–12 ngườ góp đều mỗi kỳ — mỗi kỳ một ngườ nhận pot, xoay vòng đến hết">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Vòng hụi đang có" value={circleCount.toString()} />
        <Stat label="Đang xem" value={id > 0n ? `#${id.toString()}` : "—"} />
      </div>
      {c && id > 0n && (
        <p className="mt-2 rounded-xl border-2 border-cream-300 bg-white/80 px-3 py-2 text-xs font-semibold text-cocoa-600">
          {c.name}: góp {fmt(c.commitAmount)} mUSDC/kỳ · {c.members.length} thành viên · {c.active ? "đang hoạt động" : "đã đóng"}
          {isMember && " · bạn đã tham gia"}
        </p>
      )}

      <div className="mt-3 space-y-2.5">
        <div>
          <FieldLabel>Mở vòng hụi mới</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" placeholder="Tên vòng (VD: Hụi phòng 301)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input-cozy w-24" inputMode="decimal" placeholder="Góp/kỳ" value={commit} onChange={(e) => setCommit(e.target.value)} />
            <button
              className="btn-cozy shrink-0"
              disabled={tx.step !== null || !name || !parseAmount(commit) || !address}
              onClick={() => call("createCircle", [name, parseAmount(commit)!, 0n], "Đang mở vòng hụi…")}
            >
              Mở
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Tham gia / đóng góp</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="numeric" placeholder={`ID vòng (mới nhất #${circleCount.toString()})`} value={viewId} onChange={(e) => setViewId(e.target.value.replace(/[^0-9]/g, ""))} />
            <button className="btn-cream shrink-0" disabled={tx.step !== null || id === 0n || isMember || !address} onClick={() => call("joinCircle", [id], "Đang tham gia vòng hụi…")}>
              Tham gia
            </button>
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || id === 0n || !isMember} onClick={() => call("contribute", [id], "Đang góp vòng hụi…", c?.commitAmount)}>
              Góp
            </button>
          </ActionRow>
        </div>

        <ActionRow>
          <button className="btn-cream flex-1" disabled={tx.step !== null || id === 0n} onClick={() => call("payout", [id], "Đang giải ngân vòng…")}>
            Nhận pot vòng này
          </button>
        </ActionRow>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Trái phiếu tiết kiệm: phát hành trái phiếu có kỳ hạn, coupon tăng theo streak. */
function SavingsBondCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.savingsBond);
  const allowance = useTokenAllowance(live ? contracts.savingsBond : undefined);
  const [amount, setAmount] = useState("");
  const [epochs, setEpochs] = useState("8");
  const [bondId, setBondId] = useState("");

  const state = useReadContracts({
    contracts: live
      ? [
          { address: contracts.savingsBond, abi: savingsBondAbi, functionName: "baseCouponBps", args: [] },
          { address: contracts.savingsBond, abi: savingsBondAbi, functionName: "bondCount", args: [] },
          { address: contracts.savingsBond, abi: savingsBondAbi, functionName: "bondCountOf", args: [address ?? "0x0000000000000000000000000000000000000000"] },
        ]
      : [],
    query: { refetchInterval: 15_000, enabled: live },
  });
  const baseBps = (state.data?.[0]?.result as bigint | undefined) ?? 0n;
  const totalIssued = (state.data?.[1]?.result as bigint | undefined) ?? 0n;
  const mine = (state.data?.[2]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function issue() {
    const amt = parseAmount(amount);
    if (!amt) return;
    const calls = withTokenApprove(
      [{ label: "Đang phát hành trái phiếu…", call: { address: contracts.savingsBond, abi: savingsBondAbi, functionName: "issue", args: [amt, BigInt(epochs || "1")] } }],
      contracts.savingsBond, amt, allowance,
    );
    if (await tx.run("Phát hành trái phiếu", calls)) setAmount("");
  }

  return (
    <FeatureCard icon="gem" title="Trái phiếu cozy" desc={`Coupon cơ bản ${Number(baseBps) / 100}% + 0.5% mỗi streak — rút đúng hạn nhận đủ, rút sớm bị phạt`}>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Trái phiếu của bạn" value={address ? mine.toString() : undefined} />
        <Stat label="Đã phát hành toàn mạng" value={totalIssued.toString()} />
      </div>

      <div className="mt-3 space-y-2.5">
        <div>
          <FieldLabel>Phát hành trái phiếu</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Mệnh giá (mUSDC)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className="input-cozy w-20" inputMode="numeric" placeholder="Kỳ" value={epochs} onChange={(e) => setEpochs(e.target.value.replace(/[^0-9]/g, ""))} />
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !parseAmount(amount)} onClick={issue}>
              Phát hành
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Đáo hạn</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="numeric" placeholder="Bond ID cần đáo hạn" value={bondId} onChange={(e) => setBondId(e.target.value.replace(/[^0-9]/g, ""))} />
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !bondId} onClick={() => tx.run("Đáo hạn trái phiếu", [{ label: "Đang đáo hạn…", call: { address: contracts.savingsBond, abi: savingsBondAbi, functionName: "redeem", args: [BigInt(bondId)] } }])}>
              Đáo hạn
            </button>
          </ActionRow>
        </div>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Khoá có kỳ hạn: khoá tiền lấy thưởng, rút trước hạn bị phạt. */
function TermLockCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.termLock);
  const allowance = useTokenAllowance(live ? contracts.termLock : undefined);
  const [amount, setAmount] = useState("");
  const [epochs, setEpochs] = useState("4");
  const [lockId, setLockId] = useState("");

  const state = useReadContracts({
    contracts: live
      ? [
          { address: contracts.termLock, abi: termLockAbi, functionName: "rewardBpsPerYear", args: [] },
          { address: contracts.termLock, abi: termLockAbi, functionName: "activeLocksOf", args: [address ?? "0x0000000000000000000000000000000000000000"] },
        ]
      : [],
    query: { refetchInterval: 15_000, enabled: live },
  });
  const bps = (state.data?.[0]?.result as bigint | undefined) ?? 0n;
  const active = (state.data?.[1]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function lock() {
    const amt = parseAmount(amount);
    if (!amt) return;
    const calls = withTokenApprove(
      [{ label: "Đang khoá tiền…", call: { address: contracts.termLock, abi: termLockAbi, functionName: "lock", args: [amt, BigInt(epochs || "1")] } }],
      contracts.termLock, amt, allowance,
    );
    if (await tx.run("Khoá có kỳ hạn", calls)) setAmount("");
  }

  return (
    <FeatureCard icon="lock" title="Két kỳ hạn" desc={`Thưởng ${Number(bps) / 100}%/năm quy ước — khoá càng lâu càng đáng`}>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Khoản đang khoá" value={address ? active.toString() : undefined} />
        <Stat label="Phạt rút sớm" value="20%" tone="text-blush-500" />
      </div>

      <div className="mt-3 space-y-2.5">
        <div>
          <FieldLabel>Gửi vào két</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số mUSDC khoá" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className="input-cozy w-20" inputMode="numeric" placeholder="Kỳ" value={epochs} onChange={(e) => setEpochs(e.target.value.replace(/[^0-9]/g, ""))} />
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !parseAmount(amount)} onClick={lock}>
              Khoá
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Mở khoảng đến hạn</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="numeric" placeholder="Lock ID" value={lockId} onChange={(e) => setLockId(e.target.value.replace(/[^0-9]/g, ""))} />
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !lockId} onClick={() => tx.run("Mở khoá", [{ label: "Đang giải ngân khoản khoá…", call: { address: contracts.termLock, abi: termLockAbi, functionName: "release", args: [BigInt(lockId)] } }])}>
              Mở khoá
            </button>
          </ActionRow>
        </div>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Hộp thờ gian: viết thư + gửi tiền cho tương lai, mở đúng kỳ đã hẹn. */
function TimeCapsuleCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.timeCapsule);
  const allowance = useTokenAllowance(live ? contracts.timeCapsule : undefined);
  const [amount, setAmount] = useState("");
  const [epochs, setEpochs] = useState("4");
  const [message, setMessage] = useState("");
  const [capsuleId, setCapsuleId] = useState("");

  const state = useReadContracts({
    contracts: live
      ? [{ address: contracts.timeCapsule, abi: timeCapsuleAbi, functionName: "capsuleCountOf", args: [address ?? "0x0000000000000000000000000000000000000000"] }]
      : [],
    query: { refetchInterval: 15_000, enabled: live },
  });
  const mine = (state.data?.[0]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function create() {
    const amt = parseAmount(amount);
    if (!amt) return;
    const calls = withTokenApprove(
      [{ label: "Đang niêm phong hộp thờ gian…", call: { address: contracts.timeCapsule, abi: timeCapsuleAbi, functionName: "create", args: [amt, BigInt(epochs || "1"), message || ""] } }],
      contracts.timeCapsule, amt + 200001n, allowance, // phí tạo 0.2 mUSDC
    );
    if (await tx.run("Tạo hộp thờ gian", calls)) {
      setAmount("");
      setMessage("");
    }
  }

  async function call(fn: string, label: string) {
    if (!capsuleId) return;
    await tx.run(label, [{ label, call: { address: contracts.timeCapsule, abi: timeCapsuleAbi, functionName: fn, args: [BigInt(capsuleId)] } }]);
  }

  return (
    <FeatureCard icon="capsule" title="Hộp thờ gian" desc="Gửi tiền + lờ nhắn cho chính mình ở tương lai — mở đúng kỳ đã hẹn (phí tạo 0.2 mUSDC)">
      <Stat label="Hộp của bạn" value={address ? mine.toString() : undefined} />

      <div className="mt-3 space-y-2.5">
        <div>
          <FieldLabel>Niêm phong hộp mới</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số mUSDC gửi" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className="input-cozy w-20" inputMode="numeric" placeholder="Kỳ" value={epochs} onChange={(e) => setEpochs(e.target.value.replace(/[^0-9]/g, ""))} />
          </ActionRow>
          <ActionRow>
            <input className="input-cozy mt-2 flex-1" placeholder="Lờ nhắn cho tương lai…" value={message} onChange={(e) => setMessage(e.target.value)} />
            <button className="btn-cozy mt-2 shrink-0" disabled={tx.step !== null || !parseAmount(amount)} onClick={create}>
              Niêm phong
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Mở / huỷ hộp</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="numeric" placeholder="Capsule ID" value={capsuleId} onChange={(e) => setCapsuleId(e.target.value.replace(/[^0-9]/g, ""))} />
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !capsuleId} onClick={() => call("open", "Đang mở hộp thờ gian…")}>
              Mở
            </button>
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !capsuleId} onClick={() => call("cancel", "Huỷ hộp (phí 20%)")}>
              Huỷ
            </button>
          </ActionRow>
        </div>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Chia lương tự động: đặt tỷ lệ, mỗi lần execute tiền tự chảy về vault + ví phụ. */
function PaycheckSplitterCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.paycheckSplitter);
  const allowance = useTokenAllowance(live ? contracts.paycheckSplitter : undefined);
  const [dests, setDests] = useState("");
  const [amount, setAmount] = useState("");

  const state = useReadContracts({
    contracts: live
      ? [{ address: contracts.paycheckSplitter, abi: paycheckSplitterAbi, functionName: "planCount", args: [address ?? "0x0000000000000000000000000000000000000000"] }]
      : [],
    query: { refetchInterval: 15_000, enabled: live },
  });
  const planCount = (state.data?.[0]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function setPlan() {
    // định dạng: địa_chỉ:bps, địa_chỉ:bps — tổng bps ≤ 10000, phần còn lại về vault
    const parts = dests.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const [a, b] = s.split(":");
      return { dest: a as `0x${string}`, bps: BigInt(b || "0") };
    });
    if (parts.length === 0) return;
    await tx.run("Đặt lịch chia lương", [
      { label: "Đang lưu kế hoạch chia…", call: { address: contracts.paycheckSplitter, abi: paycheckSplitterAbi, functionName: "setPlan", args: [parts] } },
    ]);
  }
  async function execute() {
    const amt = parseAmount(amount);
    if (!amt) return;
    const calls = withTokenApprove(
      [{ label: "Đang chia lương theo kế hoạch…", call: { address: contracts.paycheckSplitter, abi: paycheckSplitterAbi, functionName: "execute", args: [amt] } }],
      contracts.paycheckSplitter, amt, allowance,
    );
    if (await tx.run("Chia lương", calls)) setAmount("");
  }

  return (
    <FeatureCard icon="split" title="Máy chia lương" desc="VD: 0xABC:7000 → 70% vào ví phụ, phần còn lại gửi thẳng vault giữ streak">
      <Stat label="Kế hoạch đã lưu" value={address ? planCount.toString() : undefined} />

      <div className="mt-3 space-y-2.5">
        <div>
          <FieldLabel>Kế hoạch chia (tối đa 5 đích)</FieldLabel>
          <ActionRow>
            <input
              className="input-cozy flex-1 font-mono text-xs"
              placeholder="địa_chỉ:bps, địa_chỉ:bps"
              value={dests}
              onChange={(e) => setDests(e.target.value)}
            />
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !dests} onClick={setPlan}>
              Lưu
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Chia một khoản ngay</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số mUSDC nhận được" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !parseAmount(amount)} onClick={execute}>
              Chia ngay
            </button>
          </ActionRow>
        </div>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Tín dụng theo streak: vay tối đa streak × 1 mUSDC, trả từ ví hoặc trừ gốc vault. */
function VaultCreditCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.vaultCredit);
  const allowance = useTokenAllowance(live ? contracts.vaultCredit : undefined);
  const [amount, setAmount] = useState("");
  const [repayAmt, setRepayAmt] = useState("");

  const state = useReadContracts({
    contracts: live && address
      ? [
          { address: contracts.vaultCredit, abi: vaultCreditAbi, functionName: "creditLimit", args: [address] },
          { address: contracts.vaultCredit, abi: vaultCreditAbi, functionName: "loans", args: [address] },
          { address: contracts.vaultCredit, abi: vaultCreditAbi, functionName: "totalRepaid", args: [address] },
        ]
      : [],
    query: { refetchInterval: 10_000, enabled: live && !!address },
  });
  const limit = (state.data?.[0]?.result as bigint | undefined) ?? 0n;
  const loan = state.data?.[1]?.result as { amount: bigint; borrowEpoch: bigint; repaid: boolean } | undefined;
  const repaid = (state.data?.[2]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function borrow() {
    const amt = parseAmount(amount);
    if (!amt) return;
    await tx.run("Vay nhanh", [{ label: "Đang giải ngân khoản vay…", call: { address: contracts.vaultCredit, abi: vaultCreditAbi, functionName: "borrow", args: [amt] } }]);
  }

  return (
    <FeatureCard icon="card" title="Tín dụng streak" desc="Càng giữ streak dài, hạn mức vay càng lớn — không cần thế chấp thêm">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Hạn mức" value={address ? fmt(limit) : undefined} tone="text-leaf-600" />
        <Stat label="Đang nợ" value={address ? fmt(loan?.amount ?? 0n) : undefined} tone="text-blush-500" />
        <Stat label="Đã trả" value={address ? fmt(repaid) : undefined} />
      </div>

      <div className="mt-3 space-y-2.5">
        <div>
          <FieldLabel>Vay nhanh</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số mUSDC muốn vay" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !parseAmount(amount)} onClick={borrow}>
              Vay
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Trả nợ</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số mUSDC trả" value={repayAmt} onChange={(e) => setRepayAmt(e.target.value)} />
            <button
              className="btn-cream shrink-0"
              disabled={tx.step !== null || !parseAmount(repayAmt)}
              onClick={async () => {
                const amt = parseAmount(repayAmt)!;
                const calls = withTokenApprove(
                  [{ label: "Đang trả nợ…", call: { address: contracts.vaultCredit, abi: vaultCreditAbi, functionName: "repayFromWallet", args: [amt] } }],
                  contracts.vaultCredit, amt, allowance,
                );
                if (await tx.run("Trả nợ", calls)) setRepayAmt("");
              }}
            >
              Trả từ ví
            </button>
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !loan || loan.repaid || loan.amount === 0n} onClick={() => tx.run("Trả nợ từ gốc vault", [{ label: "Đang trừ gốc để trả nợ…", call: { address: contracts.vaultCredit, abi: vaultCreditAbi, functionName: "repay", args: [] } }])}>
              Trừ gốc
            </button>
          </ActionRow>
        </div>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Cửa thoát hiểm: rút qua hàng chờ trì hoãn 24h — chống rút vội khi hoảng loạn. */
function EmergencyHatchCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.emergencyHatch);
  const allowance = useTokenAllowance(live ? contracts.emergencyHatch : undefined);
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [requestId, setRequestId] = useState("");

  const state = useReadContracts({
    contracts: live && address
      ? [{ address: contracts.emergencyHatch, abi: emergencyHatchAbi, functionName: "balanceOf", args: [address] }]
      : [],
    query: { refetchInterval: 10_000, enabled: live && !!address },
  });
  const bal = (state.data?.[0]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function deposit() {
    const amt = parseAmount(depositAmt);
    if (!amt) return;
    const calls = withTokenApprove(
      [{ label: "Đang nạp vào cửa thoát hiểm…", call: { address: contracts.emergencyHatch, abi: emergencyHatchAbi, functionName: "deposit", args: [amt] } }],
      contracts.emergencyHatch, amt, allowance,
    );
    if (await tx.run("Nạp cửa thoát hiểm", calls)) setDepositAmt("");
  }

  return (
    <FeatureCard icon="hatch" title="Cửa thoát hiểm" desc="Muốn rút phải đặt lịch trước 24h — đủ lạnh đầu để không bán hoảng">
      <Stat label="Đang giữ trong hatch" value={address ? `${fmt(bal)} mUSDC` : undefined} />

      <div className="mt-3 space-y-2.5">
        <div>
          <FieldLabel>Nạp vào hatch</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số mUSDC" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} />
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !parseAmount(depositAmt)} onClick={deposit}>
              Nạp
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Đặt lịch rút (hiệu lực sau 24h)</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số mUSDC muốn rút" value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} />
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !parseAmount(withdrawAmt)} onClick={() => tx.run("Đặt lịch rút", [{ label: "Đang tạo yêu cầu rút…", call: { address: contracts.emergencyHatch, abi: emergencyHatchAbi, functionName: "requestWithdrawal", args: [parseAmount(withdrawAmt)!] } }])}>
              Đặt lịch
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Theo dõi yêu cầu</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="numeric" placeholder="Request ID" value={requestId} onChange={(e) => setRequestId(e.target.value.replace(/[^0-9]/g, ""))} />
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !requestId} onClick={() => tx.run("Thực hiện rút", [{ label: "Đang giải ngân yêu cầu…", call: { address: contracts.emergencyHatch, abi: emergencyHatchAbi, functionName: "executeWithdrawal", args: [BigInt(requestId)] } }])}>
              Rút
            </button>
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !requestId} onClick={() => tx.run("Huỷ yêu cầu rút", [{ label: "Đang huỷ…", call: { address: contracts.emergencyHatch, abi: emergencyHatchAbi, functionName: "cancelWithdrawal", args: [BigInt(requestId)] } }])}>
              Huỷ
            </button>
          </ActionRow>
        </div>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Khôi phục ví bằng guardian: 2/3 guardian đồng ý → chuyển tài khoản sang ví mới. */
function GuardianRecoveryCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.guardianRecovery);
  const [guardians, setGuardians] = useState("");
  const [newWallet, setNewWallet] = useState("");
  const [requestId, setRequestId] = useState("");

  if (!live) return null;

  async function call(fn: string, args: unknown[], label: string) {
    const ok = await tx.run(label, [{ label, call: { address: contracts.guardianRecovery, abi: guardianRecoveryAbi, functionName: fn, args } }]);
    if (ok && fn === "setGuardians") setGuardians("");
  }

  return (
    <FeatureCard icon="lifebuoy" title="Guardian khôi phục" desc="Chọn 1–3 ngườ tin cậy — mất ví vẫn lấy lại được tài khoản (2/3 guardian phải duyệt)">
      <div className="space-y-2.5">
        <div>
          <FieldLabel>Đặt guardian (cách nhau dấu phẩy)</FieldLabel>
          <ActionRow>
            <input
              className="input-cozy flex-1 font-mono text-xs"
              placeholder="0xABC…, 0xDEF…"
              value={guardians}
              onChange={(e) => setGuardians(e.target.value)}
            />
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !guardians || !address} onClick={() => call("setGuardians", [guardians.split(",").map((s) => s.trim()).filter(Boolean)], "Đang đặt guardian…")}>
              Đặt
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Yêu cầu khôi phục sang ví mới</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1 font-mono text-xs" placeholder="Địa chỉ ví mới" value={newWallet} onChange={(e) => setNewWallet(e.target.value)} />
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !newWallet || !address} onClick={() => call("requestRecovery", [newWallet as `0x${string}`], "Đang yêu cầu khôi phục…")}>
              Yêu cầu
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Guardian duyệt / thực hiện</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="numeric" placeholder="Request ID" value={requestId} onChange={(e) => setRequestId(e.target.value.replace(/[^0-9]/g, ""))} />
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !requestId} onClick={() => call("approve", [BigInt(requestId)], "Guardian đang duyệt…")}>
              Duyệt
            </button>
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !requestId} onClick={() => call("execute", [BigInt(requestId)], "Đang chuyển sang ví mới…")}>
              Thực hiện
            </button>
          </ActionRow>
        </div>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Giới hạn chi tiêu: tự nguyện giới hạn mức rút mỗi kỳ, đổi limit phải chờ 2 kỳ. */
function SpendingLimitCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.spendingLimit);
  const allowance = useTokenAllowance(live ? contracts.spendingLimit : undefined);
  const [depositAmt, setDepositAmt] = useState("");
  const [limit, setLimit] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  const state = useReadContracts({
    contracts: live && address
      ? [
          { address: contracts.spendingLimit, abi: spendingLimitAbi, functionName: "limits", args: [address] },
          { address: contracts.spendingLimit, abi: spendingLimitAbi, functionName: "balanceOf", args: [address] },
        ]
      : [],
    query: { refetchInterval: 10_000, enabled: live && !!address },
  });
  const l = state.data?.[0]?.result as
    | { perEpoch: bigint; pendingPerEpoch: bigint; withdrawnThisEpoch: bigint }
    | undefined;
  const bal = (state.data?.[1]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function deposit() {
    const amt = parseAmount(depositAmt);
    if (!amt) return;
    const calls = withTokenApprove(
      [{ label: "Đang nạp vào quỹ giới hạn…", call: { address: contracts.spendingLimit, abi: spendingLimitAbi, functionName: "deposit", args: [amt] } }],
      contracts.spendingLimit, amt, allowance,
    );
    if (await tx.run("Nạp quỹ giới hạn", calls)) setDepositAmt("");
  }

  return (
    <FeatureCard icon="gauge" title="Vòng kim cô chi tiêu" desc="Tự khoá mức rút mỗi kỳ — muốn nới phải chờ 2 kỳ, đủ thờ gian suy nghĩ">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Limit/kỳ" value={address ? fmt(l?.perEpoch ?? 0n) : undefined} tone="text-blush-500" />
        <Stat label="Đã rút kỳ này" value={address ? fmt(l?.withdrawnThisEpoch ?? 0n) : undefined} />
        <Stat label="Quỹ đang giữ" value={address ? fmt(bal) : undefined} />
      </div>

      <div className="mt-3 space-y-2.5">
        <div>
          <FieldLabel>Nạp quỹ</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số mUSDC" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} />
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !parseAmount(depositAmt)} onClick={deposit}>
              Nạp
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Đổi limit (hiệu lực sau 2 kỳ)</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Limit mỗi kỳ (mUSDC)" value={limit} onChange={(e) => setLimit(e.target.value)} />
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !parseAmount(limit)} onClick={() => tx.run("Đổi limit", [{ label: "Đang đăng ký limit mới…", call: { address: contracts.spendingLimit, abi: spendingLimitAbi, functionName: "setLimit", args: [parseAmount(limit)!] } }])}>
              Đặt limit
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Rút trong limit</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số mUSDC" value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} />
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !parseAmount(withdrawAmt)} onClick={() => tx.run("Rút trong limit", [{ label: "Đang rút…", call: { address: contracts.spendingLimit, abi: spendingLimitAbi, functionName: "withdraw", args: [parseAmount(withdrawAmt)!] } }])}>
              Rút
            </button>
          </ActionRow>
        </div>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Quỹ từ thiện: chọn tổ chức, quyên góp trực tiếp hoặc cam kết % lãi tự động. */
function CharityPotCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.charityPot);
  const allowance = useTokenAllowance(live ? contracts.charityPot : undefined);
  const [amount, setAmount] = useState("");
  const [bps, setBps] = useState("10");
  const [charityId, setCharityId] = useState("");

  const state = useReadContracts({
    contracts: live && address
      ? [
          { address: contracts.charityPot, abi: charityPotAbi, functionName: "charityCount", args: [] },
          { address: contracts.charityPot, abi: charityPotAbi, functionName: "chosenCharityOf", args: [address] },
          { address: contracts.charityPot, abi: charityPotAbi, functionName: "autoDonateBps", args: [address] },
          { address: contracts.charityPot, abi: charityPotAbi, functionName: "lifetimeDonated", args: [address] },
        ]
      : [],
    query: { refetchInterval: 20_000, enabled: live && !!address },
  });
  const count = Number((state.data?.[0]?.result as bigint | undefined) ?? 0n);
  const chosen = (state.data?.[1]?.result as bigint | undefined) ?? 0n;
  const autoBps = (state.data?.[2]?.result as bigint | undefined) ?? 0n;
  const lifetime = (state.data?.[3]?.result as bigint | undefined) ?? 0n;

  const listState = useReadContracts({
    contracts: live
      ? Array.from({ length: Math.min(count, 10) }, (_, i) => ({
          address: contracts.charityPot, abi: charityPotAbi, functionName: "charities", args: [BigInt(i + 1)],
        }))
      : [],
    query: { refetchInterval: 20_000, enabled: live && count > 0 },
  });
  const charities = Array.from({ length: Math.min(count, 10) }, (_, i) => listState.data?.[i]?.result as
    | { id: bigint; name: string; wallet: string; active: boolean; totalReceived: bigint }
    | undefined).filter((c): c is NonNullable<typeof c> => !!c && c.active);

  if (!live) return null;

  async function donate() {
    const amt = parseAmount(amount);
    if (!amt) return;
    const calls = withTokenApprove(
      [{ label: "Đang quyên góp…", call: { address: contracts.charityPot, abi: charityPotAbi, functionName: "donate", args: [amt] } }],
      contracts.charityPot, amt, allowance,
    );
    if (await tx.run("Quyên góp", calls)) setAmount("");
  }

  return (
    <FeatureCard icon="heart" title="Quỹ từ thiện" desc="Một phần lãi của bạn có thể nuôi những mái nhà thật ngoài đờii">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Tổ chức đang hoạt động" value={charities.length > 0 ? charities.length.toString() : (count > 0 ? "0" : undefined)} />
        <Stat label="Bạn đã quyên góp" value={address ? fmt(lifetime) : undefined} tone="text-leaf-600" />
      </div>

      {charities.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {charities.map((c) => (
            <li key={c.id.toString()} className="flex items-center justify-between gap-2 rounded-xl border-2 border-cream-300 bg-white/80 px-3 py-1.5 text-sm">
              <span className="font-semibold text-cocoa-700">
                #{c.id.toString()} {c.name}
                {chosen === c.id && <span className="ml-1 text-[10px] font-extrabold text-leaf-600">đã chọn</span>}
              </span>
              <span className="text-[11px] font-semibold text-cocoa-500">{fmt(c.totalReceived)} đã nhận</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2.5">
        <div>
          <FieldLabel>Chọn tổ chức nhận</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="numeric" placeholder="ID tổ chức" value={charityId} onChange={(e) => setCharityId(e.target.value.replace(/[^0-9]/g, ""))} />
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !charityId} onClick={() => tx.run("Chọn tổ chức", [{ label: "Đang chọn tổ chức nhận…", call: { address: contracts.charityPot, abi: charityPotAbi, functionName: "chooseCharity", args: [BigInt(charityId)] } }])}>
              Chọn
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Cam kết % lãi tự động quyên góp (hiện {Number(autoBps) / 100}%)</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="numeric" placeholder="VD: 10 = 10% lãi" value={bps} onChange={(e) => setBps(e.target.value.replace(/[^0-9]/g, ""))} />
            <button className="btn-cream shrink-0" disabled={tx.step !== null || !bps} onClick={() => tx.run("Cam kết tự động quyên góp", [{ label: "Đang đặt % lãi tự động…", call: { address: contracts.charityPot, abi: charityPotAbi, functionName: "setAutoDonate", args: [BigInt(bps)] } }])}>
              Cam kết
            </button>
          </ActionRow>
        </div>

        <div>
          <FieldLabel>Quyên góp ngay {chosen > 0n ? `(đang chọn #${chosen.toString()})` : "(chưa chọn tổ chức)"}</FieldLabel>
          <ActionRow>
            <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số mUSDC" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button className="btn-cozy shrink-0" disabled={tx.step !== null || !parseAmount(amount) || chosen === 0n} onClick={donate}>
              Gửi tặng
            </button>
          </ActionRow>
        </div>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}
