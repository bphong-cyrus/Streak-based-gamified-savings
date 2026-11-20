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

/** Địa chỉ Fuji đã deploy sẵn (43113) — dùng làm fallback khi thiếu env, để production/Vercel chạy ngay.
 *  Deployment mới nhất: deployBlock 61371331, deployer 0xe00EA6a4168De3388FbF703DcF24ad55B2150734,
 *  kỳ 180 giây, phí gốc = 0 vĩnh viễn (xem contracts/deployments/43113.json). */
const FUJI_CORE = {
  token: "0xfb898F5D855d5B54F266c6b3D57ED879B619cbbB",
  vault: "0x63Da6fAD88E18888003BFb0DbE1e8F2bfDC01Cd8",
  yieldSource: "0x3110b2D90FB2e6BB2Ae753a98B00b7c86FDade31",
  distributor: "0x90172773fDe524FD9165138b48169D435D9b0150",
  dailyCheckIn: "0x3FdB50B5977A0d0de1D1819cA0dD5ad558af333C",
  goal: "0x6a29Bc0FDafeB58c6160864439b5465f07d4BEb0",
  nft: "0x81AAd1918466Eb736c5Aaa482cd9FA055169d989",
  faucetDrip: "0xA140DF43E89A32487C52c0c90ba8de398c20AC01",
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
