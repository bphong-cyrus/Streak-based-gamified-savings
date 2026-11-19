"use client";

import type { CSSProperties } from "react";

const FLOOR_COLORS = ["#ffd9a8", "#ffc9d4", "#c9bdf5", "#bfe8c9", "#fde9a9", "#bfe3f2"];

/** Avatar chibi cư dân: lấy xoay vòng từ bộ 9 identity theo số tầng. */
function residentSrc(seed: number): string {
  return `/identities/${["rabbit-office","cat-office","cat-farmer","cat-wizard","cat-knight"][Math.abs(seed) % 5]}.svg`;
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

/** Hòn đảo bệ isometric 2.5D: mặt trên cỏ, hai mặt hông đất — tòa nhà "đứng" lên trên. */
function Ground({ night }: { night: boolean }) {
  const grass = night ? "#4e8570" : "#8fddaa";
  const grassLight = night ? "#5d977f" : "#a8ecc2";
  const soilL = night ? "#5f4634" : "#b08154";
  const soilR = night ? "#4c3729" : "#90653c";
  const stone = night ? "#6b7194" : "#c9c2b4";
  return (
    <svg
      viewBox="0 0 380 220"
      width="380"
      height="220"
      className="absolute left-1/2 block"
      style={{ bottom: -14, transform: "translateX(calc(-50% + 6px))", zIndex: 0 }}
      aria-hidden
    >
      {/* mặt hông trái (đất) */}
      <polygon points="22,100 190,178 190,208 22,130" fill={soilL} stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
      {/* mặt hông phải (đất) */}
      <polygon points="190,178 358,100 358,130 190,208" fill={soilR} stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
      {/* mặt trên (cỏ) */}
      <polygon points="190,14 358,100 190,178 22,100" fill={grass} stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
      {/* vệt cỏ sáng + lối mòn */}
      <polygon points="150,52 232,74 178,102 96,78" fill={grassLight} opacity="0.9" />
      <polygon points="118,96 190,124 168,136 96,106" fill={night ? "#477a66" : "#7ecf9c"} opacity="0.9" />
      {/* đá trang trí */}
      <ellipse cx="270" cy="118" rx="14" ry="7" fill={stone} stroke={OUTLINE} strokeWidth="2.5" />
      <ellipse cx="112" cy="72" rx="9" ry="4.5" fill={stone} stroke={OUTLINE} strokeWidth="2.5" />
      {/* cụm hoa nhỏ trên mặt cỏ */}
      {[
        { x: 310, y: 96, c: "#ff9fb2" },
        { x: 66, y: 96, c: "#ffd166" },
        { x: 236, y: 148, c: "#c9bdf5" },
      ].map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r="4.5" fill={f.c} stroke={OUTLINE} strokeWidth="2" />
          <circle cx={f.x} cy={f.y} r="1.4" fill="#fff6e0" />
        </g>
      ))}
    </svg>
  );
}

interface FloorProps {
  num: number;
  color: string;
  night: boolean;
  lit: boolean;
  resident?: boolean; // tầng trên cùng có cư dân ngồi ban công
  pop?: boolean;
}

