"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId } from "wagmi";
import { targetChainId, fuji } from "@/lib/config";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <button className="btn-primary !h-9 !px-3.5 !py-1.5 text-sm" disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
        {isPending ? "Đang kết nối…" : "Kết nối ví"}
      </button>
    );
  }

  const wrongChain = chainId !== targetChainId;

  if (wrongChain) {
    return (
      <button className="btn-primary !h-9 !px-3.5 !py-1.5 text-sm" onClick={() => switchChain({ chainId: targetChainId })}>
        Chuyển {fuji.name}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-lg border border-border bg-surface px-2.5 py-1.5 font-mono text-xs font-bold text-ink-soft sm:inline">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <button className="btn-secondary !h-9 !px-3 !py-1.5 text-xs" onClick={() => disconnect()}>
        Ngắt
      </button>
    </div>
  );
}
