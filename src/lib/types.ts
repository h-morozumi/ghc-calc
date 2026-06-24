export type PlanId = "business" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  /** Per-seat price per month, in the catalog currency (USD). */
  seatPriceMonthly: number;
  /** AI Credits included per seat per month. */
  includedCreditsPerSeat: number;
}

export interface OverageConfig {
  /** Price per AI Credit beyond the included pool, in catalog currency (USD). */
  creditUnitPrice: number;
  note?: string;
}

export interface Promotion {
  id: string;
  label: string;
  /** ISO date (inclusive). */
  validFrom: string;
  /** ISO date (inclusive). */
  validTo: string;
  /** Extra included credits per seat, keyed by plan id. */
  extraCreditsPerSeat: Partial<Record<PlanId, number>>;
}

export interface FxConfig {
  base: string;
  /** Map of currency code -> units of that currency per 1 base unit. */
  rates: Record<string, number>;
}

/** A GitHub Pre-Purchase Plan (PPP) discount tier. */
export interface PppTier {
  id: string;
  label: string;
  /** Commit units in one unit of this tier (1 CU = 1 USD of usage it pays down). */
  commitUnits: number;
  /** Discount applied to qualifying usage, as a percentage (0–100). */
  discountPct: number;
}

export interface PricingCatalog {
  version: string;
  currency: string;
  source: string;
  disclaimer: string;
  plans: Plan[];
  overage: OverageConfig;
  promotions: Promotion[];
  fx: FxConfig;
  pppTiers: PppTier[];
  pppNote: string;
}
