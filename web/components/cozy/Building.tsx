"use client";

const FLOOR_COLORS = ["#ffd9a8", "#ffc9d4", "#c9bdf5", "#bfe8c9", "#fde9a9", "#bfe3f2"];

const MASCOTS = ["🐱", "🐰", "🐻", "🦊", "🐼", "🐹"];

export function mascotOf(address: string | undefined): string {
  if (!address) return "🐱";
  const n = parseInt(address.slice(2, 8), 16);
  return MASCOTS[n % MASCOTS.length];
}

/** Tối màu hex đi một hệ số (dùng cho mặt hông 2.5D). */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const OUTLINE = "rgba(70,56,39,0.75)";

interface FloorProps {
  num: number;
  color: string;
  night: boolean;
  lit: boolean;
  mascot?: string;
  pop?: boolean;
}

function Floor({ num, color, night, lit, mascot, pop }: FloorProps) {
  const side = shade(color, night ? 0.45 : 0.72);
  return (
    <div className={`relative ${pop ? "floor-pop" : ""}`} style={{ zIndex: num }}>
      {/* mặt hông phải (2.5D) */}
      <div
        style={{
          position: "absolute",
          left: "100%",
          top: 4,
          width: 15,
          height: 58,
          background: side,
          transform: "skewY(28deg)",
          transformOrigin: "left top",
          border: `3px solid ${OUTLINE}`,
          borderLeft: "none",
          borderRadius: "0 4px 4px 0",
        }}
      />
      {/* mặt trước */}
      <div
        className="relative mx-auto h-16 w-44"
        style={{
          background: color,
          border: `3px solid ${OUTLINE}`,
          borderRadius: 6,
          boxShadow: "inset 0 4px 0 rgba(255,255,255,0.35), inset 0 -6px 0 rgba(70,56,39,0.15)",
        }}
      >
        {/* cửa sổ 3D có glare + lan can */}
        <div
          className="absolute left-1/2 top-2 h-8 w-9 -translate-x-1/2"
          style={{
            border: `2px solid ${OUTLINE}`,
            borderRadius: 4,
            background: night
              ? lit
                ? "linear-gradient(135deg,#fff3c4 0%,#ffe9a3 60%,#f7d97e 100%)"
                : "#3b3f66"
              : "linear-gradient(135deg,#e8f7ff 0%,#bfe8ff 60%,#a5d8f5 100%)",
            boxShadow:
              night && lit
                ? "0 0 12px rgba(255,233,163,0.85), inset 0 -2px 0 rgba(70,56,39,0.25)"
                : "inset 0 -2px 0 rgba(70,56,39,0.2)",
          }}
        >
          <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-cocoa-700/50" />
          <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-cocoa-700/50" />
          <div className="absolute -bottom-1.5 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-sm bg-white/80" style={{ border: `1.5px solid ${OUTLINE}` }} />
        </div>
        {/* chậu cây + đèn */}
        <div className="absolute bottom-1 left-2 text-lg">{num % 2 === 0 ? "🪴" : "🌷"}</div>
        <div className="absolute bottom-1 right-2 text-base">{night ? "🏮" : "💡"}</div>
        {/* số tầng */}
        <div
          className="absolute -left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-2 bg-cream-50 font-cozy text-sm font-bold text-cocoa-700"
          style={{ borderRadius: 8, borderColor: OUTLINE, boxShadow: "2px 2px 0 rgba(70,56,39,0.35)" }}
        >
          {num}
        </div>
        {/* mascot ngồi ban công */}
        {mascot && (
          <div
            className="mascot-bounce absolute -top-6 right-4 text-2xl"
            style={{ filter: "drop-shadow(2px 3px 1px rgba(0,0,0,0.25))" }}
          >
            {mascot}
          </div>
        )}
      </div>
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

/** Tòa tháp cozy 2.5D dựng hoàn toàn bằng CSS: mặt hông xéo, mái có độ dày, bóng đổ. */
export function Building({ floors, night, building, celebrating, mascot, goalDone }: BuildingProps) {
  const total = Math.max(1, floors);
  const list = Array.from({ length: total }, (_, i) => total - i); // từ tầng cao nhất xuống
  const roofSide = shade("#a794e6", night ? 0.5 : 0.72);

  return (
    <div className="relative mx-auto w-fit -translate-x-5">
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
      <div
        className="relative z-30 mx-auto -mb-3 w-fit rounded-2xl border-[3px] bg-cream-100 px-4 py-1 text-center"
        style={{ borderColor: OUTLINE, boxShadow: "0 3px 0 rgba(70,56,39,0.4)" }}
      >
        <div className="font-cozy text-[11px] font-bold uppercase tracking-wide text-cocoa-500">Floor</div>
        <div className="font-cozy text-2xl font-extrabold leading-none text-cocoa-700">
          {building ? total + 1 : total}
        </div>
      </div>

      {/* cờ trên nóc */}
      <div className="relative z-20 mx-auto flex h-10 w-fit items-end justify-center">
        <div className="h-9 w-1 bg-cocoa-700/80" />
        <div className={`flag-wave mb-6 -ml-1 text-xl ${night ? "grayscale-[0.3]" : ""}`}>🚩</div>
      </div>

      {/* mái nhà: mặt trước + mặt hông dày */}
      <div className="relative z-10 mx-auto w-fit">
        <div
          className="h-0 w-0 border-l-[92px] border-r-[92px] border-b-[46px] border-l-transparent border-r-transparent"
          style={{ borderBottomColor: night ? shade("#a794e6", 0.7) : "#a794e6", filter: "drop-shadow(0 -2px 0 rgba(70,56,39,0.4))" }}
        >
          <div className="absolute -left-2 top-1 text-lg">🌸</div>
          <div className="absolute left-4 top-3 text-sm">🌿</div>
          <div className="absolute -right-3 top-0 text-base">🧱</div>
          {/* ống khói */}
          <div className="absolute -right-9 -top-2 h-6 w-4 border-2 bg-blush-400" style={{ borderColor: OUTLINE }}>
            <div className="absolute -top-3 left-0 text-xs">💨</div>
          </div>
        </div>
        {/* độ dày mái bên phải */}
        <div
          style={{
            position: "absolute",
            left: "100%",
            top: 2,
            width: 14,
            height: 44,
            background: roofSide,
            transform: "skewY(33deg)",
            transformOrigin: "left top",
            border: `3px solid ${OUTLINE}`,
            borderLeft: "none",
            borderRadius: "0 4px 4px 0",
          }}
        />
        <div className="mx-auto -mt-1 h-2.5 w-48 rounded-sm border-2 bg-lavender-500" style={{ borderColor: OUTLINE }} />
      </div>

      {/* các tầng */}
      <div className="relative z-10 flex flex-col">
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
          <div
            className="floor-pop relative mx-auto h-16 w-44"
            style={{
              border: `3px dashed ${OUTLINE}`,
              borderRadius: 6,
              background: "repeating-linear-gradient(45deg,#fde9a9,#fde9a9 10px,#f5d67e 10px,#f5d67e 20px)",
              zIndex: total + 1,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-2xl">👷</div>
          </div>
        )}
      </div>

      {/* bóng đổ dưới đất */}
      <div
        className="absolute -bottom-3 left-1/2 h-5 w-60 -translate-x-1/2 rounded-[50%] bg-black/30"
        style={{ filter: "blur(3px)", zIndex: 0 }}
      />

      {/* bụi cây phía trước che chân nhà (chiều sâu) */}
      <div className="absolute -bottom-4 -left-10 z-20 text-3xl" style={{ filter: "drop-shadow(2px 2px 1px rgba(0,0,0,0.25))" }}>
        🌳
      </div>
      <div className="absolute -bottom-3 -right-8 z-20 text-2xl">🌼</div>
      <div className="absolute -bottom-4 right-2 z-20 text-xl">🌷</div>
    </div>
  );
}
