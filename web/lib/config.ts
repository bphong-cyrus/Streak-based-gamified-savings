import { http, fallback, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

export const fuji = defineChain({
  id: 43113,
  name: "Avalanche Fuji",
  nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Snowtrace", url: "https://testnet.snowtrace.io" },
  },
  testnet: true,
});

export const targetChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 43113);

// Nhiều nguồn RPC dự phòng — Fuji public RPC đôi khi timeout gây lỗi "HTTP request failed".
const fujiTransports = fallback(
  [
    process.env.NEXT_PUBLIC_RPC_URL,
    "https://avalanche-fuji-c-chain.publicnode.com",
    "https://rpc.ankr.com/avalanche_fuji",
    "https://api.avax-test.network/ext/bc/C/rpc",
  ]
    .filter((u): u is string => !!u)
    .map((url) => http(url, { timeout: 15_000 })),
  { retryCount: 3 },
);

export const wagmiConfig = createConfig({
  chains: [fuji],
  connectors: [injected()],
  transports: {
    [fuji.id]: fujiTransports,
  },
});

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** Địa chỉ Fuji đã deploy sẵn (43113) — dùng làm fallback khi thiếu env, để production/Vercel chạy ngay. */
const FUJI_CORE = {
  token: "0x1c0684ad8e5e6B8C1551B9197ACD6Ea821870Efe",
  vault: "0x898676aB9838a23258C98f68D454D0aeFCA44E1E",
  yieldSource: "0xB4A5Fe5620F6F8D5609483819806e7118Add1517",
  distributor: "0xC8Dc7Bf74e7dF17625698B7F41F37287F9e4c98F",
  dailyCheckIn: "0xF115668e510356E3c3b5191f6707Ab7C912f00C8",
  goal: "0x0aAC7c26418d98F036ab55224b4083D0A516557c",
  nft: "0xc812eD731d58a893e45336c930a0eF6C283c4c8A",
  faucetDrip: "0xFc65B124A127C7cD2176f8CaEf7b6A3Eee6543DA",
} as const;

function addr(env: string | undefined, fallbackAddr: string): `0x${string}` {
  return (env && env !== ZERO ? env : fallbackAddr) as `0x${string}`;
}

/** 8 core contract — bấm mọi dữ liệu on-chain của app từ đây. */
export const contracts = {
  token: addr(process.env.NEXT_PUBLIC_TOKEN_ADDRESS, FUJI_CORE.token),
  vault: addr(process.env.NEXT_PUBLIC_VAULT_ADDRESS, FUJI_CORE.vault),
  yieldSource: addr(process.env.NEXT_PUBLIC_YIELD_SOURCE_ADDRESS, FUJI_CORE.yieldSource),
  distributor: addr(process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS, FUJI_CORE.distributor),
  dailyCheckIn: addr(process.env.NEXT_PUBLIC_DAILYCHECKIN_ADDRESS, FUJI_CORE.dailyCheckIn),
  goal: addr(process.env.NEXT_PUBLIC_GOAL_ADDRESS, FUJI_CORE.goal),
  nft: addr(process.env.NEXT_PUBLIC_NFT_ADDRESS, FUJI_CORE.nft),
  faucetDrip: addr(process.env.NEXT_PUBLIC_FAUCET_ADDRESS, FUJI_CORE.faucetDrip),
};

export function explorerTx(hash: string) {
  return `https://testnet.snowtrace.io/tx/${hash}`;
}
