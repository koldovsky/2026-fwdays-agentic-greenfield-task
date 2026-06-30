// RED (Phase 4b) — written FROM the spec/design BEFORE the implementation.
// This is the slice's load-bearing seam (design D1): the chart's pixels cannot
// be proven in jsdom, so ALL data shaping is extracted into PURE, Recharts-
// agnostic functions in `lib/charts/series.ts`. These tests are the red->green
// unit target — they assert the SPECIFIED data shape (sort order, DD.MM.YYYY
// labels via @/lib/dates, count-per-day grouping, value preservation, empty ->
// []), independent of any rendering. They stay RED until `lib/charts/series.ts`
// exists with the exact exports design.md defines (D2, D3).
//
// The RENDERED chart's legibility / contrast / axis ticks / 500 ms perf budget
// (NFR-PERF-02) are NOT provable here — jsdom does not lay out or paint
// Recharts (ResponsiveContainer resolves to 0x0). They are validated in PHASE 6
// (vision-verify + axe + perf gate), per design D1/D6/R1.
//
// @trace FR-CHART-01
// @trace FR-CHART-02
// @trace SC-1
import { describe, expect, it } from "vitest";

import {
  toGrowthSeries,
  toGrowthXAxis,
  toWateringSeries,
} from "@/lib/charts/series";
import type { Measurement } from "@/db/schema/growth";
import type { Watering } from "@/db/schema/watering";

// ---- builders (the row shapes the detail page already loads) ----------------

function measurement(overrides: Partial<Measurement> = {}): Measurement {
  return {
    id: 1,
    plantId: 1,
    heightCm: 10,
    measuredOn: "2026-06-01",
    createdAt: "2026-06-01 10:00:00",
    ...overrides,
  };
}

function watering(overrides: Partial<Watering> = {}): Watering {
  return {
    id: 1,
    plantId: 1,
    wateredOn: "2026-06-01",
    note: null,
    createdAt: "2026-06-01 10:00:00",
    ...overrides,
  };
}

// =============================================================================
// toGrowthSeries(measurements) — height (cm) line over measurement dates ASC
// (design D3, FR-CHART-02, SC-1)
// =============================================================================
describe("toGrowthSeries(measurements) (FR-CHART-02, SC-1)", () => {
  it("returns [] for empty input (the chart renders its empty state, not a blank plot)", () => {
    expect(toGrowthSeries([])).toEqual([]);
  });

  it("maps a single measurement to one point { date, label DD.MM.YYYY, heightCm }", () => {
    const series = toGrowthSeries([
      measurement({ id: 1, heightCm: 12.5, measuredOn: "2026-06-15" }),
    ]);
    expect(series).toEqual([
      { date: "2026-06-15", label: "15.06.2026", heightCm: 12.5 },
    ]);
  });

  it("sorts chronologically ASCENDING by measuredOn (time axis runs oldest -> newest, R3)", () => {
    // Supplied newest-first (as the DESC list would be); the series must reverse
    // it to ascending for a left->right time axis.
    const series = toGrowthSeries([
      measurement({ id: 3, heightCm: 30, measuredOn: "2026-06-20" }),
      measurement({ id: 2, heightCm: 20, measuredOn: "2026-06-10" }),
      measurement({ id: 1, heightCm: 10, measuredOn: "2026-06-01" }),
    ]);
    expect(series.map((p) => p.date)).toEqual([
      "2026-06-01",
      "2026-06-10",
      "2026-06-20",
    ]);
    expect(series.map((p) => p.heightCm)).toEqual([10, 20, 30]);
  });

  it("labels every point DD.MM.YYYY with zero-padding (SC-1, via @/lib/dates)", () => {
    const series = toGrowthSeries([
      measurement({ id: 1, measuredOn: "2026-01-05" }),
    ]);
    expect(series[0].label).toBe("05.01.2026");
  });

  it("preserves the exact stored decimal height (no round, no drop, no re-parse) (R4)", () => {
    const series = toGrowthSeries([
      measurement({ id: 1, heightCm: 12.5, measuredOn: "2026-06-01" }),
    ]);
    // The stored value is the number 12.5 (normalized upstream from "12,5" per
    // FR-GROWTH-05); the series carries it through unchanged as a number.
    expect(series[0].heightCm).toBe(12.5);
    expect(typeof series[0].heightCm).toBe("number");
    expect(Number.isNaN(series[0].heightCm)).toBe(false);
  });

  it("carries a trailing-zero / large-magnitude height through unchanged (R4, FR-GROWTH-05 upper bound)", () => {
    // 12.50 stored is the number 12.5; a large permitted height scales the axis
    // without being dropped, NaN'd, or re-parsed by the shaping step.
    const series = toGrowthSeries([
      measurement({ id: 1, heightCm: 12.5, measuredOn: "2026-06-01" }),
      measurement({ id: 2, heightCm: 999.9, measuredOn: "2026-06-02" }),
    ]);
    expect(series[0].heightCm).toBe(12.5);
    expect(series[1].heightCm).toBe(999.9);
  });

  it("keeps two same-date measurements as TWO distinct points, tie-broken by id ASC (deterministic, D3)", () => {
    // The list's deterministic total order is date DESC then id DESC; the chart
    // is the SAME total order reversed: date ASC then id ASC.
    const series = toGrowthSeries([
      measurement({ id: 8, heightCm: 22, measuredOn: "2026-06-10" }),
      measurement({ id: 5, heightCm: 21, measuredOn: "2026-06-10" }),
    ]);
    expect(series).toHaveLength(2);
    expect(series.map((p) => p.heightCm)).toEqual([21, 22]); // id 5 before id 8
  });

  it("does not mutate the input array", () => {
    const input = [
      measurement({ id: 2, measuredOn: "2026-06-10" }),
      measurement({ id: 1, measuredOn: "2026-06-01" }),
    ];
    const snapshot = input.map((m) => m.measuredOn);
    toGrowthSeries(input);
    expect(input.map((m) => m.measuredOn)).toEqual(snapshot);
  });

  it("carries 365+ points through without capping/dropping (NFR-PERF-02 data-side guarantee)", () => {
    // The 500ms render budget is measured in Phase 6 (vision-verify + perf check);
    // the DATA-side guarantee is that the series never caps/drops/buckets/truncates
    // above the supported maximum. 400 distinct dates -> 400 points, in order.
    const base = new Date("2025-01-01T00:00:00Z").getTime();
    const measurements = Array.from({ length: 400 }, (_, i) => {
      const day = new Date(base + i * 86_400_000).toISOString().slice(0, 10);
      return measurement({ id: i + 1, heightCm: i + 1, measuredOn: day });
    });
    const series = toGrowthSeries(measurements);
    expect(series).toHaveLength(400);
    // Every height carried through unchanged, ascending, none dropped/NaN.
    expect(series.map((p) => p.heightCm)).toEqual(
      Array.from({ length: 400 }, (_, i) => i + 1),
    );
  });
});

