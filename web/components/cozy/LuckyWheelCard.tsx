"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { decodeEventLog, BaseError } from "viem";
import { wagmiConfig, contracts, fuji, explorerTx } from "@/lib/config";
import { luckyWheelAbi, mockUSDCAbi } from "@/lib/abis";
import { fmt } from "@/lib/format";
import { FeatureCard } from "@/components/cozy/panel";
import { Icon } from "@/components/cozy/icons";
import { sfx } from "@/lib/sound";
import { isDemoMode } from "@/lib/demo";

/** Bảng giải mặc định dùng khi chưa đọc được contract (vẽ vòng quay ngay). */
const FALLBACK: Array<{ amount: bigint; weight: bigint; label: string }> = [
  { amount: 0n, weight: 28n, label: "Chúc may mắn!" },
  { amount: 1_000_000n, weight: 26n, label: "1 mUSDC" },
  { amount: 2_000_000n, weight: 20n, label: "2 mUSDC" },
  { amount: 5_000_000n, weight: 14n, label: "5 mUSDC" },
  { amount: 10_000_000n, weight: 8n, label: "10 mUSDC" },
  { amount: 25_000_000n, weight: 4n, label: "25 mUSDC" },
];

const SEG_COLORS = ["#EAD9BE", "#9EE8B0", "#7FD4FF", "#FFD166", "#F5A94B", "#F26D8D"];
const SEG_TEXT = ["#5B4A35", "#1E4D33", "#1B3A55", "#5B4A35", "#5B2B1E", "#5B1E2E"];

type Phase = "idle" | "sending" | "confirming" | "revealing" | "done";

