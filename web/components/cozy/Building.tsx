"use client";

const FLOOR_COLORS = ["#ffd9a8", "#ffc9d4", "#c9bdf5", "#bfe8c9", "#fde9a9", "#bfe3f2"];

const MASCOTS = ["🐱", "🐰", "🐻", "🦊", "🐼", "🐹"];

export function mascotOf(address: string | undefined): string {
  if (!address) return "🐱";
  const n = parseInt(address.slice(2, 8), 16);
  return MASCOTS[n % MASCOTS.length];
}

interface FloorProps {
  num: number;
  color: string;
  night: boolean;
  lit: boolean;
  mascot?: string;
  pop?: boolean;
}

function Floor({ num, color, night, lit, mascot, pop }: FloorProps) {
  return (
    <div
      className={`relative mx-auto h-16 w-44 border-[3px] border-cocoa-700/70 ${pop ? "floor-pop" : ""}`}
      style={{
        background: color,
        borderRadius: 6,
        boxShadow: "inset 0 -6px 0 rgba(70,56,39,0.12)",
        zIndex: num,
      }}
    >
      {/* cửa sổ */}
      <div
        className="absolute left-1/2 top-2 h-8 w-9 -translate-x-1/2 border-2 border-cocoa-700/70"
        style={{
          borderRadius: 4,
          background: night ? (lit ? "#ffe9a3" : "#3b3f66") : "#bfe8ff",
          boxShadow: lit && night ? "0 0 10px rgba(255,233,163,0.8)" : undefined,
        }}
      >
        <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-cocoa-700/50" />
        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-cocoa-700/50" />
      </div>
      {/* chậu cây */}
      <div className="absolute bottom-1 left-2 text-lg">{num % 2 === 0 ? "🪴" : "🌷"}</div>
      {/* đèn tường */}
      <div className="absolute bottom-1 right-2 text-base">{night ? "🏮" : "💡"}</div>
      {/* số tầng */}
      <div
        className="absolute -left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-2 border-cocoa-700/70 bg-cream-50 font-cozy text-sm font-bold text-cocoa-700"
        style={{ borderRadius: 8, boxShadow: "0 2px 0 rgba(70,56,39,0.3)" }}
      >
        {num}
      </div>
      {/* mascot ngồi ban công */}
      {mascot && (
        <div className="mascot-bounce absolute -top-6 right-4 text-2xl" style={{ filter: "drop-shadow(0 2px 1px rgba(0,0,0,0.2))" }}>
          {mascot}
        </div>
      )}
    </div>
  );
}

interface BuildingProps {
  floors: number;
  night: boolean;
  building: boolean; // đang xây tầng mới (animation)
  celebrating: boolean; // vừa deposit xong: confetti + mascot nhảy
  mascot: string;
  goalDone: boolean; // tuần này đã đủ mục tiêu → tầng trên cùng sáng đèn
}

/** Tòa tháp cozy dựng hoàn toàn bằng CSS. Số tầng = streak đã chốt (+1 tầng đang xây). */
export function Building({ floors, night, building, celebrating, mascot, goalDone }: BuildingProps) {
  const total = Math.max(1, floors);
  const list = Array.from({ length: total }, (_, i) => total - i); // từ tầng cao nhất xuống

  return (
    <div className="relative mx-auto w-fit">
      {/* confetti khi vừa xây xong */}
      {celebrating &&
        ["#ff9fb2", "#7fd8a4", "#a794e6", "#ffd166", "#63b8f0"].map((c, i) => (
          <span
            key={i}
            className="confetti"
            style={{ left: `${20 + i * 14}%`, background: c, animationDelay: `${i * 0.08}s` }}
          />
        ))}

      {/* biển "Floor N" trên mái */}
      <div className="relative z-10 mx-auto -mb-3 w-fit rounded-2xl border-[3px] border-cocoa-700/70 bg-cream-100 px-4 py-1 text-center shadow-chunkySm">
        <div className="font-cozy text-[11px] font-bold uppercase tracking-wide text-cocoa-500">Floor</div>
        <div className="font-cozy text-2xl font-extrabold leading-none text-cocoa-700">
          {building ? total + 1 : total}
        </div>
      </div>

      {/* cờ trên nóc */}
      <div className="relative z-0 mx-auto flex h-10 w-fit items-end justify-center">
        <div className="h-9 w-1 bg-cocoa-700/70" />
        <div className={`flag-wave mb-6 -ml-1 text-xl ${night ? "grayscale-[0.3]" : ""}`}>🚩</div>
      </div>

      {/* mái nhà */}
      <div
        className="relative z-0 mx-auto h-0 w-0 border-l-[92px] border-r-[92px] border-b-[46px] border-l-transparent border-r-transparent border-b-lavender-400"
        style={{ filter: "drop-shadow(0 -2px 0 rgba(70,56,39,0.4))" }}
      >
        <div className="absolute -left-2 top-1 text-lg">🌸</div>
        <div className="absolute left-4 top-3 text-sm">🌿</div>
        <div className="absolute -right-3 top-0 text-base">🧱</div>
      </div>
      <div className="mx-auto -mt-1 h-2 w-48 rounded-sm border-2 border-cocoa-700/70 bg-lavender-500" />

      {/* các tầng */}
      <div className="flex flex-col">
        {list.map((n, idx) => (
          <Floor
            key={n}
            num={n}
            color={FLOOR_COLORS[(n - 1) % FLOOR_COLORS.length]}
            night={night}
            lit={night && (goalDone || idx > 0 || !building)}
            mascot={idx === 0 ? mascot : undefined}
          />
        ))}
        {/* tầng đang xây */}
        {building && (
          <div className="floor-pop relative mx-auto h-16 w-44 border-[3px] border-dashed border-cocoa-700/60" style={{ borderRadius: 6, background: "repeating-linear-gradient(45deg,#fde9a9,#fde9a9 10px,#f5d67e 10px,#f5d67e 20px)", zIndex: total + 1 }}>
            <div className="absolute inset-0 flex items-center justify-center text-2xl">👷</div>
          </div>
        )}
      </div>

      {/* bụi cây quanh chân nhà */}
      <div className="relative z-0 -mt-1 flex items-end justify-center gap-2 text-xl">
        <span>🌳</span>
        <span className="pb-1 text-2xl">🏠</span>
        <span>🌼</span>
      </div>
    </div>
  );
}