// =============================================================================
// toGrowthXAxis(series) — numeric X-axis mapping so two same-date measurements
// stay SEPARABLE (design D3 fix; a categorical label axis would merge them)
// =============================================================================
describe("toGrowthXAxis(series) same-date X separation (FR-CHART-02, D3)", () => {
  it("assigns each point a distinct monotonic index even when two share a date", () => {
    // Two same-date measurements: toGrowthSeries keeps both (tie-broken id ASC);
    // they share the identical DD.MM.YYYY label, so a label-keyed category axis
    // would collapse them onto ONE tick. The numeric index keeps them separable.
    const series = toGrowthSeries([
      measurement({ id: 8, heightCm: 22, measuredOn: "2026-06-10" }),
      measurement({ id: 5, heightCm: 21, measuredOn: "2026-06-10" }),
    ]);
    const { data, labelOf } = toGrowthXAxis(series);

    // N points -> N distinct X positions, in series order.
    expect(data.map((p) => p.index)).toEqual([0, 1]);
    expect(new Set(data.map((p) => p.index)).size).toBe(data.length);
    // Each index still resolves to its DD.MM.YYYY label (here the same date)...
    expect(labelOf(0)).toBe("10.06.2026");
    expect(labelOf(1)).toBe("10.06.2026");
    // ...while the two distinct heights are preserved at distinct X positions.
    expect(data.map((p) => p.heightCm)).toEqual([21, 22]);
  });

  it("pads a SINGLE-point domain so the lone point renders centered/visible (not degenerate [0,0]) (FR-CHART-02)", () => {
    // With one measurement the raw index domain is [0,0] — a zero-width axis that
    // Recharts cannot place a point on. The seam pads it to a finite, centered
    // window so the single point is visible.
    const series = toGrowthSeries([
      measurement({ id: 1, heightCm: 12.5, measuredOn: "2026-06-15" }),
    ]);
    const { data, domain } = toGrowthXAxis(series);
    expect(data.map((p) => p.index)).toEqual([0]);
    expect(domain).toEqual([-0.5, 0.5]);
    // The window is non-degenerate (its two ends differ).
    expect(domain[0]).toBeLessThan(domain[1]);
  });

  it("gives an empty series a non-degenerate domain too (defensive; the chart renders its empty state)", () => {
    const { data, domain } = toGrowthXAxis(toGrowthSeries([]));
    expect(data).toEqual([]);
    expect(domain[0]).toBeLessThan(domain[1]);
  });

  it("uses the full [0, n-1] index domain for a multi-point series", () => {
    const series = toGrowthSeries([
      measurement({ id: 1, heightCm: 10, measuredOn: "2026-06-01" }),
      measurement({ id: 2, heightCm: 20, measuredOn: "2026-06-05" }),
      measurement({ id: 3, heightCm: 30, measuredOn: "2026-06-09" }),
    ]);
    const { domain } = toGrowthXAxis(series);
    expect(domain).toEqual([0, 2]);
  });

  it("preserves height/label per point and resolves out-of-range index to empty", () => {
    const series = toGrowthSeries([
      measurement({ id: 1, heightCm: 10, measuredOn: "2026-06-01" }),
      measurement({ id: 2, heightCm: 12.5, measuredOn: "2026-06-05" }),
    ]);
    const { data, labelOf } = toGrowthXAxis(series);
    expect(data).toEqual([
      { index: 0, date: "2026-06-01", label: "01.06.2026", heightCm: 10 },
      { index: 1, date: "2026-06-05", label: "05.06.2026", heightCm: 12.5 },
    ]);
    expect(labelOf(99)).toBe("");
  });
});

