import { describe, it, expect } from "vitest";
import { roundHalfUp, formatMoney } from "@/lib/money";

describe("roundHalfUp", () => {
  it("rounds .x5 boundaries up despite float error", () => {
    expect(roundHalfUp(3030.595)).toBe(3030.6);
    expect(roundHalfUp(6220.695)).toBe(6220.7);
    expect(roundHalfUp(1.59505)).toBe(1.6);
  });

  it("leaves shorter decimals untouched", () => {
    expect(roundHalfUp(6.3802)).toBe(6.38);
  });

  it("matches the official calculator for seat prices (USD × rate)", () => {
    expect(roundHalfUp(19 * 159.505)).toBe(3030.6);
    expect(roundHalfUp(39 * 159.505)).toBe(6220.7);
  });

  it("honours a custom decimal-place count", () => {
    expect(roundHalfUp(1.23456, 3)).toBe(1.235);
    expect(roundHalfUp(12.5, 0)).toBe(13);
  });
});

describe("formatMoney", () => {
  it("keeps exactly 2 decimals for JPY (matches official calculator)", () => {
    expect(formatMoney(6220.695, "JPY")).toContain("6,220.70");
    expect(formatMoney(3030.595, "JPY")).toContain("3,030.60");
    expect(formatMoney(19 * 159.505, "JPY")).toContain("3,030.60");
    expect(formatMoney(39 * 159.505, "JPY")).toContain("6,220.70");
  });

  it("formats USD amounts", () => {
    expect(formatMoney(19, "USD")).toContain("19");
  });
});
