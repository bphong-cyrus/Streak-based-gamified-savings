"use client";

import dynamic from "next/dynamic";
import { Icon } from "@/components/cozy/icons";

/** Scene 3D chỉ render ở client (WebGL) — tránh SSR/hydration lỗi. */
const HouseScene = dynamic(() => import("@/components/cozy/HouseScene").then((m) => m.HouseScene), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
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
  const height = 360 + Math.min(total, 14) * 58;

  return (
    <div className="relative mx-auto" style={{ width: 380, height }}>
      <HouseScene floors={floors} night={night} building={building} goalDone={goalDone} />

      {/* biển Floor nổi trên cùng */}
      <div
        className="absolute left-1/2 z-30 -translate-x-1/2 rounded-2xl border-[3px] bg-cream-100 px-5 py-1.5 text-center"
        style={{ borderColor: "rgba(70,56,39,0.75)", boxShadow: "0 3px 0 rgba(70,56,39,0.4)", top: 132 }}
      >
        <div className="font-cozy text-[10px] font-bold uppercase tracking-wide text-cocoa-500">Floor</div>
        <div className="font-cozy text-2xl font-extrabold leading-none text-cocoa-700">{building ? total + 1 : total}</div>
      </div>

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
