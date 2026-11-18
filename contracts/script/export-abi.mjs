// Xuất ABI + địa chỉ deploy cho frontend.
// Dùng: node script/export-abi.mjs [outDir]
//   outDir mặc định: ./abi  (IT2 có thể truyền ../web/lib/contracts)
// Yêu cầu: đã chạy `forge build`. Địa chỉ lấy từ deployments/<chainId>.json nếu có.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(process.cwd(), process.argv[2] ?? join(root, "abi"));
const CONTRACTS = [
  "MockUSDC", "StreakVault", "MockYieldSource", "YieldDistributor",
  "Treasury", "AutoSaver", "StreakGroups", "StreakNFT", "Challenges",
  "LuckyWheel", "SavingsGoal", "Leaderboard", "ReminderCenter",
];

mkdirSync(outDir, { recursive: true });

let ts = "// AUTO-GENERATED bởi contracts/script/export-abi.mjs. Không sửa tay.\n\n";
for (const name of CONTRACTS) {
  const artifact = join(root, "out", `${name}.sol`, `${name}.json`);
  if (!existsSync(artifact)) {
    console.error(`Thiếu ${artifact}. Hãy chạy 'forge build' trước.`);
    process.exit(1);
  }
  const { abi } = JSON.parse(readFileSync(artifact, "utf8"));
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(abi, null, 2) + "\n");
  const varName = name.charAt(0).toLowerCase() + name.slice(1) + "Abi";
  ts += `export const ${varName} = ${JSON.stringify(abi, null, 2)} as const;\n\n`;
  console.log(`ABI ${name} -> ${join(outDir, name + ".json")}`);
}

const depDir = join(root, "deployments");
const deployments = {};
if (existsSync(depDir)) {
  for (const f of readdirSync(depDir)) {
    if (!f.endsWith(".json")) continue;
    const d = JSON.parse(readFileSync(join(depDir, f), "utf8"));
    deployments[String(d.chainId)] = d;
  }
}
writeFileSync(join(outDir, "deployments.json"), JSON.stringify(deployments, null, 2) + "\n");
ts += `export const deployments = ${JSON.stringify(deployments, null, 2)} as const;\n`;
writeFileSync(join(outDir, "abis.ts"), ts);
console.log(`Deployments (${Object.keys(deployments).join(", ") || "none"}) -> ${join(outDir, "deployments.json")}`);
console.log(`TypeScript -> ${join(outDir, "abis.ts")}`);
