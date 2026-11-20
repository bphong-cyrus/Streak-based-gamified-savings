"use client";

import { useEffect } from "react";
import { Icon } from "@/components/cozy/icons";

/** Màn hình lỗi cozy thay cho crash trắng — giữ được trải nghiệm dù có lỗi runtime. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Savient error:", error.message, error.stack ?? "", error.digest ?? "");
  }, [error]);

  return (
    <div className="sky-day relative flex min-h-screen items-center justify-center px-6">
      <div className="card-cream w-full max-w-sm p-6 text-center">
        <div className="mx-auto w-fit">
          <Icon name="lifebuoy" size={44} className="text-cocoa-500" />
        </div>
        <h2 className="mt-3 font-cozy text-xl font-extrabold text-cocoa-700">Có chút trục trặc nhỏ</h2>
        <p className="mt-1 text-sm font-semibold text-cocoa-500">
          Tiền và streak của bạn vẫn an toàn on-chain. Thử tải lại nhé — lỗi này thường chỉ là hên xui của RPC Fuji.
        </p>
        {/* Hiện message lỗi thật để ngườ dùng/báo cáo debug có thể đối chiếu — không chỉ mã digest. */}
        {error.message && (
          <p className="mt-3 max-h-28 overflow-auto break-words rounded-lg bg-cocoa-500/5 p-2 font-mono text-[11px] text-cocoa-500">
            {error.message}
          </p>
        )}
        {error.digest && <p className="mt-2 font-mono text-[10px] text-cocoa-500/70">Mã lỗi: {error.digest}</p>}
        <button className="btn-cozy mt-4 w-full" onClick={reset}>
          Thử lại
        </button>
        <a className="btn-cream mt-2 w-full" href="/">
          Về trang chủ
        </a>
      </div>
    </div>
  );
}
