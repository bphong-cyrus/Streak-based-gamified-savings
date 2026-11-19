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
  // Lô 3 — tính năng mới (xem contracts/FEATURES3.md)
  savingCircle: (process.env.NEXT_PUBLIC_SAVINGCIRCLE_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  mentorHub: (process.env.NEXT_PUBLIC_MENTORHUB_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  celebrationPool: (process.env.NEXT_PUBLIC_CELEBRATIONPOOL_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  web3Mail: (process.env.NEXT_PUBLIC_WEB3MAIL_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  guildWars: (process.env.NEXT_PUBLIC_GUILDWARS_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  prizeLinked: (process.env.NEXT_PUBLIC_PRIZELINKED_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  savingsBond: (process.env.NEXT_PUBLIC_SAVINGSBOND_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  paycheckSplitter: (process.env.NEXT_PUBLIC_PAYCHECKSPLITTER_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  termLock: (process.env.NEXT_PUBLIC_TERMLOCK_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  predictionBox: (process.env.NEXT_PUBLIC_PREDICTIONBOX_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  petCompanion: (process.env.NEXT_PUBLIC_PETCOMPANION_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  kingOfTheHill: (process.env.NEXT_PUBLIC_KINGOFTHEHILL_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  timeCapsule: (process.env.NEXT_PUBLIC_TIMECAPSULE_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  guardianRecovery: (process.env.NEXT_PUBLIC_GUARDIANRECOVERY_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  gemStaking: (process.env.NEXT_PUBLIC_GEMSTAKING_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  emergencyHatch: (process.env.NEXT_PUBLIC_EMERGENCYHATCH_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  stampsCollection: (process.env.NEXT_PUBLIC_STAMPSCOLLECTION_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  vaultCredit: (process.env.NEXT_PUBLIC_VAULTCREDIT_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  goalTemplates: (process.env.NEXT_PUBLIC_GOALTEMPLATES_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  savingsJournal: (process.env.NEXT_PUBLIC_SAVINGSJOURNAL_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  feeRebate: (process.env.NEXT_PUBLIC_FEEREBATE_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  charityPot: (process.env.NEXT_PUBLIC_CHARITYPOT_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  spendingLimit: (process.env.NEXT_PUBLIC_SPENDINGLIMIT_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
};

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export function isConfigured(address: `0x${string}` | undefined): boolean {
  return !!address && address !== ZERO;
}

export function explorerTx(hash: string) {
  return `https://testnet.snowtrace.io/tx/${hash}`;
}