/** Vẽ vòng quay SVG với n đoạn bằng nhau (góc theo trọng số cho đúng tỉ lệ thị giác nhỏ gọn). */
function WheelSVG({ prizes, rotation }: { prizes: typeof FALLBACK; rotation: number }) {
  const n = prizes.length;
  const R = 88;
  const C = 100;
  // Dùng cung bằng nhau để dễ đọc nhãn; tỉ lệ trúng do contract quyết định.
  const seg = 360 / n;
  const path = (i: number) => {
    const a0 = ((i * seg - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
    const x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0);
    const x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
    return `M ${C} ${C} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
  };
  return (
    <svg viewBox="0 0 200 200" className="h-44 w-44 drop-shadow-card" aria-hidden>
      <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "100px 100px", transition: "transform 3.6s cubic-bezier(0.15, 0.9, 0.25, 1)" }}>
        {prizes.map((p, i) => (
          <g key={i}>
            <path d={path(i)} fill={SEG_COLORS[i % SEG_COLORS.length]} stroke="#5B4A35" strokeWidth="1.6" />
            <text
              x={C}
              y={34}
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="800"
              fill={SEG_TEXT[i % SEG_TEXT.length]}
              transform={`rotate(${i * seg + seg / 2} 100 100)`}
            >
              {p.amount === 0n ? "💨" : `${fmt(p.amount)}`}
            </text>
          </g>
        ))}
        <circle cx={C} cy={C} r={16} fill="#FFF6E0" stroke="#5B4A35" strokeWidth="2.5" />
        <circle cx={C} cy={C} r={5} fill="#F26D8D" stroke="#5B4A35" strokeWidth="2" />
      </g>
      {/* Kim chỉ */}
      <path d="M100 4 L108 20 L92 20 Z" fill="#F26D8D" stroke="#5B4A35" strokeWidth="1.6" />
    </svg>
  );
}

/** Đếm ngược cooldown đơn giản. */
function useCountdown(target: bigint | undefined): number {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!target) return;
    const t = Number(target) * 1000;
    const tick = () => setLeft(Math.max(0, Math.ceil((t - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

export function LuckyWheelCard() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const demo = isDemoMode();

  const reads = useReadContracts({
    contracts: [
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "prizeTable" },
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "spinFee" },
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "cooldown" },
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "pool" },
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "nextSpinAt", args: [address ?? "0x0000000000000000000000000000000000000000"] },
      { address: contracts.token, abi: mockUSDCAbi, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] },
      { address: contracts.token, abi: mockUSDCAbi, functionName: "allowance", args: [address ?? "0x0000000000000000000000000000000000000000", contracts.luckyWheel] },
    ],
    query: { refetchInterval: 10_000, enabled: !demo && !!address },
  });

  const table = (reads.data?.[0]?.result as [bigint[], bigint[], string[]] | undefined) ?? null;
  const prizes: typeof FALLBACK = useMemo(() => {
    if (!table) return FALLBACK;
    const [amounts, weights, labels] = table;
    return amounts.map((a, i) => ({ amount: a, weight: weights[i], label: labels[i] }));
  }, [table]);
  const fee = (reads.data?.[1]?.result as bigint | undefined) ?? 1_000_000n;
  const pool = (reads.data?.[3]?.result as bigint | undefined) ?? 0n;
  const nextAt = (reads.data?.[4]?.result as bigint | undefined) ?? 0n;
  const balance = (reads.data?.[5]?.result as bigint | undefined) ?? 0n;
  const allowance = (reads.data?.[6]?.result as bigint | undefined) ?? 0n;

  const cdLeft = useCountdown(nextAt);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [resultIdx, setResultIdx] = useState<number | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const spinningRef = useRef(false);

  const busy = phase === "sending" || phase === "confirming" || phase === "revealing";
  const canSpin = !demo && !!address && !busy && cdLeft === 0 && balance >= fee;

  async function spin() {
    if (!address || spinningRef.current) return;
    setError(null);
    setResultIdx(null);
    setHash(null);
    spinningRef.current = true;
    try {
      setPhase("sending");
      if (allowance < fee) {
        await writeContractAsync({
          address: contracts.token, abi: mockUSDCAbi, functionName: "approve", args: [contracts.luckyWheel, fee],
        });
      }
      const h = await writeContractAsync({ address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "spin", args: [] });
      setHash(h);
      setPhase("confirming");
      // Quay sớm cho vui — góc ngẫu nhiên; khi có kết quả thật sẽ chỉnh về đúng ô.
      setRotation((r) => r + 360 * 5 + Math.floor(Math.random() * 360));
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: h, chainId: fuji.id, timeout: 90_000, retryCount: 3 });
      const log = receipt.logs.find((l) => l.address.toLowerCase() === contracts.luckyWheel.toLowerCase());
      if (!log) throw new Error("Không tìm thấy kết quả quay trong receipt");
      const decoded = decodeEventLog({ abi: luckyWheelAbi, data: log.data, topics: log.topics, eventName: "SpinResult" });
      const idx = Number(decoded.args.prizeIndex);
      setResultIdx(idx);
      setPhase("revealing");
      // Chỉnh góc để ô thắng dừng ngay kim chỉ (ô 0 nằm đầu tiên, quay kim chiều kim đồng hồ).
      const seg = 360 / prizes.length;
      const targetMod = (360 - idx * seg - seg / 2) % 360;
      setRotation((r) => {
        const currentMod = ((r % 360) + 360) % 360;
        const delta = (((targetMod - currentMod) % 360) + 360) % 360;
        return r + 360 * 2 + delta;
      });
      window.setTimeout(() => {
        setPhase("done");
        spinningRef.current = false;
        reads.refetch();
        if (prizes[idx].amount > 0n) sfx.fanfare(); else sfx.tab();
      }, 3800);
    } catch (e) {
      const err = e as BaseError;
      setError(err.shortMessage ?? err.message ?? "Quay thất bại — thử lại nhé.");
      setPhase("idle");
      spinningRef.current = false;
    }
  }

  return (
    <FeatureCard
      icon="gift"
      title="Vòng quay may mắn"
      desc={`Trả phí ${fmt(fee)} mUSDC/lượt — giải trả ngay từ pool ${demo ? "—" : fmt(pool)} mUSDC do sponsor tài trợ`}
    >
      <div className="flex flex-col items-center gap-3">
        <WheelSVG prizes={prizes} rotation={rotation} />

        {demo ? (
          <p className="rounded-lg border border-dashed border-cta/50 bg-cta/5 px-3 py-1.5 text-center text-[11px] font-bold text-ink-soft">
            Bản thử — kết nối ví Fuji để quay thật. Kết quả ngẫu nhiên bằng entropy testnet (blockhash);
            mainnet sẽ dùng VRF.
          </p>
        ) : !address ? (
          <p className="text-xs font-semibold text-ink-soft">Kết nối ví để quay.</p>
        ) : (
          <>
            <button
              data-testid="wheel-spin"
              className="btn-primary w-full max-w-xs text-lg active:translate-y-[2px]"
              disabled={!canSpin}
              onClick={spin}
            >
              {busy ? (phase === "confirming" ? "Đang chờ chuỗi…" : "Đang quay…") : cdLeft > 0 ? `Quay lại sau ${cdLeft}s` : `Quay — ${fmt(fee)} mUSDC`}
            </button>
            {balance < fee && (
              <p className="text-[11px] font-bold text-danger">Không đủ mUSDC để trả phí quay.</p>
            )}
          </>
        )}

        {phase === "done" && resultIdx !== null && (
          <p role="status" className={`rounded-xl border px-3 py-1.5 text-sm font-extrabold ${prizes[resultIdx].amount > 0n ? "border-cta/50 bg-cta/10 text-cta" : "border-border bg-surface text-ink-soft"}`}>
            {prizes[resultIdx].amount > 0n ? `🎉 Trúng ${prizes[resultIdx].label}!` : "💨 Chưa trúng — quay lại sau nhé!"}
          </p>
        )}
        {error && <p className="text-xs font-bold text-danger">{error}</p>}
        {hash && (
          <a className="font-mono text-[11px] font-bold text-cta underline" href={explorerTx(hash)} target="_blank" rel="noopener noreferrer">
            Kết quả trên Snowtrace: {hash.slice(0, 10)}…{hash.slice(-6)}
          </a>
        )}
        <p className="text-center text-[10px] font-semibold text-ink-muted">
          Mỗi ví cách {cdLeft > 0 ? "vài" : "một"} phút mỗi lượt · Phí quay đổ vào pool · Kết quả chọn on-chain
          (entropy blockhash — chỉ dùng cho testnet).
        </p>
      </div>
    </FeatureCard>
  );
}
