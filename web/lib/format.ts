import { parseUnits } from "viem";

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Displays a 6-decimal token amount without converting it to a floating-point number. */
export function fmt(amount: bigint | undefined, digits = 0, locale = "vi-VN"): string {
  if (amount === undefined) return "—";
  const neg = amount < 0n;
  const abs = neg ? -amount : amount;
  const whole = abs / 1_000_000n;
  const frac = abs % 1_000_000n;
  let formatter = numberFormats.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { numberingSystem: "latn" });
    numberFormats.set(locale, formatter);
  }
  const wholeStr = formatter.format(neg ? (whole === 0n ? -0 : -whole) : whole);
  if (frac === 0n) return wholeStr;

  const fracStr = frac.toString().padStart(6, "0").slice(0, 6);
  const cut = digits === 0 ? 2 : Math.min(digits, 6);
  let shown = fracStr.slice(0, cut);
  if (digits === 0) {
    // mặc định: bỏ số 0 thừa, giữ tối đa 2 chữ số (0,80 → "0,8" là đủ rõ)
    shown = shown.replace(/0+$/, "");
    if (!shown) return wholeStr;
  }
  const decimal = formatter.formatToParts(0.1).find(({ type }) => type === "decimal")?.value ?? ".";
  return `${wholeStr}${decimal}${shown}`;
}

/** Convert digits from supported keyboards to the ASCII form used by token parsers. */
export function normalizeDigits(raw: string): string {
  const zeroes = [0x0660, 0x06f0, 0x0966, 0x09e6, 0xff10];
  return raw.replace(/[٠-٩۰-۹०-९০-৯０-９]/g, (char) => {
    const code = char.charCodeAt(0);
    return String(code - zeroes.find((zero) => code >= zero && code <= zero + 9)!);
  });
}

/** Parse a user-entered token amount into the smallest on-chain unit. */
export function parseAmount(raw: string): bigint | null {
  const trimmed = normalizeDigits(raw).trim().replace(/\s/g, "").replace(/[,٫]/, ".");
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
