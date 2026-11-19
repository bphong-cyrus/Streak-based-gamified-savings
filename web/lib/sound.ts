"use client";

/**
 * Hiệu ứng âm thanh tổng hợp bằng Web Audio API — không cần file .mp3 nào.
 * Nhạc lý cozy: click giòn, thành công là arpeggion major vui tai.
 */

let ctx: AudioContext | null = null;
let muted =
  typeof window !== "undefined" && typeof localStorage !== "undefined" && localStorage.getItem("cozy-muted") === "1";

export function isMuted() {
  return muted;
}
export function setMuted(m: boolean) {
  muted = m;
  if (typeof localStorage !== "undefined") localStorage.setItem("cozy-muted", m ? "1" : "0");
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = "sine", vol = 0.12) {
  const c = ac();
  if (!c || muted) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + at;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/** Bật AudioContext trong lần tương tác đầu tiên của user (chính sách autoplay). */
export function unlockAudio() {
  ac();
}

export const sfx = {
  click: () => tone(620, 0, 0.07, "triangle", 0.08),
  tab: () => tone(440, 0, 0.06, "triangle", 0.07),
  deposit: () => {
    tone(523, 0, 0.12, "sine", 0.14);
    tone(784, 0.08, 0.16, "sine", 0.14);
  },
  coin: () => {
    tone(988, 0, 0.08, "square", 0.06);
    tone(1319, 0.06, 0.14, "square", 0.06);
  },
  success: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, "triangle", 0.13));
  },
  error: () => {
    tone(220, 0, 0.15, "sawtooth", 0.07);
    tone(165, 0.1, 0.22, "sawtooth", 0.07);
  },
  fanfare: () => {
    [523, 523, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, i === 5 ? 0.5 : 0.12, "triangle", 0.14));
    tone(1319, 0.66, 0.4, "sine", 0.1);
  },
  spin: () => {
    for (let i = 0; i < 8; i++) tone(500 + i * 90, i * 0.12, 0.06, "triangle", 0.06);
  },
};
