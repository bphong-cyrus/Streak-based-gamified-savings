"use client";

import { contracts } from "@/lib/config";
import { missionsAbi } from "@/lib/abis";
import { TxFeedback, useTx } from "@/components/useTx";
import { MISSION_KINDS, fmtGems, type MissionView } from "@/lib/useGemsData";

/** Danh sách nhiệm vụ: hoàn thành điều kiện on-chain thì nhận Paws. */
export function MissionsCard({ missions, hasWallet }: { missions: MissionView[]; hasWallet: boolean }) {
  const { run, step, hash, error } = useTx();

  async function claim(missionId: bigint) {
    await run("Nhận thưởng nhiệm vụ", [
      {
        label: "Đang nhận Paws…",
        call: { address: contracts.missions, abi: missionsAbi, functionName: "claim", args: [missionId] },
      },
    ]);
  }

  const active = missions.filter((m) => m.active);

  return (
    <div className="card-cream p-4">
      <h3 className="font-cozy text-lg font-bold">🗺️ Nhiệm vụ tuần</h3>
      <p className="mt-0.5 text-xs font-semibold text-cocoa-500">
        Hoàn thành mục tiêu tiết kiệm để nhận Paws, dùng mua theme và đồ trang trí.
      </p>
      {active.length === 0 ? (
        <p className="mt-2 text-sm font-semibold text-cocoa-500">Chưa có nhiệm vụ nào.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {active.map((m) => {
            const kind = MISSION_KINDS[m.kind] ?? MISSION_KINDS[0];
            return (
              <li key={m.id.toString()} className="flex items-center gap-2.5 rounded-xl border-2 border-cream-300 bg-white/80 px-3 py-2">
                <span className="text-xl">{kind.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-cozy text-sm font-bold text-cocoa-700">{kind.label(m.param)}</div>
                  <div className="text-[11px] font-semibold text-cocoa-500">
                    Thưởng 🐾 {fmtGems(m.gemReward)} Paws{m.recurring ? " · mỗi kỳ" : " · một lần"}
                  </div>
                </div>
                <button
                  className="btn-cozy shrink-0 !px-3 !py-1.5 text-xs"
                  disabled={!hasWallet || !m.canClaim || step !== null}
                  onClick={() => claim(m.id)}
                >
                  {m.canClaim ? "Nhận" : "🔒"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <TxFeedback state={{ step, hash, error }} />
    </div>
  );
}
