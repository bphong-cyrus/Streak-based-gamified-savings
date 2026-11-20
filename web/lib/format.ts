import { parseUnits } from "viem";

/**
 * Định dạng số mUSDC (6 decimals) kiểu Việt Nam, làm việc trực tiếp trên chuỗi
 * để không mất chính xác với số lớn (tránh qua Number).
 * - Phần nguyên: dấu chấm hằng 3 chữ số (12.480.000).
 * - Phần lẻ: hiện tối đa 2 chữ số khi có lẻ (0,80); làm tròn bình thường.
 * - digits=2: luôn ép 2 chữ số thập phân (cho số dư ví).
 */
export function fmt(amount: bigint | undefined, digits = 0): string {
  if (amount === undefined) return "—";
  const neg = amount < 0n;
  const abs = neg ? -amount : amount;
  const whole = abs / 1_000_000n;
  const frac = abs % 1_000_000n;
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (frac === 0n) return (neg ? "-" : "") + wholeStr;

  const fracStr = frac.toString().padStart(6, "0").slice(0, 6);
  const cut = digits === 0 ? 2 : Math.min(digits, 6);
  let shown = fracStr.slice(0, cut);
  if (digits === 0) {
    // mặc định: bỏ số 0 thừa, giữ tối đa 2 chữ số (0,80 → "0,8" là đủ rõ)
    shown = shown.replace(/0+$/, "");
    if (!shown) return (neg ? "-" : "") + wholeStr;
  }
  return `${neg ? "-" : ""}${wholeStr},${shown}`;
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
