"use client";

import type { ReactNode, SVGProps } from "react";

/**
 * Bộ icon SVG nét vẽ tay (cozy chunky) dùng chung cho cả app.
 * Thay thế emoji ở các điểm chạm chính để giao diện liền mạch, ít cảm giác "template".
 */
export type IconName =
  | "home" | "target" | "users" | "gamepad" | "wrench" | "cat"
  | "bank" | "chart" | "flame" | "paw" | "sun" | "moon"
  | "gift" | "wheel" | "calendar" | "crown" | "ticket" | "flag" | "spark"
  | "bolt" | "shield" | "coin" | "mail" | "book" | "gem" | "trophy"
  | "clock" | "heart" | "snow" | "capsule" | "split" | "card" | "hatch"
  | "lifebuoy" | "piggy" | "droplet" | "sprout" | "check" | "percent"
  | "lock" | "circle" | "rocket" | "send" | "layout" | "key" | "gauge"
  | "grad" | "swap" | "eye" | "x" | "plus" | "minus" | "chevron"
  | "stamp" | "hammer" | "inbox" | "wallet" | "refresh" | "party" | "volume";

const P: Record<IconName, ReactNode> = {
  home: (<><path d="M3.5 11.5 12 4l8.5 7.5" /><path d="M5.5 10v10h13V10" /><path d="M9.5 20v-5h5v5" /></>),
  target: (<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M3 19.5c.7-3.4 3-5.2 6-5.2s5.3 1.8 6 5.2" /><circle cx="16.8" cy="9" r="2.7" /><path d="M16 14.4c2.6.4 4.3 2 4.9 4.6" /></>),
  gamepad: (<><rect x="2.5" y="8" width="19" height="10" rx="5" /><path d="M8 10.8v4M6 12.8h4" /><path d="M15.8 11.3h.01M17.8 14h.01" /></>),
  wrench: (<><path d="M15.5 6.5a4.3 4.3 0 0 0-5.8 5.6L3.5 18.3l2.2 2.2 6.2-6.2a4.3 4.3 0 0 0 5.6-5.8l-3 3-2.6-.6-.6-2.6 3-2z" /></>),
  cat: (<><path d="M4.5 4.5 8 7M19.5 4.5 16 7" /><path d="M4.5 11a7.5 7.5 0 0 1 15 0v6a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 17z" /><path d="M9.5 13h.01M14.5 13h.01" /><path d="M12 15.5c.7.7 1.7.7 2 0" /><path d="M3 13.5h3M3 16h3M18 13.5h3M18 16h3" /></>),
  bank: (<><path d="M3.5 9.5 12 4l8.5 5.5" /><path d="M5 9.5V18M9.3 9.5V18M14.7 9.5V18M19 9.5V18" /><path d="M4 18.5h16M3.5 20.5h17" /></>),
  chart: (<><path d="M4 4v16h16" /><path d="M8 16v-5M12.5 16V8M17 16v-3" /></>),
  flame: (<><path d="M12 22c4 0 6.5-2.7 6.5-6.6 0-4-3.4-6.4-4.4-10-1.9 1.4-2.6 2.9-2.5 4.9-1.3-.5-2.1-1.7-2.3-3.2C7.6 9 5.5 11.3 5.5 15.4 5.5 19.3 8 22 12 22z" /></>),
  paw: (<><circle cx="8" cy="7" r="2" /><circle cx="16" cy="7" r="2" /><circle cx="4.6" cy="11.4" r="1.6" /><circle cx="19.4" cy="11.4" r="1.6" /><path d="M12 11c-3 0-5.5 2.3-5.5 5 0 1.8 1.3 2.8 3 2.8 1 0 1.6-.4 2.5-.4s1.5.4 2.5.4c1.7 0 3-1 3-2.8 0-2.7-2.5-5-5.5-5z" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" /></>),
  moon: (<><path d="M20 13.3A8 8 0 1 1 10.7 4a6.4 6.4 0 0 0 9.3 9.3z" /></>),
  gift: (<><rect x="4" y="9.5" width="16" height="11" rx="1.5" /><path d="M3 6.5h18V9H3z" /><path d="M12 6.5v14" /><path d="M12 6.5C10.5 6.5 9 5.4 9 4.2S10.7 2 11.6 3 12 6.5 12 6.5zm0 0c1.5 0 3-1.1 3-2.3S13.3 2 12.4 3 12 6.5 12 6.5z" /></>),
  wheel: (<><circle cx="12" cy="12" r="8.8" /><circle cx="12" cy="12" r="2.2" /><path d="M12 3.2v6.6M12 14.2v6.6M3.2 12h6.6M14.2 12h6.6M5.8 5.8l4.6 4.6M13.6 13.6l4.6 4.6M18.2 5.8l-4.6 4.6M10.4 13.6l-4.6 4.6" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14.5h.01M12 14.5h.01M16 14.5h.01" /></>),
  crown: (<><path d="M4 16.5 3 7l5.2 3.6L12 4l3.8 6.6L21 7l-1 9.5z" /><path d="M5 19.5h14" /></>),
  ticket: (<><path d="M4 8.5A2 2 0 0 0 6 6.5h12a2 2 0 0 0 2 2V11a2.2 2.2 0 0 0 0 4v2.5a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2V15a2.2 2.2 0 0 0 0-4z" /><path d="M14.5 7v2M14.5 11v2M14.5 15v2" /></>),
  flag: (<><path d="M5 21V4" /><path d="M5 4.5c3-1.6 6 1.6 9 .2 2-.9 4-.9 5-.7v7.5c-1-.2-3-.2-5 .8-3 1.5-6-1.6-9 0" /></>),
  spark: (<><path d="M12 3l1.9 5.4L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.6z" /><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>),
  bolt: (<><path d="M13 2.5 4.5 13.5H11L10 21.5l8.5-11H12z" /></>),
  shield: (<><path d="M12 3l7.5 3v6c0 4.6-3 7.7-7.5 9-4.5-1.3-7.5-4.4-7.5-9V6z" /><path d="M8.8 12l2.2 2.2 4.2-4.2" /></>),
  coin: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9" /><path d="M9.6 9.6c.4-1 1.4-1.6 2.4-1.6 1.4 0 2.4.8 2.4 1.9 0 2.6-4.8 1.4-4.8 4 0 1.1 1 1.9 2.4 1.9 1 0 2-.6 2.4-1.6" /></>),
  mail: (<><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3.5 7.5 12 13.5l8.5-6" /></>),
  book: (<><path d="M6.5 3H20v17.5H6.7A2.7 2.7 0 0 1 4 17.8V5.7A2.7 2.7 0 0 1 6.7 3z" /><path d="M4 17.8c0-1.5 1.2-2.6 2.7-2.6H20" /><path d="M8 7.5h8" /></>),
  gem: (<><path d="M7.5 4h9L20.5 9 12 20.5 3.5 9z" /><path d="M3.5 9h17M9.8 9 12 20.5 14.2 9M7.5 4 9.8 9M16.5 4 14.2 9" /></>),
  trophy: (<><path d="M7.5 4h9v4.7a4.5 4.5 0 0 1-9 0z" /><path d="M7.5 5.2H4.8c0 3 1.3 4.6 3.4 4.9M16.5 5.2h2.7c0 3-1.3 4.6-3.4 4.9" /><path d="M12 13.2v4M8.7 20.7h6.6M10 17.7h4" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.2l3.5 2" /></>),
  heart: (<><path d="M12 20.5s-7.7-4.7-7.7-10A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 7.7 3.3c0 5.3-7.7 10-7.7 10z" /></>),
  snow: (<><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" /><path d="M12 3l-1.8 1.8M12 3l1.8 1.8M12 21l-1.8-1.8M12 21l1.8-1.8" /></>),
  capsule: (<><g transform="rotate(45 12 12)"><rect x="7" y="3.5" width="10" height="17" rx="5" /><path d="M7 12h10" /></g></>),
  split: (<><path d="M12 4v4.5" /><path d="M12 8.5c0 3.5-6 3.5-6 7.5v1M12 8.5c0 3.5 6 3.5 6 7.5v1" /><path d="M4 21h4M16 21h4" /></>),
  card: (<><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18" /><path d="M6.5 14.5h4" /></>),
  hatch: (<><path d="M4 21V4h10.5v17" /><path d="M3 21h18" /><path d="M14.5 12H21m0 0-2.8-2.8M21 12l-2.8 2.8" /></>),
  lifebuoy: (<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.6" /><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" /></>),
  piggy: (<><path d="M4.5 13.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5c0 1.9-.9 3.4-2.4 4.3V20h-2.8v-1.6c-.8.2-1.6.3-2.3.3s-1.5-.1-2.3-.3V20H6.9v-2.2c-1.5-.9-2.4-2.4-2.4-4.3z" /><path d="M4.5 13.5 3 12v3l1.8-.3" /><path d="M15.5 8.5l1-2 2 1.4" /><path d="M10 12h.01" /></>),
  droplet: (<><path d="M12 3s6 6.4 6 10.7a6 6 0 0 1-12 0C6 9.4 12 3 12 3z" /></>),
  sprout: (<><path d="M12 21v-8" /><path d="M12 13c-.4-3.8-3.4-5.8-8-5.2.4 4 3.4 6 8 5.2z" /><path d="M12 11c.4-3.3 3.4-5.3 8-4.7-.4 3.7-3.4 5.7-8 4.7z" /></>),
  check: (<><path d="M4.5 12.5l5 5L19.5 7" /></>),
  percent: (<><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2.2" /><circle cx="17" cy="17" r="2.2" /></>),
  lock: (<><rect x="5.5" y="10.5" width="13" height="10" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /><path d="M12 14.5v2.5" /></>),
  circle: (<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>),
  rocket: (<><path d="M12 2.5c3.2 2.6 4.8 6.2 4.8 9.8 0 1.7-.5 3.2-1.5 4.2H8.7c-1-1-1.5-2.5-1.5-4.2 0-3.6 1.6-7.2 4.8-9.8z" /><circle cx="12" cy="10" r="1.6" /><path d="M8.7 16.5 7 20l3-1M15.3 16.5 17 20l-3-1" /><path d="M12 20.5c-1-1.3-1.4-2.4-.9-3.5.8.4 1.4.4 1.8 0 .5 1.1.1 2.2-.9 3.5z" /></>),
  send: (<><path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-8.3L2.5 9z" /></>),
  layout: (<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9.5h16M9.5 9.5V20" /></>),
  key: (<><circle cx="8" cy="15.5" r="4" /><path d="M11 12.5 20 3.5M16.5 7l2.5 2.5M14 9.5l2 2" /></>),
  gauge: (<><path d="M4.5 19a9 9 0 1 1 15 0" /><path d="M12 15l3.8-5.5" /><circle cx="12" cy="15" r="1" /></>),
  grad: (<><path d="M2.5 9.5 12 5l9.5 4.5L12 14z" /><path d="M6.5 11.5V16c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.5" /><path d="M21.5 10v5" /></>),
  swap: (<><path d="M4 8h13m0 0-3.5-3.5M17 8l-3.5 3.5" /><path d="M20 16H7m0 0 3.5-3.5M7 16l3.5 3.5" /></>),
  eye: (<><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>),
  x: (<><path d="M6 6l12 12M18 6 6 18" /></>),
  plus: (<><path d="M12 4.5v15M4.5 12h15" /></>),
  minus: (<><path d="M4.5 12h15" /></>),
  chevron: (<><path d="M9 5l7 7-7 7" /></>),
  stamp: (<><path d="M6 21h12M7.5 17.5h9V20h-9z" /><path d="M9.5 17.5V13a3.2 3.2 0 0 1-1.6-2.8C7.9 8 9.8 6 12 6s4.1 2 4.1 4.2A3.2 3.2 0 0 1 14.5 13v4.5" /></>),
  hammer: (<><path d="M13.5 4.5 19 10l-2.5 2.5L11 7z" /><path d="M11 7 4 14l3 3 7-7" /><path d="M9.5 15.5 4 21" /></>),
  inbox: (<><path d="M3.5 13.5 6 5h12l2.5 8.5V20h-17z" /><path d="M3.5 13.5H9a3 3 0 0 0 6 0h5.5" /></>),
  wallet: (<><rect x="3" y="6" width="18" height="14" rx="2.5" /><path d="M3 10h18" /><path d="M15.5 14.5h2" /></>),
  refresh: (<><path d="M20 5v5h-5" /><path d="M4 19v-5h5" /><path d="M19.5 10a7.5 7.5 0 0 0-13-3M4.5 14a7.5 7.5 0 0 0 13 3" /></>),
  party: (<><path d="M5 21 7.5 10.5 13.5 16.5z" /><path d="M7.5 10.5 12 6M14 5l.01.01M18 8l.01.01M17 3.5l.01.01M20.5 12l.01.01" /><path d="M14.5 14.5c2 .5 3.5 2 4 4" /></>),
  volume: (<><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z" /><path d="M16.5 8.7a5 5 0 0 1 0 6.6" /><path d="M19 6a9 9 0 0 1 0 12" /></>),
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {P[name]}
    </svg>
  );
}
