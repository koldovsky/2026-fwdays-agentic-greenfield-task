import { describe, expect, it } from "vitest";
import { mapNbuRates } from "./mapRates";

/** @trace FR-RATES-02 */
describe("mapNbuRates", () => {
  it("maps a valid NBU response into domain Rate objects", () => {
    const raw = [
      { r030: 840, txt: "Долар США", rate: 44.9229, cc: "USD", exchangedate: "30.06.2026", special: null },
      { r030: 978, txt: "Євро", rate: 51.1669, cc: "EUR", exchangedate: "30.06.2026", special: null },
    ];
    expect(mapNbuRates(raw)).toEqual([
      { code: "EUR", name: "Євро", rate: 51.1669, exchangeDate: "30.06.2026" },
      { code: "USD", name: "Долар США", rate: 44.9229, exchangeDate: "30.06.2026" },
    ]);
  });

  it("sorts the result by ISO code ascending", () => {
    const raw = [
      { cc: "PLN", txt: "Злотий", rate: 11.9, exchangedate: "30.06.2026" },
      { cc: "AUD", txt: "Австралійський долар", rate: 30.9, exchangedate: "30.06.2026" },
      { cc: "USD", txt: "Долар США", rate: 44.9, exchangedate: "30.06.2026" },
    ];
    expect(mapNbuRates(raw).map((r) => r.code)).toEqual(["AUD", "PLN", "USD"]);
  });

  it("returns an empty array for non-array input", () => {
    expect(mapNbuRates(null)).toEqual([]);
    expect(mapNbuRates(undefined)).toEqual([]);
    expect(mapNbuRates({})).toEqual([]);
    expect(mapNbuRates("not an array")).toEqual([]);
  });

  it("drops entries missing a string code", () => {
    const raw = [{ txt: "Долар США", rate: 44.9, exchangedate: "30.06.2026" }];
    expect(mapNbuRates(raw)).toEqual([]);
  });

  it("drops entries missing a string name", () => {
    const raw = [{ cc: "USD", rate: 44.9, exchangedate: "30.06.2026" }];
    expect(mapNbuRates(raw)).toEqual([]);
  });

  it("drops entries with a non-finite rate", () => {
    const raw = [
      { cc: "USD", txt: "Долар США", rate: "44.9", exchangedate: "30.06.2026" },
      { cc: "EUR", txt: "Євро", rate: Number.NaN, exchangedate: "30.06.2026" },
      { cc: "GBP", txt: "Фунт стерлінгів", rate: Number.POSITIVE_INFINITY, exchangedate: "30.06.2026" },
    ];
    expect(mapNbuRates(raw)).toEqual([]);
  });

  it("drops entries missing exchangedate", () => {
    const raw = [{ cc: "USD", txt: "Долар США", rate: 44.9 }];
    expect(mapNbuRates(raw)).toEqual([]);
  });

  it("never throws on a malformed mixed array", () => {
    const raw = [null, undefined, 42, "string", [], { cc: "USD", txt: "Долар США", rate: 44.9, exchangedate: "30.06.2026" }];
    expect(() => mapNbuRates(raw)).not.toThrow();
    expect(mapNbuRates(raw)).toEqual([
      { code: "USD", name: "Долар США", rate: 44.9, exchangeDate: "30.06.2026" },
    ]);
  });
});
