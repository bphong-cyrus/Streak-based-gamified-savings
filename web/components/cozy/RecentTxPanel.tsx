"use client";

import { useEffect, useState } from "react";
import { explorerTx } from "@/lib/config";
import { readTxLog, type TxLogEntry } from "@/components/useTx";
import { FeatureCard } from "@/components/cozy/panel";
import { shortAddr } from "@/lib/format";

export function RecentTxPanel() {
  const [log, setLog] = useState<TxLogEntry[]>([]);

  useEffect(() => {
    const update = () => setLog(readTxLog());
    update();
    window.addEventListener("cozy-txlog", update);
    return () => window.removeEventListener("cozy-txlog", update);
  }, []);

  if (log.length === 0) return null;

  return (
    <FeatureCard icon="refresh" title="Giao dịch gần đây" desc="Mỗi dòng đều kiểm chứng được trên Snowtrace">
      <ul className="space-y-1.5">
        {log.map((e) => (
          <li key={e.hash} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm">
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">{e.label}</span>
            <a
              className="shrink-0 font-mono text-[11px] font-bold text-cta underline"
              href={explorerTx(e.hash)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortAddr(e.hash)}
            </a>
          </li>
        ))}
      </ul>
      <button
        className="btn-secondary mt-3 w-full !py-1.5 text-xs"
        onClick={() => {
          localStorage.removeItem("cozy-txlog");
          window.dispatchEvent(new Event("cozy-txlog"));
        }}
      >
        Xoá nhật ký
      </button>
    </FeatureCard>
  );
}
