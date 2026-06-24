import { pricing, getPlan } from "@/data/pricing";
import type { PlanId, PppTier } from "@/lib/types";

/** A bucket of users sharing the same monthly AI Credit consumption. */
export interface UserSegment {
  id: string;
  label: string;
  count: number;
  /** AI Credits consumed per user per month. */
  creditsPerMonth: number;
}

/**
 * GitHub Pre-Purchase Plan (PPP) selection.
 *
 * PPP is an UPFRONT, one-year prepayment. You pick one of the published tiers
 * (P1/P2/P3), each a fixed number of commit units (1 CU = $1 of qualifying
 * GitHub usage) at a fixed discount, and buy it in a whole-number quantity.
 * Purchased CUs pay down usage during the term; usage beyond your total
 * commitment is billed at pay-as-you-go.
 */
export interface PppSelection {
  enabled: boolean;
  /** Selected tier id (e.g. "p1", "p2", "p3"). */
  tierId: string;
  /** How many units of the selected tier to buy (whole number ≥ 1). */
  quantity: number;
}

export interface EstimateInput {
  planId: PlanId;
  seats: number;
  segments: UserSegment[];
  includePromo: boolean;
  ppp: PppSelection;
  /** Currency to convert into, e.g. "JPY". Omit for catalog currency only. */
  targetCurrency?: string;
}

/** Prepayment economics for a one-year PPP commitment, in catalog currency. */
export interface PppResult {
  discountPct: number;
  /** Selected tier id. */
  tierId: string;
  /** Units of the tier purchased. */
  quantity: number;
  /** Total commit units bought = tier.commitUnits × quantity. */
  committedUnits: number;
  /** Upfront commitment at retail value (USD of usage it can pay down). */
  committedUsd: number;
  /** Annual qualifying usage actually covered by the commitment. */
  coveredAnnualUsd: number;
  /** Annual usage beyond the commitment, billed at pay-as-you-go (full price). */
  uncoveredAnnualUsd: number;
  /** What you actually pay upfront = committed × (1 − discount). */
  upfrontUsd: number;
  /** Effective total annual cost = upfront + uncovered PAYG usage. */
  effectiveAnnualUsd: number;
  /** Effective annual cost spread over 12 months (for comparison only). */
  effectiveMonthlyUsd: number;
  /** Prepaid value left unused because the commit exceeds annual usage. */
  wastedUsd: number;
  /** Savings vs. pure pay-as-you-go over the year (can be negative). */
  savingsUsd: number;
}

export interface EstimateResult {
  planId: PlanId;
  seats: number;
  currency: string;

  includedCreditsPerSeat: number;
  promoCreditsPerSeat: number;
  totalIncludedCredits: number;
  totalConsumedCredits: number;
  overageCredits: number;
  assignedUsers: number;

  seatCostMonthly: number;
  overageCostMonthly: number;
  /** Pay-as-you-go recurring cost (seat + overage), no PPP applied. */
  paygMonthly: number;
  paygAnnual: number;

  ppp?: PppResult;

  targetCurrency?: string;
  fxRate?: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Generous upper bound used to keep inputs finite and chart-friendly. */
export const MAX_INPUT = 1e9;

/** Clamp a value to a finite, non-negative number within [0, MAX_INPUT]. */
export function finiteNonNeg(n: number, fallback = 0): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_INPUT, Math.max(0, n));
}

function isPromoActive(from: string, to: string, asOf: Date): boolean {
  const f = new Date(from + "T00:00:00Z").getTime();
  const t = new Date(to + "T23:59:59Z").getTime();
  const now = asOf.getTime();
  return now >= f && now <= t;
}

/** Extra included credits per seat from active promotions for the given plan. */
export function resolvePromoCreditsPerSeat(
  planId: PlanId,
  includePromo: boolean,
  asOf: Date = new Date(),
): number {
  if (!includePromo) return 0;
  return pricing.promotions
    .filter((p) => isPromoActive(p.validFrom, p.validTo, asOf))
    .reduce((sum, p) => sum + (p.extraCreditsPerSeat[planId] ?? 0), 0);
}

/** Look up a PPP tier by id, falling back to the first tier. */
export function getPppTier(tierId: string): PppTier {
  return pricing.pppTiers.find((t) => t.id === tierId) ?? pricing.pppTiers[0];
}

/** Normalize the purchased quantity to a finite whole number in [1, MAX_INPUT]. */
export function normalizePppQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.min(MAX_INPUT, Math.floor(quantity)));
}

/** Resolve the effective PPP discount percentage for a selection. */
export function resolvePppDiscountPct(ppp: PppSelection): number {
  if (!ppp.enabled) return 0;
  return getPppTier(ppp.tierId).discountPct;
}

