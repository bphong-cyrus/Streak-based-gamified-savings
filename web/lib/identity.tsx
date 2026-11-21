"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";

/**
 * 5 nhân vật con vật đại diện ngườ dùng (SVG tự vẽ theo phong cách outline dày, màu pastel —
 * học hỏi art style từ ảnh mẫu, không sao chép thiết kế gốc).
 * Mặc định gán theo địa chỉ ví; ngườ dùng có thể tự chọn và lưu localStorage.
 */
export const IDENTITIES = [
  { key: "rabbit-office", name: "Thỏ Cà Phê", vi: "Đều đặn mỗi sáng", icon: "☕" },
  { key: "cat-office", name: "Mèo Công Sở", vi: "Chăm chỉ tích lũy", icon: "💼" },
  { key: "cat-farmer", name: "Mèo Nông Trại", vi: "Chậm mà chắc", icon: "🌾" },
  { key: "cat-wizard", name: "Mèo Pháp Sư", vi: "Lãi kỳ diệu", icon: "🔮" },
  { key: "cat-knight", name: "Mèo Hiệp Sĩ", vi: "Giữ chuỗi bất bại", icon: "🛡️" },
] as const;

export function identityIndex(address: string | undefined): number {
  if (!address) return 0;
  return parseInt(address.slice(2, 8), 16) % IDENTITIES.length;
}

// Bản thử (chưa kết nối ví) dùng khóa riêng — vẫn chọn/lưu được nhân vật.
const storageKey = (address: string | undefined) => `cozy-identity:${(address ?? "__demo__").toLowerCase()}`;

export function getStoredIdentity(address: string | undefined): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(storageKey(address));
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < IDENTITIES.length ? n : null;
}

/** Ngườ dùng chọn identity; báo cho mọi component đang hiển thị avatar cập nhật. */
export function pickIdentity(address: string | undefined, idx: number) {
  if (typeof window === "undefined") return;
  // address undefined = bản thử → lưu vào khóa riêng "__demo__", vẫn chuyển được nhân vật.
  localStorage.setItem(storageKey(address), String(idx));
  window.dispatchEvent(new Event("cozy-identity"));
}

export function identityOf(address: string | undefined) {
  return IDENTITIES[identityIndex(address)];
}

/** Identity hiện tại của ví: lựa chọn của user nếu có, không thì mặc định theo địa chỉ. */
export function useIdentityIndex(address: string | undefined): number {
  const [idx, setIdx] = useState(() => getStoredIdentity(address) ?? identityIndex(address));
  useEffect(() => {
    const update = () => setIdx(getStoredIdentity(address) ?? identityIndex(address));
    window.addEventListener("cozy-identity", update);
    return () => window.removeEventListener("cozy-identity", update);
  }, [address]);
  return idx;
}

/** Avatar: ảnh tròn cắt ở vùng mặt (avatar đúng chất), dùng khắp app. */
export function IdentityAvatar({
  address,
  className = "h-10 w-10",
  index,
}: {
  address: string | undefined;
  className?: string;
  /** ép identity cụ thể (vd: trong giao diện chọn). Mặc định theo lựa chọn của ví. */
  index?: number;
}) {
  const chosen = useIdentityIndex(address);
  const idx = index ?? chosen;
  const { t: translate } = useLanguage();
  const id = IDENTITIES[idx];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/identities/${id.key}.svg`}
      alt={translate(id.name)}
      className={`inline-block shrink-0 rounded-full border-2 border-cocoa-700/50 bg-cream-50 object-cover shadow-chunkySm ${className}`}
      style={{ objectPosition: "50% 28%" }}
      draggable={false}
    />
  );
}

/** Ảnh full body (nền trong suốt) — dùng cho cảnh dân đi lại trong tòa nhà. */
export function IdentityFull({
  address,
  className = "h-10 w-auto",
  index,
}: {
  address: string | undefined;
  className?: string;
  index?: number;
}) {
  const chosen = useIdentityIndex(address);
  const idx = index ?? chosen;
  const { t: translate } = useLanguage();
  const id = IDENTITIES[idx];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/identities/${id.key}.svg`}
      alt={translate(id.name)}
      className={`inline-block shrink-0 object-contain ${className}`}
      draggable={false}
    />
  );
}
