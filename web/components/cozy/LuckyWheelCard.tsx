"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { decodeEventLog, BaseError } from "viem";
import { wagmiConfig, contracts, fuji, explorerTx } from "@/lib/config";
import { luckyWheelAbi, streakVaultAbi } from "@/lib/abis";
import { fmt } from "@/lib/format";
import { FeatureCard } from "@/components/cozy/panel";
import { Icon } from "@/components/cozy/icons";
import { sfx } from "@/lib/sound";
import { isDemoMode } from "@/lib/demo";

/** Bảng giải mặc định (fallback UI — nguồn sự thật là contract). EV 0,79 mUSDC/lượt. */
const FALLBACK: Array<{ amount: bigint; decor: bigint; weight: bigint; label: string }> = [
  { amount: 0n, decor: 10n, weight: 50n, label: "Chúc may mắn +10 điểm" },
  { amount: 1_000_000n, decor: 0n, weight: 35n, label: "1 mUSDC" },
  { amount: 2_000_000n, decor: 0n, weight: 12n, label: "2 mUSDC" },
  { amount: 5_000_000n, decor: 0n, weight: 2n, label: "5 mUSDC" },
  { amount: 10_000_000n, decor: 0n, weight: 1n, label: "10 mUSDC" },
];

const SEG_COLORS = ["#EAD9BE", "#9EE8B0", "#7FD4FF", "#FFD166", "#F26D8D"];
const SEG_TEXT = ["#5B4A35", "#1E4D33", "#1B3A55", "#5B4A35", "#5B1E2E"];
const ZERO = "0x0000000000000000000000000000000000000000" as const;
const GRANT_WINDOW = 8; // số kỳ gần nhất UI cho nhận lượt

type Phase = "idle" | "sending" | "confirming" | "revealing" | "done";

/** Vẽ vòng quay SVG 5 ô; kim chỉ trên đỉnh, nhọn hướng xuống. */
function WheelSVG({ prizes, rotation }: { prizes: typeof FALLBACK; rotation: number }) {
  const n = prizes.length;
  const R = 88;
  const C = 100;
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
              y={36}
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill={SEG_TEXT[i % SEG_TEXT.length]}
              transform={`rotate(${i * seg + seg / 2} 100 100)`}
            >
              {p.amount === 0n ? "+10đ" : fmt(p.amount)}
            </text>
          </g>
        ))}
        <circle cx={C} cy={C} r={16} fill="#FFF6E0" stroke="#5B4A35" strokeWidth="2.5" />
        <circle cx={C} cy={C} r={5} fill="#F26D8D" stroke="#5B4A35" strokeWidth="2" />
      </g>
      {/* Kim chỉ — đỉnh nhọn hướng xuống vòng quay */}
      <path d="M92 3 L108 3 L100 22 Z" fill="#F26D8D" stroke="#5B4A35" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

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

