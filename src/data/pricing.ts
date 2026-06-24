import rawPricing from "@/data/pricing.json";
import type { Plan, PlanId, PricingCatalog } from "@/lib/types";

export const pricing = rawPricing as PricingCatalog;

export function getPlan(id: PlanId): Plan {
  const plan = pricing.plans.find((p) => p.id === id);
  if (!plan) {
    throw new Error(`Unknown plan id: ${id}`);
  }
  return plan;
}
