/**
 * Sync GitHub Copilot pricing & FX from the Azure Retail Prices API.
 *
 * Run with: `pnpm sync:pricing`
 *
 * Design (see docs/specs/pricing-sync.md):
 *  - Uses Node 20+ global `fetch` only — no external HTTP libraries.
 *  - Fetches USD + JPY meters for two product filters, paginating NextPageLink.
 *  - De-duplicates by (skuName, meterName); meterId is NOT unique for PPP.
 *  - Recovers the single FX rate from the largest meter (PPP 500,000 GHAICCUs).
 *  - Guards: every Copilot AND PPP meter's implied rate must match within ±0.001.
 *  - Preserves policy values (includedCreditsPerSeat, promotions) untouched.
 *  - Bumps `version`/`fx.capturedAt` ONLY when a synced value actually changed,
 *    so the monthly cron is a no-op (and opens no PR) when prices are stable.
 *  - On network failure or guard failure: writes nothing and exits 1.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRICING_PATH = resolve(__dirname, "../src/data/pricing.json");
const PR_BODY_PATH = resolve(__dirname, "../pricing-sync-body.md");

const API_BASE =
  "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview";

const FILTER_COPILOT =
  "serviceName eq 'GitHub' and productName eq 'GitHub Copilot'";
const FILTER_PPP =
  "serviceName eq 'GitHub' and productName eq 'GitHub AI Credits Pre-Purchase Plan'";

const RATE_TOLERANCE = 0.001;
const RECOVERY_SKU = "500,000 GHAICCUs";

/** Expected upfront USD price per PPP commit-unit count (for drift warnings). */
const PPP_EXPECTED_UPFRONT: Record<number, number> = {
  20000: 19000,
  100000: 90000,
  500000: 425000,
};

const FX_NOTE =
  "Azure's fixed monthly billing rate, applied uniformly to USD prices. Displayed with round half-up (2dp) to match the official pricing calculator. Not a live market FX rate.";

interface RetailItem {
  currencyCode: string;
  retailPrice: number;
  unitPrice: number;
  productName: string;
  skuName: string;
  meterName: string;
  meterId: string;
  type: string; // priceType: Consumption | Reservation | ...
}

interface RetailResponse {
  Items: RetailItem[];
  NextPageLink: string | null;
}

