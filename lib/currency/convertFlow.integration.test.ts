import { describe, expect, it } from "vitest";
import { mapNbuRates } from "@/lib/nbu/mapRates";
import { convert } from "./convert";
import { formatAmount } from "./formatAmount";
import { parseAmount } from "./parseAmount";

/**
 * Integration test for the convert → display flow (CHECKLIST G5).
 *
 * Composes the real pipeline across two modules — NBU response mapping
 * (`lib/nbu/mapRates`) and the converter chain (`lib/currency/{parseAmount,
 * convert,formatAmount}`) — exactly as the app wires them in `Converter.jsx`
 * / `CurrencyFocusPanel.tsx`, without mocking any individual step. Each
 * module already has its own unit tests; this proves they compose correctly
 * end-to-end, including the error/degradation paths a user could actually hit.
 */

// A realistic raw NBU "today" response: valid entries plus deliberately
// malformed ones, mirroring what mapNbuRates's own unit tests cover —
// proving the *whole* pipeline degrades honestly, not just the mapper alone.
const RAW_NBU_RESPONSE = [
  { r030: 840, txt: "Долар США", rate: 44.8478, cc: "USD", exchangedate: "30.06.2026", special: null },
  { r030: 978, txt: "Євро", rate: 51.1669, cc: "EUR", exchangedate: "30.06.2026", special: null },
  { r030: 392, txt: "Єна", rate: 0.27749, cc: "JPY", exchangedate: "30.06.2026", special: null },
  // Malformed entries that a stricter pipeline might choke on:
  { r030: 1, txt: "Зламана валюта", rate: "not-a-number", cc: "ZZZ", exchangedate: "30.06.2026" },
  { cc: "NOX", txt: "Без курсу" },
  null,
];

describe("convert → display flow (integration)", () => {
  it("maps a real NBU response, then converts a locale-aware amount foreign-to-UAH", () => {
    const rates = mapNbuRates(RAW_NBU_RESPONSE);
    const usd = rates.find((r) => r.code === "USD");
    expect(usd).toBeDefined();

    const amount = parseAmount("1 234,50"); // user types a thousands-separated comma amount
    const result = convert(amount, usd!.rate, "foreign-to-uah");
    const displayed = formatAmount(result);

    expect(amount).toBeCloseTo(1234.5, 5);
    expect(displayed).toBe(formatAmount(1234.5 * 44.8478));
  });

  it("converts UAH-to-foreign for a small-rate currency (JPY) without precision loss", () => {
    const rates = mapNbuRates(RAW_NBU_RESPONSE);
    const jpy = rates.find((r) => r.code === "JPY")!;

    const amount = parseAmount("5000");
    const result = convert(amount, jpy.rate, "uah-to-foreign");
    const displayed = formatAmount(result);

    expect(displayed).toBe(formatAmount(5000 / 0.27749));
  });

  it("malformed NBU entries never reach the converter — selecting them is impossible by construction", () => {
    const rates = mapNbuRates(RAW_NBU_RESPONSE);
    // ZZZ (non-finite rate) and NOX (missing rate) are dropped by mapNbuRates,
    // so the UI's currency list never offers them as selectable — the
    // converter can never be invoked with a non-finite rate from real data.
    expect(rates.find((r) => r.code === "ZZZ")).toBeUndefined();
    expect(rates.find((r) => r.code === "NOX")).toBeUndefined();
    expect(rates.map((r) => r.code)).toEqual(["EUR", "JPY", "USD"]);
  });

  it("garbage user input flows through to an honest 0,00 display, never NaN or a throw", () => {
    const rates = mapNbuRates(RAW_NBU_RESPONSE);
    const usd = rates.find((r) => r.code === "USD")!;

    for (const garbage of ["", "   ", "abc", null, undefined]) {
      const amount = parseAmount(garbage);
      const result = convert(amount, usd.rate, "foreign-to-uah");
      const displayed = formatAmount(result);
      expect(displayed).toBe("0,00");
      expect(displayed).not.toMatch(/NaN/);
    }
  });

  it("a defensively-zero/invalid rate (should never occur post-mapping, but guarded anyway) still degrades to 0,00", () => {
    // Belt-and-suspenders: even if a caller bypassed mapNbuRates entirely,
    // the converter chain itself stays total end-to-end.
    const amount = parseAmount("100");
    const result = convert(amount, 0, "foreign-to-uah");
    expect(formatAmount(result)).toBe("0,00");
  });

  it("round-trips foreign→UAH→foreign within floating-point tolerance", () => {
    const rates = mapNbuRates(RAW_NBU_RESPONSE);
    const eur = rates.find((r) => r.code === "EUR")!;

    const original = parseAmount("250,75");
    const uah = convert(original, eur.rate, "foreign-to-uah");
    const back = convert(uah, eur.rate, "uah-to-foreign");

    expect(back).toBeCloseTo(original, 6);
  });
});
