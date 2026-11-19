"use client";

/** Cờ chế độ demo toàn cục — useTx đọc để trả về thông báo mô phỏng thay vì cố gửi tx. */
let demo = false;

export function setDemoMode(v: boolean) {
  demo = v;
}
export function isDemoMode() {
  return demo;
}
