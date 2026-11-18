"use client";

import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { Dashboard, useVaultData } from "@/components/Dashboard";
import { SaveActions } from "@/components/SaveActions";
import { Rewards } from "@/components/Rewards";
import { EpochHistory } from "@/components/EpochHistory";
import { targetChainId } from "@/lib/config";

export default function Home() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const data = useVaultData();
  const wrongChain = chainId !== targetChainId;

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-flame-400 via-flame-500 to-rose-500 bg-clip-text text-2xl font-extrabold text-transparent">
            StreakSave
          </h1>
          <p className="text-xs text-slate-400">Tiết kiệm đều — giữ streak — nhận thưởng lớn hơn · Avalanche Fuji</p>
        </div>
        <ConnectButton />
      </header>

      {!isConnected ? (
        <div className="card text-center">
          <div className="text-4xl">🔥</div>
          <h2 className="mt-2 text-lg font-semibold">Bắt đầu chuỗi tiết kiệm của bạn</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
            Đặt mục tiêu gửi mỗi tuần, gửi đúng hạn để giữ streak. Streak càng dài, phần thưởng yield của bạn càng
            lớn. Bỏ một tuần là streak về 0 — nhưng tiền gốc luôn an toàn và rút được anytime.
          </p>
          <div className="mt-4 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : wrongChain ? (
        <div className="card text-center">
          <h2 className="text-lg font-semibold">Sai mạng</h2>
          <p className="mt-1 text-sm text-slate-400">Ứng dụng chạy trên Avalanche Fuji C-Chain (chain ID {targetChainId}).</p>
          <div className="mt-4 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Dashboard data={data} />
          <SaveActions data={data} />
          <Rewards data={data} />
          <EpochHistory currentEpoch={data.account?.currentEpoch} />
          <p className="text-center text-xs text-slate-600">
            Demo mode: mỗi kỳ 180 giây · mUSDC là token thử nghiệm · Yield từ nguồn mô phỏng
          </p>
        </div>
      )}
    </main>
  );
}
