"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId } from "wagmi";
import { targetChainId, fuji } from "@/lib/config";

/** Nút kết nối / chuyển mạng, phong cách cozy. Dùng chung cho landing và header. */
export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <button className="btn-cozy !py-2 text-sm" disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
        {isPending ? "Đang kết nối…" : "🔗 Kết nối ví"}
      </button>
    );
  }

  const wrongChain = chainId !== targetChainId;

  if (wrongChain) {
    return (
      <button className="btn-cozy !py-2 text-sm" onClick={() => switchChain({ chainId: targetChainId })}>
        ⛓️ Chuyển sang {fuji.name}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-lg border-2 border-cocoa-700/40 bg-cream-100 px-2 py-1 font-mono text-xs font-bold text-cocoa-600 sm:inline">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <button className="btn-cream !py-2 text-sm" onClick={() => disconnect()}>
        Ngắt
      </button>
    </div>
  );
}
