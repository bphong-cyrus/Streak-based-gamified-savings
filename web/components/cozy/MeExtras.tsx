"use client";

import { useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { contracts, isConfigured } from "@/lib/config";
import {
  petCompanionAbi, stampsCollectionAbi, savingsJournalAbi, web3MailAbi,
  gemStakingAbi, feeRebateAbi, gemsAbi,
} from "@/lib/abis";
import { fmt, parseAmount, shortAddr } from "@/lib/format";
import { TxFeedback, useTx } from "@/components/useTx";
import { FeatureCard, Stat, useTokenAllowance, withTokenApprove } from "@/components/cozy/panel";
import type { VaultData } from "@/lib/useVaultData";
import { fmtGems } from "@/lib/useGemsData";

/** Các panel bộ sưu tập & cá nhân hoá trong tab Tôi. Nhận data để biết kỳ hiện tại. */
export function MeExtras({ data }: { data: VaultData }) {
  return (
    <>
      <PetCard data={data} />
      <StampsCard data={data} />
      <JournalCard data={data} />
      <MailCard />
      <GemStakingCard />
      <FeeRebateCard data={data} />
    </>
  );
}

/** Pet đồng hành: nhận miễn phí khi đã kích hoạt vault, cho ăn 5 Paws để lên cấp. */
function PetCard({ data }: { data: VaultData }) {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.petCompanion);

  const { data: allowData } = useReadContracts({
    contracts: address && live
      ? [{ address: contracts.gems, abi: gemsAbi, functionName: "allowance", args: [address, contracts.petCompanion] }]
      : [],
    query: { refetchInterval: 10_000, enabled: !!address && live },
  });
  const allowance = (allowData?.[0]?.result as bigint | undefined) ?? 0n;

  const state = useReadContracts({
    contracts: address && live
      ? [
          { address: contracts.petCompanion, abi: petCompanionAbi, functionName: "levelOf", args: [address] },
          { address: contracts.petCompanion, abi: petCompanionAbi, functionName: "feedCount", args: [address] },
          { address: contracts.petCompanion, abi: petCompanionAbi, functionName: "adoptedAtEpoch", args: [address] },
        ]
      : [],
    query: { refetchInterval: 10_000, enabled: !!address && live },
  });
  const level = (state.data?.[0]?.result as bigint | undefined) ?? 0n;
  const feeds = (state.data?.[1]?.result as bigint | undefined) ?? 0n;
  const adoptedAt = (state.data?.[2]?.result as bigint | undefined) ?? 0n;
  const FEED_COST = 5n * 10n ** 18n;

  if (!live) return null;

  async function adopt() {
    await tx.run("Nhận pet", [{ label: "Đang nhận pet đồng hành…", call: { address: contracts.petCompanion, abi: petCompanionAbi, functionName: "adopt", args: [] } }]);
  }
  async function feed() {
    const calls = [
      ...(allowance < FEED_COST
        ? [{ label: "Đang cấp quyền Paws…", call: { address: contracts.gems, abi: gemsAbi, functionName: "approve", args: [contracts.petCompanion, FEED_COST] } }]
        : []),
      { label: "Đang cho pet ăn…", call: { address: contracts.petCompanion, abi: petCompanionAbi, functionName: "feed", args: [] } },
    ];
    await tx.run("Cho pet ăn", calls);
  }

  return (
    <FeatureCard icon="cat" title="Pet đồng hành" desc="Cấp = streak/2 + số lần cho ăn — pet lớn theo đúng thói quen tiết kiệm của bạn">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Cấp hiện tại" value={level.toString()} tone="text-lavender-500" />
        <Stat label="Đã cho ăn" value={feeds.toString()} />
        <Stat label="Nhận ở kỳ" value={adoptedAt.toString()} />
      </div>
      <div className="mt-2 flex gap-2">
        {adoptedAt === 0n && feeds === 0n && level === 0n ? (
          <button className="btn-cozy flex-1" disabled={tx.step !== null || !data.account?.activated} onClick={adopt}>
            {data.account?.activated ? "Nhận pet miễn phí" : "Kích hoạt vault trước đã"}
          </button>
        ) : (
          <button className="btn-cozy flex-1" disabled={tx.step !== null} onClick={feed}>
            Cho ăn (5 Paws)
          </button>
        )}
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Sưu tập tem: kỳ nào đạt mục tiêu thì đóng tem, đủ bộ 12 tem một mùa nhận 5 mUSDC. */
function StampsCard({ data }: { data: VaultData }) {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.stampsCollection);
  const epoch = data.account?.currentEpoch ?? 0n;
  const [season, setSeason] = useState("0");

  const seasonIdx = epoch > 0n ? epoch / 12n : 0n;
  const state = useReadContracts({
    contracts: live && address
      ? [
          { address: contracts.stampsCollection, abi: stampsCollectionAbi, functionName: "prizePool", args: [] },
          ...Array.from({ length: 12 }, (_, i) => ({
            address: contracts.stampsCollection,
            abi: stampsCollectionAbi,
            functionName: "balanceOf",
            args: [address, (seasonIdx * 1000n + BigInt(i) + 1n) as bigint],
          })),
        ]
      : [],
    query: { refetchInterval: 15_000, enabled: live && !!address },
  });
  const pool = (state.data?.[0]?.result as bigint | undefined) ?? 0n;
  const stamps = Array.from({ length: 12 }, (_, i) => ((state.data?.[i + 1]?.result as bigint | undefined) ?? 0n) > 0n);
  const owned = stamps.filter(Boolean).length;

  if (!live) return null;

  async function stamp() {
    if (!address) return;
    await tx.run("Đóng tem kỳ", [{ label: "Đang đóng tem cho kỳ đạt mục tiêu…", call: { address: contracts.stampsCollection, abi: stampsCollectionAbi, functionName: "stamp", args: [address, epoch - 1n] } }]);
  }

  return (
    <FeatureCard icon="stamp" title="Sưu tập tem streak" desc={`Mùa hiện tại: #${seasonIdx.toString()} — đủ 12 tem nhận ${fmt(5n * 10n ** 6n)} mUSDC từ quỹ`}>
      <div className="grid grid-cols-6 gap-1.5">
        {stamps.map((has, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-lg border-2 font-cozy text-xs font-extrabold ${
              has ? "border-lavender-400 bg-lavender-300/60 text-lavender-500" : "border-cream-300 bg-white/60 text-cocoa-400"
            }`}
          >
            {has ? i + 1 : "·"}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-cocoa-500">
          {owned}/12 tem mùa này · Quỹ thưởng: {fmt(pool)} mUSDC
        </span>
        <button className="btn-cozy shrink-0 !px-3 !py-1.5 text-xs" disabled={tx.step !== null || !address || epoch === 0n} onClick={stamp}>
          Đóng tem kỳ trước
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <input className="input-cozy w-24" inputMode="numeric" placeholder={`Mùa ${seasonIdx.toString()}`} value={season} onChange={(e) => setSeason(e.target.value.replace(/[^0-9]/g, ""))} />
        <button className="btn-cream shrink-0" disabled={tx.step !== null || !season} onClick={() => tx.run("Nhận thưởng đủ bộ tem", [{ label: "Đang nhận thưởng mùa…", call: { address: contracts.stampsCollection, abi: stampsCollectionAbi, functionName: "claimSeasonBonus", args: [BigInt(season)] } }])}>
          Nhận thưởng mùa
        </button>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Nhật ký tiết kiệm: ghi lại cảm xúc mỗi kỳ, đánh dấu công khai để mọi ngườ đọc được. */
function JournalCard({ data }: { data: VaultData }) {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.savingsJournal);
  const epoch = data.account?.currentEpoch ?? 0n;
  const [text, setText] = useState("");
  const [mood, setMood] = useState(0);
  const [isPublic, setIsPublic] = useState(true);

  const MOODS = ["Vui", "Bình thường", "Hơi đuối", "Quyết tâm"];

  const state = useReadContracts({
    contracts: live && address && epoch > 0n
      ? [{ address: contracts.savingsJournal, abi: savingsJournalAbi, functionName: "entryIdOf", args: [address, epoch] }]
      : [],
    query: { refetchInterval: 15_000, enabled: live && !!address && epoch > 0n },
  });
  const todayEntry = (state.data?.[0]?.result as bigint | undefined) ?? 0n;

  if (!live) return null;

  async function write() {
    if (!text.trim()) return;
    const ok = await tx.run("Ghi nhật ký", [
      { label: "Đang lưu entry on-chain…", call: { address: contracts.savingsJournal, abi: savingsJournalAbi, functionName: "write", args: [mood, text.trim(), isPublic] } },
    ]);
    if (ok) setText("");
  }

  return (
    <FeatureCard icon="book" title="Nhật ký tiết kiệm" desc="Mỗi kỳ một dòng — về sau đọc lại thấy mình đã đi xa thế nào">
      <div className="flex flex-wrap gap-1.5">
        {MOODS.map((m, i) => (
          <button
            key={m}
            className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition ${mood === i ? "border-cocoa-700/70 bg-lavender-300/70 text-cocoa-700 shadow-chunkySm" : "border-cream-300 bg-white/70 text-cocoa-500"}`}
            onClick={() => setMood(i)}
          >
            {m}
          </button>
        ))}
      </div>
      <textarea
        className="input-cozy mt-2 h-20 w-full resize-none"
        placeholder="Hôm nay tôi đã…"
        maxLength={400}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-bold text-cocoa-500">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 accent-leaf-500" />
          Công khai ai cũng đọc được
        </label>
        <button className="btn-cozy shrink-0" disabled={tx.step !== null || !text.trim()} onClick={write}>
          {todayEntry > 0n ? "Sửa entry kỳ này" : "Ghi kỳ này"}
        </button>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Thư on-chain: gửi lờ nhắn kèm tip mUSDC cho cư dân khác trong tòa nhà. */
function MailCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.web3Mail);
  const allowance = useTokenAllowance(live ? contracts.web3Mail : undefined);
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [tip, setTip] = useState("0");

  const state = useReadContracts({
    contracts: live && address
      ? [
          { address: contracts.web3Mail, abi: web3MailAbi, functionName: "inboxSize", args: [address] },
          { address: contracts.web3Mail, abi: web3MailAbi, functionName: "mailCount", args: [] },
        ]
      : [],
    query: { refetchInterval: 15_000, enabled: live && !!address },
  });
  const inboxSize = (state.data?.[0]?.result as bigint | undefined) ?? 0n;

  const inboxState = useReadContracts({
    contracts: live && address && inboxSize > 0n
      ? [{ address: contracts.web3Mail, abi: web3MailAbi, functionName: "inbox", args: [address, 0n, 3n, ""] }]
      : [],
    query: { refetchInterval: 15_000, enabled: live && !!address && inboxSize > 0n },
  });
  const mails = (inboxState.data?.[0]?.result as { from: string; tip: bigint; body: string; at: bigint }[] | undefined) ?? [];

  if (!live) return null;

  async function send() {
    if (!to || !body.trim()) return;
    const tipAmt = parseAmount(tip) ?? 0n;
    const base = [{ label: "Đang gửi thư on-chain…", call: { address: contracts.web3Mail, abi: web3MailAbi, functionName: "send", args: [to as `0x${string}`, "", body.trim(), tipAmt] } }];
    const calls = tipAmt > 0n ? withTokenApprove(base, contracts.web3Mail, tipAmt, allowance) : base;
    const ok = await tx.run("Gửi thư", calls);
    if (ok) {
      setTo("");
      setBody("");
      setTip("0");
    }
  }

  return (
    <FeatureCard icon="mail" title="Thư on-chain" desc="Nhắn cho cư dân khác, kèm tip mUSDC nếu muốn thể hiện tình cảm">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Thư trong hộp" value={inboxSize.toString()} tone="text-lavender-500" />
        <Stat label="Tổng thư toàn mạng" value={(state.data?.[1]?.result as bigint | undefined)?.toString() ?? "0"} />
      </div>
      {mails.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {mails.map((m, i) => (
            <li key={i} className="rounded-xl border-2 border-cream-300 bg-white/80 px-3 py-1.5 text-sm">
              <div className="flex justify-between text-[11px] font-bold text-cocoa-500">
                <span>Từ {shortAddr(m.from)}</span>
                {m.tip > 0n && <span className="text-leaf-600">+{fmt(m.tip)} mUSDC</span>}
              </div>
              <div className="font-semibold text-cocoa-700">{m.body}</div>
            </li>
          ))}
        </ul>
      )}
      <input className="input-cozy mt-2 w-full font-mono text-xs" placeholder="Ví ngườ nhận" value={to} onChange={(e) => setTo(e.target.value)} />
      <textarea className="input-cozy mt-2 h-16 w-full resize-none" placeholder="Lờ nhắn" maxLength={280} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="mt-2 flex gap-2">
        <input className="input-cozy w-28" inputMode="decimal" placeholder="Tip (0)" value={tip} onChange={(e) => setTip(e.target.value)} />
        <button className="btn-cozy flex-1" disabled={tx.step !== null || !to || !body.trim()} onClick={send}>
          Gửi thư
        </button>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Staking Paws: khoá Paws nhận thêm Paws từ phần thưởng mỗi epoch. */
function GemStakingCard() {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.gemStaking);

  const { data: allowData } = useReadContracts({
    contracts: address && live
      ? [{ address: contracts.gems, abi: gemsAbi, functionName: "allowance", args: [address, contracts.gemStaking] }]
      : [],
    query: { refetchInterval: 10_000, enabled: !!address && live },
  });
  const allowance = (allowData?.[0]?.result as bigint | undefined) ?? 0n;

  const state = useReadContracts({
    contracts: live && address
      ? [
          { address: contracts.gemStaking, abi: gemStakingAbi, functionName: "staked", args: [address] },
          { address: contracts.gemStaking, abi: gemStakingAbi, functionName: "pendingReward", args: [address] },
          { address: contracts.gemStaking, abi: gemStakingAbi, functionName: "totalStaked", args: [] },
          { address: contracts.gemStaking, abi: gemStakingAbi, functionName: "rewardPerEpoch", args: [] },
        ]
      : [],
    query: { refetchInterval: 10_000, enabled: live && !!address },
  });
  const staked = (state.data?.[0]?.result as bigint | undefined) ?? 0n;
  const pending = (state.data?.[1]?.result as bigint | undefined) ?? 0n;
  const [amount, setAmount] = useState("");

  if (!live) return null;

  function gemCalls(fn: string, amt: bigint, label: string) {
    return [
      ...(allowance < amt
        ? [{ label: "Đang cấp quyền Paws…", call: { address: contracts.gems, abi: gemsAbi, functionName: "approve", args: [contracts.gemStaking, amt] } }]
        : []),
      { label, call: { address: contracts.gemStaking, abi: gemStakingAbi, functionName: fn, args: [amt] } },
    ];
  }
  const pow18 = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? BigInt(Math.round(n * 1e6)) * 10n ** 12n : 0n;
  };

  return (
    <FeatureCard icon="sprout" title="Trồng Paws" desc={`Khoá Paws vào vườn — phần thưởng ${fmtGems((state.data?.[3]?.result as bigint | undefined) ?? 0n)} Paws/epoch chia cho ngườ stake`}>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Đang stake" value={fmtGems(staked)} tone="text-lavender-500" />
        <Stat label="Thưởng chờ" value={fmtGems(pending)} tone="text-leaf-600" />
        <Stat label="Tổng stake" value={fmtGems((state.data?.[2]?.result as bigint | undefined) ?? 0n)} />
      </div>
      <div className="mt-2 flex gap-2">
        <input className="input-cozy flex-1" inputMode="decimal" placeholder="Số Paws" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="btn-cozy shrink-0" disabled={tx.step !== null || !pow18(amount)} onClick={() => tx.run("Stake Paws", gemCalls("stake", pow18(amount), "Đang gieo Paws…"))}>
          Gieo
        </button>
        <button className="btn-cream shrink-0" disabled={tx.step !== null || !pow18(amount) || pow18(amount) > staked} onClick={() => tx.run("Unstake Paws", [{ label: "Đang nhổ Paws…", call: { address: contracts.gemStaking, abi: gemStakingAbi, functionName: "unstake", args: [pow18(amount)] } }])}>
          Nhổ
        </button>
      </div>
      <button className="btn-cozy mt-2 w-full" disabled={tx.step !== null || pending === 0n} onClick={() => tx.run("Thu hoạch Paws", [{ label: "Đang nhận thưởng stake…", call: { address: contracts.gemStaking, abi: gemStakingAbi, functionName: "claimReward", args: [] } }])}>
        Thu hoạch {fmtGems(pending)} Paws
      </button>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}

