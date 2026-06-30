import { describe, expect, it } from "vitest";
import { mapNbuHistory } from "./mapHistory";

const VALID_RANGE = [
  { exchangedate: "28.06.2026", cc: "USD", rate: 44.9229, units: 1, rate_per_unit: 44.9229, calcdate: "25.06.2026" },
  { exchangedate: "27.06.2026", cc: "USD", rate: 44.9229, units: 1, rate_per_unit: 44.9229, calcdate: "25.06.2026" },
  { exchangedate: "26.06.2026", cc: "USD", rate: 44.9229, units: 1, rate_per_unit: 44.9229, calcdate: "25.06.2026" },
  { exchangedate: "25.06.2026", cc: "USD", rate: 44.8685, units: 1, rate_per_unit: 44.8685, calcdate: "24.06.2026" },
];

/** @trace FR-HISTORY-01 */
describe("mapNbuHistory", () => {
  it("maps a valid range response into HistoryPoint[]", () => {
    const points = mapNbuHistory(VALID_RANGE);
    expect(points).toHaveLength(4);
    expect(points[0]).toEqual({ label: "25.06", rate: 44.8685, exchangeDate: "25.06.2026" });
  });

  it("sorts ascending by date even when the input is descending", () => {
    const points = mapNbuHistory(VALID_RANGE);
    expect(points.map((p) => p.exchangeDate)).toEqual([
      "25.06.2026",
      "26.06.2026",
      "27.06.2026",
      "28.06.2026",
    ]);
  });

  it("keeps consecutive carry-over duplicate rates (no de-duplication, design.md Decision 1)", () => {
    const points = mapNbuHistory(VALID_RANGE);
    const rates = points.map((p) => p.rate);
    expect(rates.filter((r) => r === 44.9229)).toHaveLength(3);
  });

  it("formats the label as DD.MM", () => {
    const points = mapNbuHistory(VALID_RANGE);
    expect(points.every((p) => /^\d{2}\.\d{2}$/.test(p.label))).toBe(true);
  });

  it("sorts correctly across a year boundary (string-key sort, not lexical)", () => {
    const points = mapNbuHistory([
      { exchangedate: "02.01.2026", cc: "USD", rate: 45.0 },
      { exchangedate: "31.12.2025", cc: "USD", rate: 44.5 },
      { exchangedate: "01.01.2026", cc: "USD", rate: 44.8 },
    ]);
    expect(points.map((p) => p.exchangeDate)).toEqual([
      "31.12.2025",
      "01.01.2026",
      "02.01.2026",
    ]);
  });

  it("returns an empty array for non-array input", () => {
    expect(mapNbuHistory(null)).toEqual([]);
    expect(mapNbuHistory(undefined)).toEqual([]);
    expect(mapNbuHistory({})).toEqual([]);
  });

  it("drops entries missing exchangedate or with a non-finite rate", () => {
    const raw = [
      { cc: "USD", rate: 44.9 },
      { exchangedate: "28.06.2026", cc: "USD", rate: "44.9" },
      { exchangedate: "28.06.2026", cc: "USD", rate: Number.NaN },
    ];
    expect(mapNbuHistory(raw)).toEqual([]);
  });

  it("never throws on a malformed mixed array", () => {
    const raw = [null, undefined, 42, "string", [], VALID_RANGE[0]];
    expect(() => mapNbuHistory(raw)).not.toThrow();
    expect(mapNbuHistory(raw)).toHaveLength(1);
  });
});
