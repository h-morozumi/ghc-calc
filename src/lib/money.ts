/**
 * Round half-up to a fixed number of decimal places.
 *
 * Uses a `Number.EPSILON` nudge to counter binary floating-point error that
 * otherwise drops exact `.x5` boundaries down (e.g. `6220.695 * 100` evaluates
 * to `622069.4999…`, which `Math.round` would truncate to `6220.69`).
 */
export function roundHalfUp(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/**
 * Format a monetary amount for display, applying round half-up at the final
 * step. JPY is shown with exactly 2 decimals to match Azure's official pricing
 * calculator (e.g. ￥3,030.60), not the locale-default 0 decimals.
 */
export function formatMoney(value: number, currency: "USD" | "JPY"): string {
  const rounded = roundHalfUp(value, 2);
  return new Intl.NumberFormat(currency === "JPY" ? "ja-JP" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "JPY" ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rounded);
}