export function LuckyWheelCard({ currentEpoch }: { currentEpoch?: bigint }) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const demo = isDemoMode();

  const reads = useReadContracts({
    contracts: [
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "prizeTable" },
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "pool" },
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "maxPrize" },
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "canServe" },
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "nextSpinAt", args: [address ?? ZERO] },
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "freeSpins", args: [address ?? ZERO] },
      { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "decorPoints", args: [address ?? ZERO] },
    ],
    query: { refetchInterval: 10_000, enabled: !demo && !!address },
  });

  // Danh sách kỳ gần nhất có thể nhận lượt (đã chốt & đạt & chưa nhận).
  const settledEpochs = useMemo(() => {
    if (demo || currentEpoch === undefined || currentEpoch === 0n) return [];
    const end = currentEpoch - 1n;
    const start = end - BigInt(GRANT_WINDOW - 1) > 0n ? end - BigInt(GRANT_WINDOW - 1) : 0n;
    const out: bigint[] = [];
    for (let e = end; e >= start; e--) out.push(e);
    return out;
  }, [demo, currentEpoch]);

  const grantReads = useReadContracts({
    contracts:
      !demo && address && settledEpochs.length > 0
        ? settledEpochs.flatMap((e) => ([
            { address: contracts.vault, abi: streakVaultAbi, functionName: "getEpochStatus", args: [address, e] },
            { address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "epochGranted", args: [address, e] },
          ] as const))
        : [],
    query: { refetchInterval: 15_000 },
  });

  const table = (reads.data?.[0]?.result as [bigint[], bigint[], bigint[], string[]] | undefined) ?? null;
  const prizes: typeof FALLBACK = useMemo(() => {
    if (!table) return FALLBACK;
    const [amounts, decor, weights, labels] = table;
    return amounts.map((a, i) => ({ amount: a, decor: decor[i], weight: weights[i], label: labels[i] }));
  }, [table]);
  const pool = (reads.data?.[1]?.result as bigint | undefined) ?? 0n;
  const canServe = (reads.data?.[3]?.result as boolean | undefined) ?? true;
  const nextAt = (reads.data?.[4]?.result as bigint | undefined) ?? 0n;
  const freeSpins = (reads.data?.[5]?.result as bigint | undefined) ?? 0n;
  const decor = (reads.data?.[6]?.result as bigint | undefined) ?? 0n;

  const cdLeft = useCountdown(nextAt);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [resultIdx, setResultIdx] = useState<number | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const spinningRef = useRef(false);
  const [claimBusy, setClaimBusy] = useState(false);

  const busy = phase === "sending" || phase === "confirming" || phase === "revealing";
  const canSpin = !demo && !!address && !busy && cdLeft === 0 && freeSpins > 0n && canServe;

  const claimableEpochs = settledEpochs.filter((e, i) => {
    const status = grantReads.data?.[i * 2]?.result as { settled?: boolean; qualified?: boolean } | undefined;
    const granted = Boolean(grantReads.data?.[i * 2 + 1]?.result);
    return status?.settled && status?.qualified && !granted;
  });

  async function claimEpoch(epoch: bigint) {
    if (claimBusy) return;
    setClaimBusy(true);
    try {
      await writeContractAsync({ address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "claimEpoch", args: [epoch] });
      sfx.deposit();
      grantReads.refetch();
      reads.refetch();
    } finally {
      setClaimBusy(false);
    }
  }

  async function spin() {
    if (!address || spinningRef.current) return;
    setError(null);
    setResultIdx(null);
    setHash(null);
    spinningRef.current = true;
    try {
      setPhase("sending");
      const h = await writeContractAsync({ address: contracts.luckyWheel, abi: luckyWheelAbi, functionName: "spin", args: [] });
      setHash(h);
      setPhase("confirming");
      setRotation((r) => r + 360 * 5 + Math.floor(Math.random() * 360));
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: h, chainId: fuji.id, timeout: 90_000, retryCount: 3 });
      const log = receipt.logs.find((l) => l.address.toLowerCase() === contracts.luckyWheel.toLowerCase());
      if (!log) throw new Error("Không tìm thấy kết quả quay trong receipt");
      const decoded = decodeEventLog({ abi: luckyWheelAbi, data: log.data, topics: log.topics, eventName: "SpinResult" });
      const idx = Number(decoded.args.prizeIndex);
      setResultIdx(idx);
      setPhase("revealing");
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
        if (prizes[idx].amount > 0n || prizes[idx].decor > 0n) sfx.fanfare(); else sfx.tab();
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
      desc={`Mỗi kỳ đạt mở khóa 1 lượt quay do quỹ tài trợ chi trả — không tốn mUSDC · quỹ hiện có ${demo ? "—" : fmt(pool)} mUSDC`}
    >
      <div className="flex flex-col items-center gap-3">
        <WheelSVG prizes={prizes} rotation={rotation} />

        {demo ? (
          <p className="rounded-lg border border-dashed border-cta/50 bg-cta/5 px-3 py-1.5 text-center text-[11px] font-bold text-ink-soft">
            Bản thử — kết nối ví Fuji: kỳ nào đạt mục tiêu và được chốt sẽ nhận 1 lượt quay miễn phí.
          </p>
        ) : !address ? (
          <p className="text-xs font-semibold text-ink-soft">Kết nối ví để nhận lượt quay từ kỳ đạt.</p>
        ) : (
          <>
            {!canServe && (
              <p className="w-full rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-center text-xs font-extrabold text-warning">
                Quỹ giải tạm thiếu (còn {fmt(pool)} mUSDC) — vòng quay dừng cho tới khi sponsor nạp thêm.
              </p>
            )}
            <button
              data-testid="wheel-spin"
              className="btn-primary w-full max-w-xs text-lg active:translate-y-[2px]"
              disabled={!canSpin}
              onClick={spin}
            >
              {busy
                ? phase === "confirming"
                  ? "Đang chờ chuỗi…"
                  : "Đang quay…"
                : cdLeft > 0
                  ? `Quay lại sau ${cdLeft}s`
                  : freeSpins > 0n
                    ? `Quay miễn phí · còn ${freeSpins.toString()} lượt`
                    : "Hết lượt — đạt kỳ tới để nhận thêm"}
            </button>
            <p className="text-center text-[10px] font-semibold text-ink-muted">
              Không tốn mUSDC; cần phí mạng Fuji (AVAX testnet) để ký giao dịch
              {decor > 0n ? ` · Điểm trang trí của bạn: ${decor.toString()}` : ""}
            </p>

            {claimableEpochs.length > 0 && (
              <div className="w-full rounded-xl border border-cta/30 bg-cta/5 p-2">
                <p className="mb-1 px-1 text-[11px] font-extrabold uppercase tracking-wide text-cta">
                  Kỳ đạt chờ nhận lượt ({claimableEpochs.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {claimableEpochs.map((e) => (
                    <button
                      key={e.toString()}
                      className="rounded-lg border border-cta bg-surface px-2.5 py-1 text-[11px] font-extrabold text-cta transition active:translate-y-[1px] disabled:opacity-50"
                      disabled={claimBusy}
                      onClick={() => claimEpoch(e)}
                    >
                      +1 lượt · kỳ #{e.toString()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {phase === "done" && resultIdx !== null && (
          <p role="status" className={`rounded-xl border px-3 py-1.5 text-sm font-extrabold ${prizes[resultIdx].amount > 0n ? "border-cta/50 bg-cta/10 text-cta" : "border-border bg-surface text-ink-soft"}`}>
            {prizes[resultIdx].amount > 0n
              ? `🎉 Trúng ${prizes[resultIdx].label}!`
              : prizes[resultIdx].decor > 0n
                ? `✨ ${prizes[resultIdx].label}!`
                : "💨 Chưa trúng — kỳ sau quay tiếp!"}
          </p>
        )}
        {error && <p className="text-xs font-bold text-danger">{error}</p>}
        {hash && (
          <a className="font-mono text-[11px] font-bold text-cta underline" href={explorerTx(hash)} target="_blank" rel="noopener noreferrer">
            Kết quả trên Snowtrace: {hash.slice(0, 10)}…{hash.slice(-6)}
          </a>
        )}
        <p className="text-center text-[10px] font-semibold text-ink-muted">
          Giải trả ngay từ quỹ tài trợ · Kết quả chọn trên chuỗi, đối chiếu được trên Snowtrace.
        </p>
      </div>
    </FeatureCard>
  );
}
