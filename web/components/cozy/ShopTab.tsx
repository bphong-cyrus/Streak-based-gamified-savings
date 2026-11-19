"use client";

import { contracts } from "@/lib/config";
import { gemsAbi, gemShopAbi } from "@/lib/abis";
import { TxFeedback, useTx } from "@/components/useTx";
import { fmtGems, type ShopItemView } from "@/lib/useGemsData";

interface Props {
  themes: ShopItemView[];
  decors: ShopItemView[];
  gemsBalance: bigint;
  gemsAllowance: bigint;
  hasWallet: boolean;
}

/** Panel Cửa hàng: mở khóa theme và đồ trang trí bằng Paws (nằm trong tab Tôi). */
export function ShopPanel({ themes, decors, gemsBalance, gemsAllowance, hasWallet }: Props) {
  const { run, step, hash, error, info } = useTx();

  async function buy(item: ShopItemView, isTheme: boolean) {
    const calls: Parameters<typeof run>[1] = [];
    if (gemsAllowance < item.price) {
      calls.push({
        label: "Đang cấp quyền Paws…",
        call: { address: contracts.gems, abi: gemsAbi, functionName: "approve", args: [contracts.gemShop, item.price] },
      });
    }
    calls.push({
      label: `Đang mua ${item.name}…`,
      call: {
        address: contracts.gemShop,
        abi: gemShopAbi,
        functionName: isTheme ? "buyTheme" : "buyDecor",
        args: [BigInt(item.id)],
      },
    });
    await run(`Mua ${item.name}`, calls);
  }

  function ItemGrid({ items, isTheme }: { items: ShopItemView[]; isTheme: boolean }) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {items
          .filter((i) => i.price > 0n)
          .map((i) => (
            <div key={i.id} className="rounded-xl border-2 border-cream-300 bg-white/80 p-3 text-center">
              <div className="text-3xl">{i.icon}</div>
              <div className="mt-1 font-cozy text-sm font-bold text-cocoa-700">{i.name}</div>
              {i.owned ? (
                <div className="mt-1.5 rounded-lg bg-leaf-300/50 py-1 font-cozy text-xs font-extrabold text-leaf-600">
                  ✅ Đã sở hữu
                </div>
              ) : (
                <button
                  className="btn-cream mt-1.5 w-full !px-2 !py-1.5 text-xs"
                  disabled={!hasWallet || step !== null || gemsBalance < i.price}
                  onClick={() => buy(i, isTheme)}
                >
                  🐾 {fmtGems(i.price)}
                </button>
              )}
            </div>
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card-cream flex items-center justify-between p-4">
        <div>
          <h3 className="font-cozy text-lg font-bold">🛍️ Cửa hàng</h3>
          <p className="text-xs font-semibold text-cocoa-500">Dùng Paws kiếm được từ nhiệm vụ để trang trí tòa nhà</p>
        </div>
        <div className="rounded-xl border-2 border-cocoa-700/40 bg-white/80 px-3 py-1.5 text-center">
          <div className="text-[10px] font-bold uppercase text-cocoa-500">Paws của bạn</div>
          <div className="font-cozy text-lg font-extrabold text-lavender-500">🐾 {fmtGems(gemsBalance)}</div>
        </div>
      </div>

      <div className="card-cream p-4">
        <h4 className="mb-2 font-cozy font-bold">🎨 Theme tòa nhà</h4>
        <ItemGrid items={themes} isTheme />
      </div>

      <div className="card-cream p-4">
        <h4 className="mb-2 font-cozy font-bold">🪑 Đồ trang trí</h4>
        <ItemGrid items={decors} isTheme={false} />
      </div>

      <p className="text-center text-[11px] font-semibold text-cocoa-500">
        Sở hữu ghi on-chain — theme và decor riêng của từng ví, đối chiếu được trên Snowtrace.
      </p>
      <TxFeedback state={{ step, hash, error, info }} />
    </div>
  );
}
