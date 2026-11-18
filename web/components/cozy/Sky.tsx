"use client";

/** Bầu trờ day/night: mây pixel dày dặn, sao lấp lánh, mặt trờ/mặt trăng. */
export function Sky({ night }: { night: boolean }) {
  return (
    <div className={`pointer-events-none fixed inset-0 overflow-hidden ${night ? "sky-night" : "sky-day"}`}>
      {night ? (
        <>
          {[
            { top: "8%", left: "12%", size: 3, delay: 0 },
            { top: "16%", left: "68%", size: 2, delay: 0.6 },
            { top: "6%", left: "84%", size: 3, delay: 1.1 },
            { top: "24%", left: "38%", size: 2, delay: 0.3 },
            { top: "13%", left: "50%", size: 2, delay: 1.6 },
            { top: "28%", left: "8%", size: 2, delay: 0.9 },
            { top: "20%", left: "88%", size: 2, delay: 0.4 },
          ].map((s, i) => (
            <span
              key={i}
              className="star"
              style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
            />
          ))}
          <div className="absolute right-6 top-10 text-5xl drop-shadow-[0_0_12px_rgba(255,241,168,0.6)]">🌙</div>
        </>
      ) : (
        <>
          <div className="absolute left-5 top-8 text-5xl">☀️</div>
          {/* cụm mây dày dặn kiểu pixel-art */}
          <div className="cloud-fluffy" style={{ top: "10%", width: 190, height: 46, animation: "drift 85s linear infinite" }}>
            <span className="puff" />
            <div className="cloud-shadow" />
          </div>
          <div
            className="cloud-fluffy"
            style={{ top: "24%", width: 140, height: 36, animation: "drift 110s linear infinite", animationDelay: "-40s" }}
          >
            <span className="puff" />
            <div className="cloud-shadow" />
          </div>
          <div
            className="cloud-fluffy"
            style={{ top: "6%", width: 110, height: 30, animation: "drift 95s linear infinite", animationDelay: "-70s" }}
          >
            <span className="puff" />
            <div className="cloud-shadow" />
          </div>
          <div
            className="cloud-fluffy"
            style={{ top: "34%", width: 90, height: 26, animation: "drift 130s linear infinite", animationDelay: "-15s", opacity: 0.9 }}
          >
            <span className="puff" />
            <div className="cloud-shadow" />
          </div>
        </>
      )}
      {/* đồi cỏ phía dưới */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{ background: night ? "#1d3a2a" : "#7ec96f", borderRadius: "100% 100% 0 0 / 60px", transform: "scaleX(1.4)" }}
      />
      <div
        className="absolute -bottom-6 left-0 right-0 h-24"
        style={{
          background: night ? "#16301f" : "#69b95c",
          borderRadius: "100% 100% 0 0 / 70px",
          transform: "scaleX(1.2) translateX(8%)",
        }}
      />
    </div>
  );
}
