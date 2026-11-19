"use client";

import Link from "next/link";
import { Icon } from "@/components/cozy/icons";

/** Trang 404 theo phong cách cozy — mèo lạc đường giữa đảo. */
export default function NotFound() {
  return (
    <div className="sky-day relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_0_rgba(70,56,39,0.5)]">
        4🐈4
      </div>
      <p className="mt-3 max-w-xs font-cozy text-lg font-bold text-white drop-shadow-[0_2px_0_rgba(70,56,39,0.45)]">
        Chú mèo tiết kiệm của bạn lạc đường rồi — trang này không tồn tại.
      </p>
      <div className="card-cream mt-6 flex items-center gap-3 px-5 py-3 text-sm font-semibold text-cocoa-600">
        <Icon name="home" size={20} className="text-cocoa-600" />
        Streak của bạn vẫn an toàn, không bị reset đâu!
      </div>
      <Link href="/" className="btn-cozy mt-6">
        Về tòa nhà của tôi
      </Link>
    </div>
  );
}
