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
      <button className="btn-primary" disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
        {isPending ? "Đang kết nối…" : "Kết nối ví"}
      </button>
    );
  }

  const wrongChain = chainId !== targetChainId;

  return (
    <div className="flex items-center gap-2">
      {wrongChain ? (
        <button className="btn-primary" onClick={() => switchChain({ chainId: targetChainId })}>
          Chuyển sang {fuji.name}
        </button>
      ) : (
        <>
          <span className="hidden rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-slate-300 sm:inline">
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </span>
          <button className="btn-ghost" onClick={() => disconnect()}>
            Ngắt kết nối
          </button>
        </>
      )}
    </div>
  );
}
