import { describe, it, expect } from "vitest";
import {
  estimate,
  comparePlans,
  resolvePromoCreditsPerSeat,
  resolvePppDiscountPct,
  getPppTier,
  computePpp,
  normalizePppQuantity,
  finiteNonNeg,
  resolveEffectiveRate,
  type EstimateInput,
} from "@/lib/calc";
import { pricing } from "@/data/pricing";

const BEFORE_PROMO = new Date("2026-05-01T00:00:00Z");
const DURING_PROMO = new Date("2026-07-01T00:00:00Z");

function baseInput(overrides: Partial<EstimateInput> = {}): EstimateInput {
  return {
    planId: "business",
    seats: 10,
    segments: [],
    includePromo: false,
    ppp: { enabled: false, tierId: "p1", quantity: 1 },
    ...overrides,
  };
}

describe("resolveEffectiveRate (FX override)", () => {
  const jpy = pricing.fx.rates.JPY;

  it("uses a valid override rate when provided", () => {
    expect(resolveEffectiveRate("JPY", 150)).toBe(150);
  });

  it("falls back to the bundled rate when override is undefined", () => {
    expect(resolveEffectiveRate("JPY", undefined)).toBe(jpy);
  });

  it("ignores invalid overrides and falls back to the bundled rate", () => {
    expect(resolveEffectiveRate("JPY", NaN)).toBe(jpy);
    expect(resolveEffectiveRate("JPY", 0)).toBe(jpy);
    expect(resolveEffectiveRate("JPY", -10)).toBe(jpy);
    expect(resolveEffectiveRate("JPY", Infinity)).toBe(jpy);
  });

  it("returns undefined for the catalog currency", () => {
    expect(resolveEffectiveRate(pricing.currency, 150)).toBeUndefined();
    expect(resolveEffectiveRate(undefined, 150)).toBeUndefined();
  });

  it("flows the override into estimate() results", () => {
    const withOverride = estimate(
      baseInput({ targetCurrency: "JPY", fxRate: 150 }),
    );
    expect(withOverride.fxRate).toBe(150);

    const withoutOverride = estimate(baseInput({ targetCurrency: "JPY" }));
    expect(withoutOverride.fxRate).toBe(jpy);

    const invalid = estimate(
      baseInput({ targetCurrency: "JPY", fxRate: -5 }),
    );
    expect(invalid.fxRate).toBe(jpy);
  });
});

describe("seat cost and included credits", () => {
  it("computes seat cost with no usage", () => {
    const r = estimate(baseInput({ seats: 10 }), BEFORE_PROMO);
    expect(r.seatCostMonthly).toBe(190); // 10 * $19
    expect(r.totalIncludedCredits).toBe(19000); // 10 * 1900
    expect(r.overageCredits).toBe(0);
    expect(r.paygMonthly).toBe(190);
    expect(r.paygAnnual).toBe(2280);
    expect(r.ppp).toBeUndefined();
  });

  it("pools included credits across seats (no overage under pool)", () => {
    const r = estimate(
      baseInput({
        seats: 10,
        segments: [{ id: "h", label: "heavy", count: 2, creditsPerMonth: 5000 }],
      }),
      BEFORE_PROMO,
    );
    // consumed 10,000 < pool 19,000 -> no overage
    expect(r.totalConsumedCredits).toBe(10000);
    expect(r.overageCredits).toBe(0);
    expect(r.overageCostMonthly).toBe(0);
  });

  it("charges overage beyond the pool", () => {
    const r = estimate(
      baseInput({
        seats: 10,
        segments: [{ id: "h", label: "heavy", count: 10, creditsPerMonth: 3000 }],
      }),
      BEFORE_PROMO,
    );
    // consumed 30,000 - pool 19,000 = 11,000 overage * $0.01 = $110
    expect(r.overageCredits).toBe(11000);
    expect(r.overageCostMonthly).toBe(110);
    expect(r.paygMonthly).toBe(300); // 190 seats + 110 overage
  });
});

