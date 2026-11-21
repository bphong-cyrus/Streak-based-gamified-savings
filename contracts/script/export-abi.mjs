// Xuất ABI của 8 core contract thẳng vào web/lib/abis.ts (gọn, đúng nhu cầu frontend).
// Dùng: node script/export-abi.mjs          (yêu cầu đã `forge build`)
// Địa chỉ deploy: deployments/<chainId>.json được frontend đọc qua biến môi trường.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webOut = resolve(root, "../web/lib/abis.ts");
const outDir = join(root, "out");

const CONTRACTS = [
  ["MockUSDC", "mockUSDCAbi"],
  ["StreakVault", "streakVaultAbi"],
  ["MockYieldSource", "mockYieldSourceAbi"],
  ["YieldDistributor", "yieldDistributorAbi"],
  ["DailyCheckIn", "dailyCheckInAbi"],
  ["SavingsGoal", "savingsGoalAbi"],
  ["StreakNFT", "streakNFTAbi"],
  ["FaucetDrip", "faucetDripAbi"],
  ["LuckyWheel", "luckyWheelAbi"],
];

let out = "// AUTO-GENERATED bởi contracts/script/export-abi.mjs — KHÔNG sửa tay.\n";
out += "// Chỉ chứa ABI 8 core contract (xem contracts/script/export-abi.mjs).\n\n";

let total = 0;
for (const [name, varName] of CONTRACTS) {
  const path = join(outDir, name + ".sol", name + ".json");
  if (!existsSync(path)) {
    console.error(`Thiếu artifact ${path} — chạy forge build trước.`);
    process.exit(1);
  }
  const abi = JSON.parse(readFileSync(path, "utf8")).abi;
  out += `export const ${varName} = ${JSON.stringify(abi)} as const;\n\n`;
  total += JSON.stringify(abi).length;
}

writeFileSync(webOut, out);
console.log(`Đã ghi ${webOut} (${CONTRACTS.length} ABI, ~${(total / 1024).toFixed(1)}KB)`);