/** Hoàn phí: mỗi 4 kỳ nhận lại một khoản phí, streak càng dài hoàn càng nhiều. */
function FeeRebateCard({ data }: { data: VaultData }) {
  const tx = useTx();
  const { address } = useAccount();
  const live = isConfigured(contracts.feeRebate);
  const epoch = data.account?.currentEpoch ?? 0n;
  const [asGems, setAsGems] = useState(false);

  const state = useReadContracts({
    contracts: live && address
      ? [
          { address: contracts.feeRebate, abi: feeRebateAbi, functionName: "nextClaimEpoch", args: [address] },
          { address: contracts.feeRebate, abi: feeRebateAbi, functionName: "baseRebate", args: [] },
          { address: contracts.feeRebate, abi: feeRebateAbi, functionName: "perStreakBonus", args: [] },
          { address: contracts.feeRebate, abi: feeRebateAbi, functionName: "maxRebate", args: [] },
          { address: contracts.feeRebate, abi: feeRebateAbi, functionName: "rebatePool", args: [] },
        ]
      : [],
    query: { refetchInterval: 15_000, enabled: live && !!address },
  });
  const next = (state.data?.[0]?.result as bigint | undefined) ?? 0n;
  const base = (state.data?.[1]?.result as bigint | undefined) ?? 0n;
  const perStreak = (state.data?.[2]?.result as bigint | undefined) ?? 0n;
  const max = (state.data?.[3]?.result as bigint | undefined) ?? 0n;
  const pool = (state.data?.[4]?.result as bigint | undefined) ?? 0n;
  const streak = data.account?.streak ?? 0n;
  const estimate = base + perStreak * streak > max ? max : base + perStreak * streak;
  const canClaim = epoch >= next;

  if (!live) return null;

  async function claim() {
    await tx.run("Hoàn phí", [{ label: asGems ? "Đang nhận hoàn phí bằng Paws…" : "Đang nhận hoàn phí mUSDC…", call: { address: contracts.feeRebate, abi: feeRebateAbi, functionName: "claim", args: [asGems] } }]);
  }

  return (
    <FeatureCard icon="percent" title="Hoàn phí streak" desc="Cứ 4 kỳ được hoàn một lần — streak dài hoàn tối đa 1 mUSDC hoặc đổi Paws">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Ước tính lần này" value={fmt(estimate)} tone="text-leaf-600" />
        <Stat label="Kỳ được claim" value={next.toString()} />
        <Stat label="Pool còn" value={fmt(pool)} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-bold text-cocoa-500">
          <input type="checkbox" checked={asGems} onChange={(e) => setAsGems(e.target.checked)} className="h-4 w-4 accent-lavender-500" />
          Nhận bằng Paws (x100 giá trị)
        </label>
        <button className="btn-cozy shrink-0" disabled={tx.step !== null || !canClaim} onClick={claim}>
          {canClaim ? "Nhận hoàn phí" : `Còn ${(next - epoch).toString()} kỳ nữa`}
        </button>
      </div>
      <TxFeedback state={tx} />
    </FeatureCard>
  );
}
