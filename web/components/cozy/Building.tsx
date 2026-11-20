"use client";

import dynamic from "next/dynamic";
import { Icon } from "@/components/cozy/icons";
import { Guard } from "@/components/cozy/Guard";

const HouseScene = dynamic(() => import("@/components/cozy/HouseScene").then((m) => m.HouseScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <div className="text-5xl" style={{ filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.25))" }}>🏠</div>
      <div className="font-cozy text-xs font-bold text-ink-soft">Đang dựng tòa nhà…</div>
    </div>
  ),
});

interface BuildingProps {
  floors: number;
  night: boolean;
  building: boolean;
  celebrating: boolean;
  goalDone: boolean;
  width: number;
  height: number;
  scale: number;
}

export function Building({ floors, night, building, celebrating, goalDone, width, height, scale }: BuildingProps) {
  return (
    <div className="relative h-full w-full">
      {/* Guard cô lập mọi lỗi render của cảnh 3D — hỏng WebGL hay hỏng mesh
          thì chỉ đổi sang bản tĩnh, app không rơi error boundary. */}
      <Guard fallback={<StaticFallback floors={floors} />}>
        <HouseScene
          floors={floors}
          night={night}
          building={building}
          goalDone={goalDone}
          celebrating={celebrating}
          width={width}
          height={height}
          scale={scale}
        />
      </Guard>

      {building && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-warning/10 px-3 py-1 font-cozy text-xs font-extrabold text-warning">
          <Icon name="hammer" size={14} /> Đang xây tầng…
        </div>
      )}
    </div>
  );
}

/** Bản tĩnh khi WebGL/scene 3D không dùng được. */
function StaticFallback({ floors }: { floors: number }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-border bg-surface-sunken p-6 text-center">
      <div className="font-cozy text-6xl font-extrabold text-ink">{Math.max(0, floors)}</div>
      <div className="mt-1 text-sm font-semibold text-ink-soft">tầng đã xây</div>
    </div>
  );
}