/** Compute the prepayment economics of a PPP commitment against annual usage. */
export function computePpp(
  ppp: PppSelection,
  paygAnnualUsd: number,
): PppResult | undefined {
  if (!ppp.enabled) return undefined;

  const tier = getPppTier(ppp.tierId);
  const quantity = normalizePppQuantity(ppp.quantity);
  const committedUnits = tier.commitUnits * quantity;
  const committedUsd = committedUnits; // 1 CU = $1 of retail usage
  const discountPct = tier.discountPct;

  const coveredAnnualUsd = Math.min(paygAnnualUsd, committedUsd);
  const uncoveredAnnualUsd = Math.max(0, paygAnnualUsd - committedUsd);
  const wastedUsd = Math.max(0, committedUsd - paygAnnualUsd);

  const upfrontUsd = committedUsd * (1 - discountPct / 100);
  const effectiveAnnualUsd = upfrontUsd + uncoveredAnnualUsd;
  const savingsUsd = paygAnnualUsd - effectiveAnnualUsd;

  return {
    discountPct,
    tierId: tier.id,
    quantity,
    committedUnits,
    committedUsd: round2(committedUsd),
    coveredAnnualUsd: round2(coveredAnnualUsd),
    uncoveredAnnualUsd: round2(uncoveredAnnualUsd),
    upfrontUsd: round2(upfrontUsd),
    effectiveAnnualUsd: round2(effectiveAnnualUsd),
    effectiveMonthlyUsd: round2(effectiveAnnualUsd / 12),
    wastedUsd: round2(wastedUsd),
    savingsUsd: round2(savingsUsd),
  };
}

export function estimate(
  input: EstimateInput,
  asOf: Date = new Date(),
): EstimateResult {
  const plan = getPlan(input.planId);
  const seats = finiteNonNeg(input.seats);

  const promoCreditsPerSeat = resolvePromoCreditsPerSeat(
    input.planId,
    input.includePromo,
    asOf,
  );
  const includedCreditsPerSeat = plan.includedCreditsPerSeat;
  const totalIncludedCredits =
    (includedCreditsPerSeat + promoCreditsPerSeat) * seats;

  const totalConsumedCredits = input.segments.reduce(
    (sum, s) => sum + finiteNonNeg(s.count) * finiteNonNeg(s.creditsPerMonth),
    0,
  );
  const assignedUsers = input.segments.reduce(
    (sum, s) => sum + finiteNonNeg(s.count),
    0,
  );

  const overageCredits = Math.max(0, totalConsumedCredits - totalIncludedCredits);

  const seatCostMonthly = seats * plan.seatPriceMonthly;
  const overageCostMonthly = overageCredits * pricing.overage.creditUnitPrice;
  const paygMonthly = seatCostMonthly + overageCostMonthly;
  const paygAnnual = paygMonthly * 12;

  const ppp = computePpp(input.ppp, paygAnnual);

  const result: EstimateResult = {
    planId: input.planId,
    seats,
    currency: pricing.currency,
    includedCreditsPerSeat,
    promoCreditsPerSeat,
    totalIncludedCredits,
    totalConsumedCredits,
    overageCredits,
    assignedUsers,
    seatCostMonthly: round2(seatCostMonthly),
    overageCostMonthly: round2(overageCostMonthly),
    paygMonthly: round2(paygMonthly),
    paygAnnual: round2(paygAnnual),
    ppp,
  };

  if (input.targetCurrency && input.targetCurrency !== pricing.currency) {
    const rate = pricing.fx.rates[input.targetCurrency];
    if (rate) {
      result.targetCurrency = input.targetCurrency;
      result.fxRate = rate;
    }
  }

  return result;
}

/** Headline monthly cost: PPP effective if committed, else pay-as-you-go. */
export function headlineMonthly(r: EstimateResult): number {
  return r.ppp ? r.ppp.effectiveMonthlyUsd : r.paygMonthly;
}

/** Headline annual cost: PPP effective if committed, else pay-as-you-go. */
export function headlineAnnual(r: EstimateResult): number {
  return r.ppp ? r.ppp.effectiveAnnualUsd : r.paygAnnual;
}

/** Convenience: estimate the same usage under both plans for comparison. */
export function comparePlans(
  input: Omit<EstimateInput, "planId">,
  asOf: Date = new Date(),
): Record<PlanId, EstimateResult> {
  return {
    business: estimate({ ...input, planId: "business" }, asOf),
    enterprise: estimate({ ...input, planId: "enterprise" }, asOf),
  };
}
