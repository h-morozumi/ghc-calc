import type { PppSelection, UserSegment } from "@/lib/calc";
import { normalizePppQuantity, finiteNonNeg } from "@/lib/calc";
import { pricing } from "@/data/pricing";
import type { PlanId } from "@/lib/types";

/** Full set of inputs that define a shareable estimate scenario. */
export interface Scenario {
  planId: PlanId;
  seats: number;
  segments: UserSegment[];
  includePromo: boolean;
  ppp: PppSelection;
  targetCurrency?: string;
  /** UI language preference (e.g. "en", "ja"). */
  lang?: string;
}

const SCHEMA_VERSION = 1;
const PARAM = "s";

interface Envelope {
  v: number;
  d: Scenario;
}

/** Base64url-encode a UTF-8 string. */
function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a base64url string back to UTF-8. */
function fromBase64Url(input: string): string {
  const padded = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeScenario(scenario: Scenario): string {
  const envelope: Envelope = { v: SCHEMA_VERSION, d: scenario };
  return toBase64Url(JSON.stringify(envelope));
}

export function decodeScenario(encoded: string): Scenario | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as Partial<Envelope>;
    if (!parsed || typeof parsed !== "object" || !parsed.d) return null;
    return parsed.d;
  } catch {
    return null;
  }
}

const VALID_PLANS = new Set(pricing.plans.map((p) => p.id));
const VALID_TIERS = new Set(pricing.pppTiers.map((t) => t.id));
const VALID_CURRENCIES = new Set([
  pricing.currency,
  ...Object.keys(pricing.fx.rates),
]);
const VALID_LANGS = new Set(["en", "ja"]);

function normalizeSegment(raw: unknown, index: number): UserSegment {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<UserSegment>;
  return {
    id: typeof s.id === "string" ? s.id : `seg-${index}`,
    label: typeof s.label === "string" ? s.label : "",
    count: finiteNonNeg(Number(s.count)),
    creditsPerMonth: finiteNonNeg(Number(s.creditsPerMonth)),
  };
}

/**
 * Validate and coerce an untrusted scenario (e.g. decoded from a share URL or
 * an older URL schema) into a safe, fully-populated Scenario. Unknown or
 * malformed fields fall back to the provided defaults so the app never crashes
 * or renders NaN from a bad link.
 */
export function normalizeScenario(
  raw: Partial<Scenario> | null | undefined,
  fallback: Scenario,
): Scenario {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Scenario>;
  const rawPpp = (
    r.ppp && typeof r.ppp === "object" ? r.ppp : {}
  ) as Partial<PppSelection> & { commitUsd?: number };

  const tierId =
    typeof rawPpp.tierId === "string" && VALID_TIERS.has(rawPpp.tierId)
      ? rawPpp.tierId
      : fallback.ppp.tierId;

  return {
    planId: VALID_PLANS.has(r.planId as PlanId)
      ? (r.planId as PlanId)
      : fallback.planId,
    seats: finiteNonNeg(Number(r.seats), fallback.seats),
    segments: Array.isArray(r.segments)
      ? r.segments.map(normalizeSegment)
      : fallback.segments,
    includePromo:
      typeof r.includePromo === "boolean"
        ? r.includePromo
        : fallback.includePromo,
    ppp: {
      enabled: typeof rawPpp.enabled === "boolean" ? rawPpp.enabled : false,
      tierId,
      quantity: normalizePppQuantity(Number(rawPpp.quantity)),
    },
    targetCurrency:
      typeof r.targetCurrency === "string" &&
      VALID_CURRENCIES.has(r.targetCurrency)
        ? r.targetCurrency
        : fallback.targetCurrency,
    lang:
      typeof r.lang === "string" && VALID_LANGS.has(r.lang)
        ? r.lang
        : fallback.lang,
  };
}

/** Read a scenario from the current URL's query string, if present. */
export function getScenarioFromUrl(
  search: string = window.location.search,
): Scenario | null {
  const params = new URLSearchParams(search);
  const encoded = params.get(PARAM);
  return encoded ? decodeScenario(encoded) : null;
}

/** Build a shareable absolute URL for a scenario. */
export function buildShareUrl(
  scenario: Scenario,
  base: string = window.location.origin + window.location.pathname,
): string {
  const params = new URLSearchParams();
  params.set(PARAM, encodeScenario(scenario));
  return `${base}?${params.toString()}`;
}

/** Update the address bar to reflect the scenario without reloading. */
export function syncUrl(scenario: Scenario): void {
  const url = buildShareUrl(scenario);
  window.history.replaceState(null, "", url);
}