describe("promotions", () => {
  it("ignores promo credits outside the active window", () => {
    expect(resolvePromoCreditsPerSeat("business", true, BEFORE_PROMO)).toBe(0);
  });

  it("applies promo credits during the active window", () => {
    expect(resolvePromoCreditsPerSeat("business", true, DURING_PROMO)).toBe(3000);
    expect(resolvePromoCreditsPerSeat("enterprise", true, DURING_PROMO)).toBe(
      7000,
    );
  });

  it("expands the pool when promo is active, reducing overage", () => {
    const r = estimate(
      baseInput({
        seats: 10,
        includePromo: true,
        segments: [{ id: "h", label: "heavy", count: 10, creditsPerMonth: 3000 }],
      }),
      DURING_PROMO,
    );
    // pool = (1900 + 3000) * 10 = 49,000 > consumed 30,000 -> no overage
    expect(r.promoCreditsPerSeat).toBe(3000);
    expect(r.totalIncludedCredits).toBe(49000);
    expect(r.overageCredits).toBe(0);
  });
});

describe("PPP discount resolution", () => {
  it("returns 0 when disabled", () => {
    expect(
      resolvePppDiscountPct({ enabled: false, tierId: "p3", quantity: 1 }),
    ).toBe(0);
  });

  it("uses the selected tier's discount", () => {
    expect(resolvePppDiscountPct({ enabled: true, tierId: "p1", quantity: 1 })).toBe(5);
    expect(resolvePppDiscountPct({ enabled: true, tierId: "p2", quantity: 1 })).toBe(10);
    expect(resolvePppDiscountPct({ enabled: true, tierId: "p3", quantity: 1 })).toBe(15);
  });

  it("exposes the published tier sizes and falls back for unknown ids", () => {
    expect(getPppTier("p1").commitUnits).toBe(20000);
    expect(getPppTier("p2").commitUnits).toBe(100000);
    expect(getPppTier("p3").commitUnits).toBe(500000);
    expect(getPppTier("p1").discountPct).toBe(5);
    // unknown id falls back to the first tier
    expect(getPppTier("nope").id).toBe("p1");
  });
});

describe("PPP prepayment economics", () => {
  it("prepays the committed amount at the tier rate when fully covered", () => {
    // tier p2 ×1 = 100,000 CU, usage 100,000 -> covered fully, no overage, no waste
    const ppp = computePpp({ enabled: true, tierId: "p2", quantity: 1 }, 100000)!;
    expect(ppp.discountPct).toBe(10);
    expect(ppp.quantity).toBe(1);
    expect(ppp.committedUnits).toBe(100000);
    expect(ppp.committedUsd).toBe(100000);
    expect(ppp.coveredAnnualUsd).toBe(100000);
    expect(ppp.uncoveredAnnualUsd).toBe(0);
    expect(ppp.wastedUsd).toBe(0);
    expect(ppp.upfrontUsd).toBe(90000); // 100k * (1 - 0.10)
    expect(ppp.effectiveAnnualUsd).toBe(90000);
    expect(ppp.savingsUsd).toBe(10000); // saved the 10% discount
  });

  it("buys a tier in multiples (quantity) and bills the rest pay-as-you-go", () => {
    // under-commit: tier p1 ×4 = 80,000 CU, usage 100,000 -> 20k uncovered at full price
    const ppp = computePpp({ enabled: true, tierId: "p1", quantity: 4 }, 100000)!;
    expect(ppp.discountPct).toBe(5);
    expect(ppp.quantity).toBe(4);
    expect(ppp.committedUnits).toBe(80000); // 20,000 × 4
    expect(ppp.coveredAnnualUsd).toBe(80000);
    expect(ppp.uncoveredAnnualUsd).toBe(20000);
    expect(ppp.wastedUsd).toBe(0);
    expect(ppp.upfrontUsd).toBe(76000); // 80k * 0.95
    expect(ppp.effectiveAnnualUsd).toBe(96000); // 76k + 20k PAYG
    expect(ppp.savingsUsd).toBe(4000); // only the committed portion is discounted
  });

  it("flags prepaid value wasted when over-committed", () => {
    // over-commit: tier p2 ×1 = 100,000 CU, usage 80,000 -> 20k wasted
    const ppp = computePpp({ enabled: true, tierId: "p2", quantity: 1 }, 80000)!;
    expect(ppp.discountPct).toBe(10);
    expect(ppp.coveredAnnualUsd).toBe(80000);
    expect(ppp.uncoveredAnnualUsd).toBe(0);
    expect(ppp.wastedUsd).toBe(20000);
    expect(ppp.upfrontUsd).toBe(90000); // pay for all 100k at 10% discount
    expect(ppp.effectiveAnnualUsd).toBe(90000);
    // savings = 80k PAYG - 90k effective = -10k (over-commit erased savings)
    expect(ppp.savingsUsd).toBe(-10000);
  });

  it("integrates PPP into estimate() against annual usage", () => {
    const r = estimate(
      baseInput({
        seats: 300,
        ppp: { enabled: true, tierId: "p1", quantity: 3 },
      }),
      BEFORE_PROMO,
    );
    // 300 seats * $19 = $5700/mo -> $68,400/yr usage
    // tier p1 ×3 = 60,000 CU committed (5%): covers 60k, 8.4k uncovered PAYG
    expect(r.paygAnnual).toBe(68400);
    expect(r.ppp!.discountPct).toBe(5);
    expect(r.ppp!.committedUnits).toBe(60000);
    expect(r.ppp!.upfrontUsd).toBe(57000); // 60,000 * 0.95
    expect(r.ppp!.effectiveAnnualUsd).toBe(65400); // 57,000 + 8,400
    expect(r.ppp!.effectiveMonthlyUsd).toBe(5450);
    expect(r.ppp!.savingsUsd).toBe(3000);
  });
});

