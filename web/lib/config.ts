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
};

export function explorerTx(hash: string) {
  return `https://testnet.snowtrace.io/tx/${hash}`;
}
