"use client";

import { useEffect, useState } from "react";

/**
 * 9 identity chibi đại diện ngườ dùng (ảnh tại /identities/1..9.png).
 * Mặc định gán theo địa chỉ ví; ngườ dùng có thể tự chọn và lưu localStorage.
 */
export const IDENTITIES = [
  { key: "tech", name: "The Tech Explorer", vi: "Đam mê Công nghệ", icon: "🎧" },
  { key: "artist", name: "The Fantasy Artist", vi: "Sáng tạo & Bay bổng", icon: "🎨" },
  { key: "warrior", name: "The Cyber Warrior", vi: "Cá tính & Game thủ", icon: "⚔️" },
  { key: "nature", name: "The Cozy Nature Lover", vi: "Yêu Thiên nhiên & Bình yên", icon: "🌿" },
  { key: "musician", name: "The Cyber Musician", vi: "Đam mê Âm nhạc", icon: "🎸" },
  { key: "bookworm", name: "The Cozy Bookworm", vi: "Trầm lặng & Tri thức", icon: "📚" },
  { key: "skater", name: "The Street Skater", vi: "Phóng khoáng & Thể thao", icon: "🛹" },
  { key: "cadet", name: "The Space Cadet", vi: "Khám phá & Vũ trụ", icon: "🚀" },
] as const;

export function identityIndex(address: string | undefined): number {
  if (!address) return 3;
  return parseInt(address.slice(2, 8), 16) % IDENTITIES.length;
}

const storageKey = (address: string | undefined) => `cozy-identity:${(address ?? "").toLowerCase()}`;

export function getStoredIdentity(address: string | undefined): number | null {
  if (typeof window === "undefined" || !address) return null;
  const raw = localStorage.getItem(storageKey(address));
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < IDENTITIES.length ? n : null;
}

/** Ngườ dùng chọn identity; báo cho mọi component đang hiển thị avatar cập nhật. */
export function pickIdentity(address: string | undefined, idx: number) {
  if (!address || typeof window === "undefined") return;
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

/** Avatar chibi: ảnh nhân vật đã tách, căn lên trên để lấy mặt trong khung tròn. */
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
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/identities/${idx + 1}.png`}
      alt={IDENTITIES[idx].name}
      className={`inline-block shrink-0 rounded-full border-2 border-cocoa-700/50 bg-cream-50 object-cover shadow-chunkySm ${className}`}
      style={{ objectPosition: "50% 12%" }}
      draggable={false}
    />
  );
}