// =============================================================================
// toWateringSeries(waterings) — COUNT PER DAY line, same-day events collapse
// (design D2, FR-CHART-01, SC-1)
// =============================================================================
describe("toWateringSeries(waterings) (FR-CHART-01, SC-1)", () => {
  it("returns [] for empty input (the chart renders its empty state, not a blank plot)", () => {
    expect(toWateringSeries([])).toEqual([]);
  });

  it("maps a single watering to one count-per-day point { date, label DD.MM.YYYY, count: 1 }", () => {
    const series = toWateringSeries([
      watering({ id: 1, wateredOn: "2026-06-15" }),
    ]);
    expect(series).toEqual([
      { date: "2026-06-15", label: "15.06.2026", count: 1 },
    ]);
  });

  it("collapses N same-day events into ONE point whose count equals N (D2, no stacked markers)", () => {
    const series = toWateringSeries([
      watering({ id: 1, wateredOn: "2026-06-10" }),
      watering({ id: 2, wateredOn: "2026-06-10" }),
      watering({ id: 3, wateredOn: "2026-06-10" }),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0]).toEqual({
      date: "2026-06-10",
      label: "10.06.2026",
      count: 3,
    });
  });

  it("emits one ascending-date point per distinct calendar day (R3, no zero-filling between days)", () => {
    // Supplied newest-first (as the DESC list would be); the series must group
    // by day and order ascending. Days with no watering are simply absent.
    const series = toWateringSeries([
      watering({ id: 5, wateredOn: "2026-06-20" }),
      watering({ id: 4, wateredOn: "2026-06-12" }),
      watering({ id: 3, wateredOn: "2026-06-12" }),
      watering({ id: 2, wateredOn: "2026-06-05" }),
    ]);
    expect(series.map((p) => p.date)).toEqual([
      "2026-06-05",
      "2026-06-12",
      "2026-06-20",
    ]);
    expect(series.map((p) => p.count)).toEqual([1, 2, 1]);
    // No zero-valued points inserted for the days in between (FR-CHART-01).
    expect(series).toHaveLength(3);
  });

  it("labels every day point DD.MM.YYYY with zero-padding (SC-1, via @/lib/dates)", () => {
    const series = toWateringSeries([
      watering({ id: 1, wateredOn: "2026-01-05" }),
    ]);
    expect(series[0].label).toBe("05.01.2026");
  });

  it("orders strictly ascending and the total count equals the number of input events", () => {
    const waterings = [
      watering({ id: 1, wateredOn: "2026-06-01" }),
      watering({ id: 2, wateredOn: "2026-06-01" }),
      watering({ id: 3, wateredOn: "2026-06-03" }),
      watering({ id: 4, wateredOn: "2026-06-03" }),
      watering({ id: 5, wateredOn: "2026-06-03" }),
      watering({ id: 6, wateredOn: "2026-06-09" }),
    ];
    const series = toWateringSeries(waterings);

    // Strictly ascending dates.
    const dates = series.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);

    // No information lost: the sum of per-day counts equals the event count.
    const total = series.reduce((sum, p) => sum + p.count, 0);
    expect(total).toBe(waterings.length);
  });

  it("does not mutate the input array", () => {
    const input = [
      watering({ id: 2, wateredOn: "2026-06-10" }),
      watering({ id: 1, wateredOn: "2026-06-01" }),
    ];
    const snapshot = input.map((w) => w.wateredOn);
    toWateringSeries(input);
    expect(input.map((w) => w.wateredOn)).toEqual(snapshot);
  });

  it("emits 365+ distinct-day points without capping/dropping (NFR-PERF-02 data-side guarantee)", () => {
    // 400 distinct watering days -> 400 count-per-day points; never capped,
    // bucketed, or truncated above the supported maximum (render-time budget is a
    // Phase 6 perf concern, the data shape is guaranteed here).
    const base = new Date("2025-01-01T00:00:00Z").getTime();
    const waterings = Array.from({ length: 400 }, (_, i) => {
      const day = new Date(base + i * 86_400_000).toISOString().slice(0, 10);
      return watering({ id: i + 1, wateredOn: day });
    });
    const series = toWateringSeries(waterings);
    expect(series).toHaveLength(400);
    expect(series.every((p) => p.count === 1)).toBe(true);
  });
});
