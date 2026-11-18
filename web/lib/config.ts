import { http, createConfig } from "wagmi";
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

export const wagmiConfig = createConfig({
  chains: [fuji],
  connectors: [injected()],
  transports: {
    [fuji.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
});

export const contracts = {
  token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`,
  vault: process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`,
  yieldSource: process.env.NEXT_PUBLIC_YIELD_SOURCE_ADDRESS as `0x${string}`,
  distributor: process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS as `0x${string}`,
  gems: (process.env.NEXT_PUBLIC_GEMS_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  missions: (process.env.NEXT_PUBLIC_MISSIONS_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  gemShop: (process.env.NEXT_PUBLIC_GEMSHOP_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  autoSaver: (process.env.NEXT_PUBLIC_AUTOSAVER_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  wheel: (process.env.NEXT_PUBLIC_WHEEL_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  groups: (process.env.NEXT_PUBLIC_GROUPS_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  freezeGift: (process.env.NEXT_PUBLIC_FREEZEGIFT_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  dailyCheckIn: (process.env.NEXT_PUBLIC_DAILYCHECKIN_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  faucetDrip: (process.env.NEXT_PUBLIC_FAUCET_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
};

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export function isConfigured(address: `0x${string}` | undefined): boolean {
  return !!address && address !== ZERO;
}

export function explorerTx(hash: string) {
  return `https://testnet.snowtrace.io/tx/${hash}`;
}
