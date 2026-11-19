"use client";

import dynamic from "next/dynamic";
import { Icon } from "@/components/cozy/icons";

/** Scene 3D chỉ render ở client (WebGL) — tránh SSR/hydration lỗi. */
const HouseScene = dynamic(() => import("@/components/cozy/HouseScene").then((m) => m.HouseScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <div className="big-jump text-5xl" style={{ filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.25))" }}>
        🐈
      </div>
      <div className="font-cozy text-xs font-bold text-cocoa-500">Đang dựng tòa nhà…</div>
    </div>
  ),
});

interface BuildingProps {
  floors: number;
  night: boolean;
  building: boolean; // đang xây tầng mới (animation)
  celebrating: boolean; // vừa deposit xong: confetti
  goalDone: boolean; // tuần này đã đủ mục tiêu
}

/** Tòa nhà 3D isometric (Three.js): đảo cỏ, mái chóp, ống khói, cư dân mèo. */
export function Building({ floors, night, building, celebrating, goalDone }: BuildingProps) {
  const total = Math.max(1, floors);
  const height = 420 + Math.min(total, 16) * 62;

  return (
    <div className="relative mx-auto overflow-visible" style={{ width: 420, height }}>
      <HouseScene floors={floors} night={night} building={building} goalDone={goalDone} celebrating={celebrating} />

      {/* confetti khi vừa xây xong */}
      {celebrating &&
        ["#ff9fb2", "#7fd8a4", "#a794e6", "#ffd166", "#63b8f0"].map((c, i) => (
          <span
            key={i}
            className="confetti"
            style={{ left: `${20 + i * 14}%`, background: c, animationDelay: `${i * 0.08}s` }}
          />
        ))}

      {/* trạng thái đang xây */}
      {building && (
        <div
          className="pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border-2 px-3 py-1 font-cozy text-xs font-extrabold text-cocoa-700"
          style={{ borderColor: "rgba(70,56,39,0.6)", background: "#fde9a9", bottom: 12 }}
        >
          <Icon name="hammer" size={14} /> Đang xây tầng…
        </div>
      )}
    </div>
  );
}
