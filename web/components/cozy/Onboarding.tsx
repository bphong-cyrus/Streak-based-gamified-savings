"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/cozy/icons";
import { sfx } from "@/lib/sound";

const KEY = "cozy-onboarded";
const STEPS: Array<{ icon: IconName; title: string; desc: string; tab: string }> = [
  {
    icon: "target",
    title: "Đặt mục tiêu tuần",
    desc: "Vào tab Mục tiêu, chọn số mUSDC bạn muốn gửi mỗi kỳ. Mục tiêu bao nhiêu tuỳ bạn — bắt đầu nhỏ, lên dần.",
    tab: "Bước 1/3",
  },
  {
    icon: "hammer",
    title: "Gửi đủ trước hạn chót",
    desc: "Gửi đủ mục tiêu mỗi kỳ → tòa nhà 3D của bạn mọc thêm một tầng, streak +1 tuần.",
    tab: "Bước 2/3",
  },
  {
    icon: "gift",
    title: "Nhận lãi & phần thưởng",
    desc: "Streak càng dài, phần thưởng lãi càng lớn. Nhận Paws ở tab Chơi, đổi theme và đồ trang trí ở tab Tôi.",
    tab: "Bước 3/3",
  },
];

/** Onboarding 3 bước cho lần đầu vào app — hiện một lần, lưu cờ trong localStorage. */
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa-800/60" onClick={done}>
      <div
        className="w-full max-w-md rounded-t-3xl border-[3px] border-b-0 border-cocoa-700/70 bg-cream-50 p-5 pb-8 shadow-chunky"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "bannerPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-cocoa-500/30" />
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-cocoa-700/40 bg-white shadow-chunkySm">
            <Icon name={s.icon} size={30} className="text-cocoa-600" />
          </span>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-lavender-500">{s.tab}</div>
            <h3 className="font-cozy text-xl font-extrabold text-cocoa-700">{s.title}</h3>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-cocoa-600">{s.desc}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full border-2 border-cocoa-700/40 ${i === step ? "bg-leaf-400" : i < step ? "bg-lavender-400" : "bg-white"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-cream !px-3 !py-1.5 text-xs" onClick={done}>
              Bỏ qua
            </button>
            <button
              className="btn-cozy !px-4 !py-1.5 text-sm"
              onClick={() => {
                sfx.tab();
                if (last) done();
                else setStep(step + 1);
              }}
            >
              {last ? "Bắt đầu thôi!" : "Tiếp"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