describe("numeric input hardening", () => {
  it("normalizes PPP quantity to a finite whole number ≥ 1", () => {
    expect(normalizePppQuantity(3)).toBe(3);
    expect(normalizePppQuantity(2.9)).toBe(2); // floored
    expect(normalizePppQuantity(0)).toBe(1);
    expect(normalizePppQuantity(-5)).toBe(1);
    expect(normalizePppQuantity(NaN)).toBe(1);
    expect(normalizePppQuantity(Infinity)).toBe(1);
    expect(Number.isFinite(normalizePppQuantity(1e400))).toBe(true);
  });

  it("clamps values to finite, non-negative numbers", () => {
    expect(finiteNonNeg(42)).toBe(42);
    expect(finiteNonNeg(-1)).toBe(0);
    expect(finiteNonNeg(NaN)).toBe(0);
    expect(finiteNonNeg(NaN, 7)).toBe(7);
    expect(finiteNonNeg(Infinity)).toBe(0); // non-finite → fallback
    expect(finiteNonNeg(1e400)).toBe(0); // 1e400 === Infinity → fallback
    expect(finiteNonNeg(2e9)).toBe(1e9); // clamped to MAX_INPUT
  });

  it("never produces NaN from non-finite seats or usage", () => {
    const r = estimate(
      baseInput({
        seats: Infinity,
        segments: [
          { id: "x", label: "X", count: NaN, creditsPerMonth: Infinity },
        ],
        ppp: { enabled: true, tierId: "p2", quantity: Infinity },
      }),
      BEFORE_PROMO,
    );
    expect(Number.isFinite(r.paygMonthly)).toBe(true);
    expect(Number.isFinite(r.ppp!.upfrontUsd)).toBe(true);
    expect(Number.isFinite(r.ppp!.committedUnits)).toBe(true);
  });
});

describe("FX conversion", () => {
  it("attaches the target currency rate", () => {
    const r = estimate(
      baseInput({ seats: 10, targetCurrency: "JPY" }),
      BEFORE_PROMO,
    );
    expect(r.targetCurrency).toBe("JPY");
    expect(r.fxRate).toBe(pricing.fx.rates.JPY);
  });

  it("skips conversion for the catalog currency", () => {
    const r = estimate(
      baseInput({ seats: 10, targetCurrency: "USD" }),
      BEFORE_PROMO,
    );
    expect(r.fxRate).toBeUndefined();
  });
});

describe("comparePlans", () => {
  it("returns both plans for the same usage", () => {
    const both = comparePlans(
      {
        seats: 50,
        segments: [{ id: "a", label: "avg", count: 50, creditsPerMonth: 2000 }],
        includePromo: false,
        ppp: { enabled: false, tierId: "p1", quantity: 1 },
      },
      BEFORE_PROMO,
    );
    expect(both.business.planId).toBe("business");
    expect(both.enterprise.planId).toBe("enterprise");
    // Enterprise pool is larger, so it should have <= overage than Business
    expect(both.enterprise.overageCredits).toBeLessThanOrEqual(
      both.business.overageCredits,
    );
  });
});