function Floor({ num, color, night, lit, resident, pop }: FloorProps) {
  const side = shade(color, night ? 0.45 : 0.72);
  return (
    <div className={`relative ${pop ? "floor-pop" : ""}`} style={{ zIndex: num }}>
      {/* mặt hông phải (2.5D) */}
      <div
        style={{
          position: "absolute",
          left: "100%",
          top: 5,
          width: 16,
          height: 73,
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
        className="relative mx-auto h-20 w-52"
        style={{
          background: color,
          border: `3px solid ${OUTLINE}`,
          borderRadius: 6,
          boxShadow: "inset 0 4px 0 rgba(255,255,255,0.35), inset 0 -6px 0 rgba(70,56,39,0.15)",
        }}
      >
        {/* cửa sổ 3D có glare + cư dân đi lại + lan can */}
        <div
          className="absolute left-1/2 top-3 h-10 w-11 -translate-x-1/2"
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
          {/* khung cắt bên trong: cư dân chibi đi ngang qua */}
          <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 2 }}>
            {(!night || lit) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/identities/${["rabbit-office","cat-office","cat-farmer","cat-wizard","cat-knight"][num % 5]}.svg`}
                alt=""
                aria-hidden
                className="walker-past absolute bottom-0 left-0 h-10 w-auto object-contain"
                style={{
                  objectPosition: "50% 8%",
                  animationDelay: `${-(((num * 2.3) % 9) + 0.6)}s`,
                  filter: night ? "brightness(0.92)" : undefined,
                }}
                draggable={false}
              />
            )}
          </div>
          <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-cocoa-700/50" />
          <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-cocoa-700/50" />
          <div className="absolute -bottom-2 left-1/2 h-2 w-14 -translate-x-1/2 rounded-sm bg-white/80" style={{ border: `1.5px solid ${OUTLINE}` }} />
        </div>
        {/* chậu cây + đèn */}
        <div className="absolute bottom-1.5 left-2 text-xl">{num % 2 === 0 ? "🪴" : "🌷"}</div>
        <div className="absolute bottom-1.5 right-2.5 text-lg">{night ? "🏮" : "💡"}</div>
        {/* số tầng */}
        <div
          className="absolute -left-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center border-2 bg-cream-50 font-cozy text-sm font-bold text-cocoa-700"
          style={{ borderRadius: 8, borderColor: OUTLINE, boxShadow: "2px 2px 0 rgba(70,56,39,0.35)" }}
        >
          {num}
        </div>
        {/* cư dân chibi ngồi ban công tầng trên cùng */}
        {resident && (
          <div className="mascot-bounce absolute -top-10 right-4 h-10 w-10 overflow-visible">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={residentSrc(num * 7 + 3)}
              alt=""
              aria-hidden
              className="h-10 w-auto object-contain"
              style={{ objectPosition: "50% 10%", filter: "drop-shadow(1px 2px 1px rgba(0,0,0,0.25))" }}
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Công trường xây tầng: công nhân chibi chạy vào chở gạch → đập búa, bụi bay → lấp lánh hoàn thiện. */
function ConstructionSite() {
  const worker = (extra: CSSProperties, hammer: boolean) => (
    <div className="relative h-9 w-9" style={extra}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={residentSrc(5)}
        alt=""
        aria-hidden
        className="h-10 w-auto object-contain"
        style={{ objectPosition: "50% 10%", filter: "drop-shadow(1px 2px 1px rgba(0,0,0,0.25))" }}
        draggable={false}
      />
      {hammer && (
        <span
          className="absolute -right-3 -top-1 text-base"
          style={{ animation: "hammering 0.35s ease-in-out 4", animationDelay: "1s", transformOrigin: "bottom left" }}
        >
          🔨
        </span>
      )}
    </div>
  );

  return (
    <div className="pointer-events-none absolute -top-24 left-0 right-0 h-28 overflow-visible">
      {/* Giai đoạn 1: chạy vào chở vật liệu (0 – 0.9s) */}
      <div className="absolute bottom-1 left-1/2 -ml-16 flex items-center" style={{ animation: "runIn 0.9s ease-out both" }}>
        {worker({}, false)}
        <span className="ml-1 text-base">📦</span>
        <span className="absolute -left-4 bottom-0 text-xs opacity-70">💨</span>
      </div>

      {/* Giai đoạn 2: đập búa (0.9 – 2.6s) */}
      <div
        className="absolute bottom-1 left-1/2 -ml-4"
        style={{ animation: "runIn 0.01s linear both", animationDelay: "0.9s" }}
      >
        {worker({}, true)}
      </div>

      {/* Bụi đánh búa */}
      {["1.3s", "1.7s", "2.1s", "2.5s"].map((d, i) => (
        <span
          key={i}
          className="absolute bottom-3 text-lg"
          style={{ left: `${52 + i * 8}%`, animation: "dustPuff 0.7s ease-out both", animationDelay: d }}
        >
          💨
        </span>
      ))}

      {/* Giai đoạn 3: lấp lánh hoàn thiện (2.8 – 4.2s) */}
      {["2.9s", "3.2s", "3.5s", "3.8s", "4.1s"].map((d, i) => (
        <span
          key={i}
          className="absolute bottom-2 text-base"
          style={{ left: `${20 + i * 14}%`, animation: "sparkleUp 1s ease-out both", animationDelay: d }}
        >
          {i % 2 === 0 ? "✨" : "⭐"}
        </span>
      ))}
    </div>
  );
}

interface BuildingProps {
  floors: number;
  night: boolean;
  building: boolean; // đang xây tầng mới (animation)
  celebrating: boolean; // vừa deposit xong: confetti + ăn mừng
  goalDone: boolean; // tuần này đã đủ mục tiêu → tầng trên cùng sáng đèn
}

/** Tòa tháp cozy 2.5D dựng hoàn toàn bằng CSS: mặt hông xéo, mái có độ dày, bóng đổ. */
export function Building({ floors, night, building, celebrating, goalDone }: BuildingProps) {
  const total = Math.max(1, floors);
  const list = Array.from({ length: total }, (_, i) => total - i); // từ tầng cao nhất xuống
  const roofSide = shade("#a794e6", night ? 0.5 : 0.72);

  return (
    <div className="relative mx-auto w-fit -translate-x-5">
      {/* hòn đảo bệ isometric nằm sau tòa nhà */}
      <Ground night={night} />
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
        className="relative z-30 mx-auto -mb-3 w-fit rounded-2xl border-[3px] bg-cream-100 px-5 py-1.5 text-center"
        style={{ borderColor: OUTLINE, boxShadow: "0 3px 0 rgba(70,56,39,0.4)" }}
      >
        <div className="font-cozy text-xs font-bold uppercase tracking-wide text-cocoa-500">Floor</div>
        <div className="font-cozy text-3xl font-extrabold leading-none text-cocoa-700">
          {building ? total + 1 : total}
        </div>
      </div>

      {/* cờ trên nóc (ẩn khi đang xây tầng mới phía trên) */}
      {!building && (
        <div className="relative z-20 mx-auto flex h-12 w-fit items-end justify-center">
          <div className="h-11 w-1 bg-cocoa-700/80" />
          <div className={`flag-wave mb-6 -ml-1 text-xl ${night ? "grayscale-[0.3]" : ""}`}>🚩</div>
        </div>
      )}

      {/* mái nhà dựng bằng SVG: sắc nét ở mọi màn hình, không bị bể góc */}
      {!building && (
      <div className="relative z-10 mx-auto w-fit">
        <div className="relative z-10 -mb-1 ml-5 flex h-8 w-44 items-end overflow-visible">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={residentSrc(8)}
            alt=""
            aria-hidden
            className="roof-walker h-9 w-auto object-contain"
            style={{ objectPosition: "50% 10%", filter: "drop-shadow(1px 2px 1px rgba(0,0,0,0.25))" }}
            draggable={false}
          />
        </div>
        <svg viewBox="0 0 212 62" width="260" height="76" className="block" aria-hidden>
          {/* độ dày mái bên phải */}
          <polygon points="186,10 204,18 204,52 186,46" fill={roofSide} stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
          {/* mái trước */}
          <polygon
            points="4,46 100,4 186,10 186,46"
            fill={night ? shade("#a794e6", 0.7) : "#a794e6"}
            stroke={OUTLINE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* ống khói */}
          <rect x="146" y="14" width="14" height="22" rx="2" fill="#ff9fb2" stroke={OUTLINE} strokeWidth="3" />
          {/* diềm mái */}
          <rect x="2" y="46" width="184" height="8" rx="2" fill="#8b74d8" stroke={OUTLINE} strokeWidth="3" />
          <rect x="186" y="46" width="18" height="8" rx="2" fill={shade("#8b74d8", night ? 0.5 : 0.72)} stroke={OUTLINE} strokeWidth="3" />
        </svg>
        {/* hoa trang trí trên mái */}
        <span className="absolute left-[10%] top-8 text-lg">🌸</span>
        <span className="absolute left-[26%] top-12 text-base">🌿</span>
        <span className="absolute left-[62%] top-2 text-sm">💨</span>
      </div>
      )}

      {/* tầng đang xây (trên cùng) + công trường kiểu Talking Tom */}
      {building && (
        <div
          className="floor-pop relative mx-auto h-20 w-52"
          style={{
            border: `3px dashed ${OUTLINE}`,
            borderRadius: 6,
            background: "repeating-linear-gradient(45deg,#fde9a9,#fde9a9 10px,#f5d67e 10px,#f5d67e 20px)",
            zIndex: total + 1,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🚧</div>
          <ConstructionSite />
        </div>
      )}
      {/* các tầng */}
      <div className="relative z-10 flex flex-col">
        {list.map((n, idx) => (
          <Floor
            key={n}
            num={n}
            color={FLOOR_COLORS[(n - 1) % FLOOR_COLORS.length]}
            night={night}
            lit={night && (goalDone || idx > 0 || !building)}
            resident={idx === 0}
          />
        ))}
      </div>

      {/* bóng đổ dưới đất */}
      <div
        className="absolute -bottom-4 left-1/2 h-6 w-72 -translate-x-1/2 rounded-[50%] bg-black/30"
        style={{ filter: "blur(3px)", zIndex: 0 }}
      />

      {/* cư dân đứng cố định trước nhà — nhấp nhô nhẹ, không bị cây che */}
      <div className="pointer-events-none absolute -bottom-6 left-1/2 z-30 h-14 w-80 -translate-x-1/2">
        {[
          { seed: 1, left: "14%", size: "h-14 w-auto", delay: "0s" },
          { seed: 0, left: "38%", size: "h-12 w-auto", delay: "0.8s" },
          { seed: 3, left: "60%", size: "h-14 w-auto", delay: "1.5s" },
          { seed: 2, left: "84%", size: "h-12 w-auto", delay: "2.2s" },
        ].map((w, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={residentSrc(w.seed)}
            alt=""
            aria-hidden
            className={`idle-bob absolute bottom-0 object-contain ${w.size}`}
            style={{ left: w.left, animationDelay: w.delay, filter: "drop-shadow(1px 2px 1px rgba(0,0,0,0.25))" }}
            draggable={false}
          />
        ))}
      </div>

      {/* bụi cây phía trước che chân nhà (chiều sâu) */}
      <div className="absolute -bottom-4 -left-16 z-20 text-3xl" style={{ filter: "drop-shadow(2px 2px 1px rgba(0,0,0,0.25))" }}>
        🌳
      </div>
      <div className="absolute -bottom-3 -right-8 z-20 text-2xl">🌼</div>
      <div className="absolute -bottom-4 right-2 z-20 text-xl">🌷</div>
    </div>
  );
}
