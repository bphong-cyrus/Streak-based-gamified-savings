"use client";

/** Bầu trời day/night: mây trôi, sao lấp lánh, mặt trờ/mặt trăng. */
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
              style={{
                top: s.top,
                left: s.left,
                width: s.size,
                height: s.size,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
          <div className="absolute right-6 top-10 text-5xl drop-shadow-[0_0_12px_rgba(255,241,168,0.6)]">🌙</div>
        </>
      ) : (
        <>
          <div className="absolute left-5 top-8 text-5xl">☀️</div>
          <div className="cloud" style={{ top: "12%", width: 70, height: 22, animationDuration: "70s" }} />
          <div className="cloud" style={{ top: "26%", width: 54, height: 18, animationDuration: "95s", animationDelay: "-30s" }} />
          <div className="cloud" style={{ top: "7%", width: 44, height: 15, animationDuration: "80s", animationDelay: "-55s" }} />
        </>
      )}
      {/* đồi cỏ phía dưới */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background: night ? "#1d3a2a" : "#7ec96f",
          borderRadius: "100% 100% 0 0 / 60px",
          transform: "scaleX(1.4)",
        }}
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
