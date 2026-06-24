import { describe, it, expect } from "vitest";
import {
  encodeScenario,
  decodeScenario,
  getScenarioFromUrl,
  normalizeScenario,
  type Scenario,
} from "@/lib/share";

const scenario: Scenario = {
  planId: "enterprise",
  seats: 120,
  segments: [
    { id: "light", label: "Light", count: 80, creditsPerMonth: 500 },
    { id: "heavy", label: "Heavy", count: 40, creditsPerMonth: 8000 },
  ],
  includePromo: true,
  ppp: { enabled: true, tierId: "p3", quantity: 1 },
  targetCurrency: "JPY",
  lang: "ja",
};

const fallback: Scenario = {
  planId: "business",
  seats: 50,
  segments: [{ id: "avg", label: "Avg", count: 50, creditsPerMonth: 2000 }],
  includePromo: false,
  ppp: { enabled: false, tierId: "p1", quantity: 1 },
  targetCurrency: "USD",
  lang: "en",
};

describe("scenario encoding", () => {
  it("round-trips through encode/decode", () => {
    const encoded = encodeScenario(scenario);
    expect(typeof encoded).toBe("string");
    expect(decodeScenario(encoded)).toEqual(scenario);
  });

  it("produces URL-safe output (no +, /, =)", () => {
    const encoded = encodeScenario(scenario);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("returns null for garbage input", () => {
    expect(decodeScenario("not-valid-base64!!!")).toBeNull();
    expect(decodeScenario("")).toBeNull();
  });

  it("reads a scenario from a query string", () => {
    const encoded = encodeScenario(scenario);
    expect(getScenarioFromUrl(`?s=${encoded}`)).toEqual(scenario);
    expect(getScenarioFromUrl("?other=1")).toBeNull();
  });
});

describe("normalizeScenario (untrusted input hardening)", () => {
  it("passes a valid scenario through unchanged", () => {
    expect(normalizeScenario(scenario, fallback)).toEqual(scenario);
  });

  it("migrates an old pre-tier PPP URL (commitUsd) without NaN", () => {
    const old = {
      planId: "business",
      seats: 10,
      segments: [],
      includePromo: false,
      ppp: { enabled: true, commitUsd: 50000 },
    } as unknown as Partial<Scenario>;
    const n = normalizeScenario(old, fallback);
    expect(n.ppp.enabled).toBe(true);
    expect(n.ppp.tierId).toBe("p1"); // defaulted, no tierId in old shape
    expect(n.ppp.quantity).toBe(1); // NaN quantity -> 1
    expect(Number.isFinite(n.ppp.quantity)).toBe(true);
  });

  it("defaults a partial PPP object to p1 × 1", () => {
    const n = normalizeScenario(
      { ppp: { enabled: true } } as Partial<Scenario>,
      fallback,
    );
    expect(n.ppp).toEqual({ enabled: true, tierId: "p1", quantity: 1 });
  });

  it("rejects an invalid planId and falls back", () => {
    const n = normalizeScenario(
      { planId: "hacker" } as unknown as Partial<Scenario>,
      fallback,
    );
    expect(n.planId).toBe("business");
  });

  it("replaces non-array segments with the fallback", () => {
    const n = normalizeScenario(
      { segments: "oops" } as unknown as Partial<Scenario>,
      fallback,
    );
    expect(n.segments).toEqual(fallback.segments);
  });

  it("coerces non-finite and non-numeric numeric fields", () => {
    const n = normalizeScenario(
      {
        seats: Infinity,
        segments: [
          { id: "x", label: "X", count: NaN, creditsPerMonth: -5 },
        ],
        ppp: { enabled: true, tierId: "p2", quantity: 1e400 },
      } as unknown as Partial<Scenario>,
      fallback,
    );
    expect(Number.isFinite(n.seats)).toBe(true);
    expect(n.segments[0].count).toBe(0);
    expect(n.segments[0].creditsPerMonth).toBe(0);
    expect(Number.isFinite(n.ppp.quantity)).toBe(true);
  });

  it("treats a non-boolean ppp.enabled as disabled", () => {
    const n = normalizeScenario(
      { ppp: { enabled: "false" } } as unknown as Partial<Scenario>,
      fallback,
    );
    expect(n.ppp.enabled).toBe(false);
  });

  it("rejects an unknown currency and language", () => {
    const n = normalizeScenario(
      { targetCurrency: "XXX", lang: "fr" } as unknown as Partial<Scenario>,
      fallback,
    );
    expect(n.targetCurrency).toBe("USD");
    expect(n.lang).toBe("en");
  });
});