interface PppSnapshot {
  commitUnits: number;
  discountPct: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch one page with exponential-backoff retry (max 3 attempts). */
async function fetchPage(url: string): Promise<RetailResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** (attempt - 1));
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} for ${url}`);
        continue;
      }
      return (await res.json()) as RetailResponse;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Fetch all pages for a currency + OData filter, following NextPageLink. */
async function fetchAll(
  currency: "USD" | "JPY",
  filter: string,
): Promise<RetailItem[]> {
  const items: RetailItem[] = [];
  let url: string | null =
    `${API_BASE}&currencyCode='${currency}'&$filter=${encodeURIComponent(filter)}`;
  while (url) {
    const page: RetailResponse = await fetchPage(url);
    items.push(...page.Items);
    url = page.NextPageLink;
  }
  return items;
}

const key = (skuName: string, meterName: string) => `${skuName}||${meterName}`;

/**
 * De-duplicate items by (skuName, meterName). When `preferType` is given, an
 * item whose priceType matches is preferred over one that does not.
 */
function uniqueByKey(
  items: RetailItem[],
  preferType?: string,
): Map<string, RetailItem> {
  const map = new Map<string, RetailItem>();
  for (const it of items) {
    const k = key(it.skuName, it.meterName);
    const existing = map.get(k);
    if (!existing) {
      map.set(k, it);
      continue;
    }
    if (preferType && existing.type !== preferType && it.type === preferType) {
      map.set(k, it);
    }
  }
  return map;
}

function findOne(
  map: Map<string, RetailItem>,
  skuName: string,
  meterName: string,
): RetailItem | undefined {
  return map.get(key(skuName, meterName));
}

/** Parse the numeric commit-unit count from a SKU name like "20,000 GHAICCUs". */
function parseUnits(skuName: string): number {
  return Number(skuName.replace(/[^0-9]/g, ""));
}

function warnIfOff(label: string, actual: number, expected: number): void {
  if (expected === 0) return;
  const drift = Math.abs(actual - expected) / expected;
  if (drift > 0.01) {
    console.warn(
      `WARN: ${label} = ${actual} drifts ${(drift * 100).toFixed(1)}% from expected ${expected}`,
    );
  }
}

function checkType(item: RetailItem, expected: string, label: string): void {
  if (item.type !== expected) {
    console.warn(
      `WARN: ${label} has priceType '${item.type}', expected '${expected}'.`,
    );
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main(): Promise<void> {
  // 1. Fetch USD + JPY for both product filters (in parallel; a single
  //    rejection aborts before any file write — no partial writes possible).
  const [usdCopilot, jpyCopilot, usdPpp, jpyPpp] = await Promise.all([
    fetchAll("USD", FILTER_COPILOT),
    fetchAll("JPY", FILTER_COPILOT),
    fetchAll("USD", FILTER_PPP),
    fetchAll("JPY", FILTER_PPP),
  ]);

  const usdCopilotMap = uniqueByKey(usdCopilot, "Consumption");
  const jpyCopilotMap = uniqueByKey(jpyCopilot, "Consumption");
  const usdPppMap = uniqueByKey(usdPpp, "Reservation");
  const jpyPppMap = uniqueByKey(jpyPpp, "Reservation");

  // 2. Extract Copilot USD values (warn on >1% drift; do not fail).
  const business = findOne(usdCopilotMap, "Business", "Business User");
  const enterprise = findOne(usdCopilotMap, "Enterprise", "Enterprise User");
  const aiCredit = findOne(usdCopilotMap, "AI Credit", "AI Credit GAC");
  const premium = findOne(usdCopilotMap, "Premium Request", "Premium Request");

  if (!business || !enterprise || !aiCredit) {
    throw new Error(
      "Required Copilot meters (Business / Enterprise / AI Credit) not found in API response.",
    );
  }

  checkType(business, "Consumption", "Business seat");
  checkType(enterprise, "Consumption", "Enterprise seat");
  checkType(aiCredit, "Consumption", "AI Credit");
  warnIfOff("Business seat", business.retailPrice, 19);
  warnIfOff("Enterprise seat", enterprise.retailPrice, 39);
  warnIfOff("AI Credit", aiCredit.retailPrice, 0.01);
  if (premium) {
    checkType(premium, "Consumption", "Premium Request");
    warnIfOff("Premium Request", premium.retailPrice, 0.04);
  }

  // 3. Recover the FX rate from the largest meter (PPP 500,000 GHAICCUs).
  //    Prefer the Reservation-typed entry in case Azure returns duplicates.
  const findRecovery = (items: RetailItem[]) =>
    items.find((it) => it.skuName === RECOVERY_SKU && it.type === "Reservation") ??
    items.find((it) => it.skuName === RECOVERY_SKU);
  const usd500 = findRecovery(usdPpp);
  const jpy500 = findRecovery(jpyPpp);
  if (!usd500 || !jpy500 || usd500.retailPrice === 0) {
    throw new Error(`Cannot recover FX rate: '${RECOVERY_SKU}' meter missing.`);
  }
  const rate = jpy500.retailPrice / usd500.retailPrice;

  // 4. Consistency guard: every Copilot AND PPP meter's implied rate must
  //    match the recovered rate within ±0.001. A positive USD meter with no
  //    JPY counterpart is a failure (consistency cannot be proven).
  const guardPairs: Array<[Map<string, RetailItem>, Map<string, RetailItem>]> = [
    [usdCopilotMap, jpyCopilotMap],
    [usdPppMap, jpyPppMap],
  ];
  for (const [usdMap, jpyMap] of guardPairs) {
    for (const [k, usdItem] of usdMap) {
      if (usdItem.retailPrice === 0) continue;
      const jpyItem = jpyMap.get(k);
      if (!jpyItem) {
        throw new Error(
          `FX consistency guard failed: USD meter ${k} has no JPY counterpart. Aborting without writing.`,
        );
      }
      const implied = jpyItem.retailPrice / usdItem.retailPrice;
      if (Math.abs(implied - rate) > RATE_TOLERANCE) {
        throw new Error(
          `FX consistency guard failed for ${k}: implied ${implied} vs recovered ${rate} (>${RATE_TOLERANCE}). Aborting without writing.`,
        );
      }
    }
  }

  // 5. Load current pricing.json. Build a candidate WITHOUT touching the
  //    volatile metadata (version / fx.capturedAt) so the diff check below
  //    reflects only substantive pricing/rate changes.
  const before = readFileSync(PRICING_PATH, "utf8");
  const original = JSON.parse(before);
  const catalog = JSON.parse(before);

  const beforeSnapshot = {
    business: original.plans.find((p: { id: string }) => p.id === "business")
      ?.seatPriceMonthly,
    enterprise: original.plans.find((p: { id: string }) => p.id === "enterprise")
      ?.seatPriceMonthly,
    aiCredit: original.overage.creditUnitPrice,
    rate: original.fx.rates.JPY,
    ppp: original.pppTiers.map(
      (t: PppSnapshot): PppSnapshot => ({
        commitUnits: t.commitUnits,
        discountPct: t.discountPct,
      }),
    ),
  };

  for (const plan of catalog.plans) {
    if (plan.id === "business") plan.seatPriceMonthly = business.retailPrice;
    if (plan.id === "enterprise") plan.seatPriceMonthly = enterprise.retailPrice;
  }
  catalog.overage.creditUnitPrice = aiCredit.retailPrice;
  if (premium) catalog.premiumRequestPrice = premium.retailPrice;

  // PPP tiers: every tier referenced by the catalog MUST exist in the API,
  // else we'd silently leave a stale discount. Re-derive discountPct; keep
  // commitUnits (the GHAICCUs count) as-is.
  for (const tier of catalog.pppTiers) {
    const sku = usdPpp.find(
      (it) =>
        parseUnits(it.skuName) === tier.commitUnits &&
        it.type === "Reservation",
    );
    if (!sku || sku.retailPrice <= 0) {
      throw new Error(
        `PPP tier '${tier.id}' (${tier.commitUnits} CU) not found in API. Aborting without writing.`,
      );
    }
    const expected = PPP_EXPECTED_UPFRONT[tier.commitUnits];
    if (expected) {
      warnIfOff(`PPP ${tier.commitUnits} CU upfront`, sku.retailPrice, expected);
    }
    tier.discountPct = Math.round((1 - sku.retailPrice / tier.commitUnits) * 100);
  }

  // Static FX fields (preserve capturedAt for the no-diff comparison).
  catalog.fx = {
    base: "USD",
    rates: { JPY: rate },
    capturedAt: original.fx?.capturedAt,
    source: "Azure Retail Prices API (api-version=2023-01-01-preview)",
    recoveredFromSku: RECOVERY_SKU,
    note: FX_NOTE,
  };

  // 6. Deep-equal compare with metadata held constant. No substantive change
  //    => do not bump version/capturedAt, do not write, open no PR.
  if (deepEqual(original, catalog)) {
    console.log("no changes");
    return;
  }

  // Substantive change: stamp fresh metadata and write.
  const now = new Date();
  catalog.version = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  catalog.fx.capturedAt = now.toISOString();

  const after = JSON.stringify(catalog, null, 2) + "\n";
  writeFileSync(PRICING_PATH, after, "utf8");

  // 7. Emit a PR body with captured time, recovered rate, and before→after of
  //    the headline values (consumed by the workflow via body-path).
  const fmtPpp = (arr: PppSnapshot[]) =>
    arr
      .map(
        (t) => `${t.commitUnits.toLocaleString("en-US")} CU → ${t.discountPct}%`,
      )
      .join(", ");
  const afterPpp: PppSnapshot[] = catalog.pppTiers.map((t: PppSnapshot) => ({
    commitUnits: t.commitUnits,
    discountPct: t.discountPct,
  }));
  const body = [
    "Automated monthly sync from the Azure Retail Prices API (api-version=2023-01-01-preview).",
    "",
    `- Captured: \`${catalog.fx.capturedAt}\``,
    `- Recovered FX rate (from ${RECOVERY_SKU}): \`${rate}\``,
    "",
    "| Field | Before | After |",
    "|---|---|---|",
    `| Business seat (USD) | ${beforeSnapshot.business} | ${business.retailPrice} |`,
    `| Enterprise seat (USD) | ${beforeSnapshot.enterprise} | ${enterprise.retailPrice} |`,
    `| AI Credit (USD) | ${beforeSnapshot.aiCredit} | ${aiCredit.retailPrice} |`,
    `| FX rate (JPY/USD) | ${beforeSnapshot.rate} | ${rate} |`,
    `| PPP tiers | ${fmtPpp(beforeSnapshot.ppp)} | ${fmtPpp(afterPpp)} |`,
    "",
    "Notes:",
    "- These are **Azure Marketplace** retail prices and are best-effort; they may differ from a direct GitHub.com contract (unofficial tool).",
    "- **Free included credits** (`includedCreditsPerSeat`) and `promotions` are GitHub policy values not present in the API — preserved untouched, update manually.",
    "- `fx` is Azure's fixed **monthly billing rate**, not a live market rate.",
    "",
  ].join("\n");
  writeFileSync(PR_BODY_PATH, body, "utf8");

  console.log(
    `Updated pricing.json: rate=${rate}, business=${business.retailPrice}, enterprise=${enterprise.retailPrice}, aiCredit=${aiCredit.retailPrice}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
