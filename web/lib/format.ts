import { formatUnits, parseUnits } from "viem";

/** Định dạng số mUSDC (6 decimals) theo kiểu Việt Nam: 12.480.000 */
export function fmt(amount: bigint | undefined, digits = 0): string {
  if (amount === undefined) return "—";
  const n = Number(formatUnits(amount, 6));
  return n.toLocaleString("vi-VN", { maximumFractionDigits: digits });
}

/** Parse chuỗi nhập "5" / "5,5" thành đơn vị nhỏ nhất. Trả null nếu không hợp lệ. */
export function parseAmount(raw: string): bigint | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed || Number.isNaN(Number(trimmed))) return null;
  try {
    const v = parseUnits(trimmed, 6);
    return v > 0n ? v : null;
  } catch {
    return null;
  }
}

export function shortAddr(address: string | undefined): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
