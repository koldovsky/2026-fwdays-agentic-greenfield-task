import { describe, expect, it } from "vitest";
import { filterRates } from "./filterRates";
import type { Rate } from "@/lib/nbu/mapRates";

const RATES: Rate[] = [
  { code: "USD", name: "Долар США", rate: 44.92, exchangeDate: "30.06.2026" },
  { code: "EUR", name: "Євро", rate: 51.17, exchangeDate: "30.06.2026" },
  { code: "PLN", name: "Злотий", rate: 11.93, exchangeDate: "30.06.2026" },
];

/** @trace FR-PICK-01 */
describe("filterRates", () => {
  it("matches by ISO code, case-insensitive", () => {
    expect(filterRates(RATES, "usd").map((r) => r.code)).toEqual(["USD"]);
    expect(filterRates(RATES, "UsD").map((r) => r.code)).toEqual(["USD"]);
  });

  it("matches by Ukrainian name, case-insensitive substring", () => {
    expect(filterRates(RATES, "дол").map((r) => r.code)).toEqual(["USD"]);
    expect(filterRates(RATES, "ЄВРО").map((r) => r.code)).toEqual(["EUR"]);
  });

  it("returns the full list unchanged for an empty query", () => {
    expect(filterRates(RATES, "")).toEqual(RATES);
  });

  it("returns the full list unchanged for a whitespace-only query", () => {
    expect(filterRates(RATES, "   ")).toEqual(RATES);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterRates(RATES, "xyz")).toEqual([]);
  });

  it("never throws on an empty rates array", () => {
    expect(() => filterRates([], "usd")).not.toThrow();
    expect(filterRates([], "usd")).toEqual([]);
  });

  it("matches multiple currencies sharing a substring", () => {
    // "о" appears in "Долар США" name... but assert a real shared-substring case:
    expect(filterRates(RATES, "л").map((r) => r.code).sort()).toEqual(
      ["PLN", "USD"].sort(),
    );
  });
});
