"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/cozy/icons";

const KEY = "cozy-onboarded";

const STEPS: Array<{ icon: IconName; title: string; desc: string }> = [
  {
    icon: "target",
    title: "Đặt mục tiêu kỳ",
    desc: "Vào tab Mục tiêu, chọn số mUSDC bạn muốn gửi mỗi kỳ. Bắt đầu nhỏ, tăng dần theo khả năng.",
  },
  {
    icon: "hammer",
    title: "Gửi đủ trước hạn",
    desc: "Gửi đủ mục tiêu trước khi kỳ kết thúc → tòa nhà 3D mọc thêm một tầng, streak +1 kỳ.",
  },
  {
    icon: "gift",
    title: "Nhận lãi & phần thưởng",
    desc: "Sau khi kỳ được chốt, nhận lãi mUSDC và huy hiệu NFT cho những cột mốc streak dài.",
  },
];

export function Onboarding() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (localStorage.getItem(KEY) !== "1") setStep(0);
  }, []);

  if (step === null) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  function done() {
    localStorage.setItem(KEY, "1");
    setStep(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm" onClick={done}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hướng dẫn sử dụng Cozy Save"
        className="w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 pb-8 shadow-card md:rounded-2xl md:pb-6"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "bannerPop 0.4s var(--ease-spring) both" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border md:hidden" />
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-sunken text-cta shadow-card">
            <Icon name={s.icon} size={30} />
          </span>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-ink-muted">Bước {step + 1}/{STEPS.length}</div>
            <h3 className="font-cozy text-xl font-extrabold text-ink">{s.title}</h3>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-ink-soft">{s.desc}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full border border-border ${i === step ? "bg-cta" : i < step ? "bg-terracotta" : "bg-surface"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={done}>
              Bỏ qua
            </button>
            <button
              className="btn-primary !px-4 !py-1.5 text-sm"
              onClick={() => {
                if (last) done();
                else setStep(step + 1);
              }}
            >
              {last ? "Bắt đầu" : "Tiếp"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function resetOnboarding() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY);
  }
}
