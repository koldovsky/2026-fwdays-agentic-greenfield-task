// Pure, Recharts-agnostic chart data-shaping seam (design D1, D2, D3). This is
// the slice's tested seam: jsdom cannot prove a rendered chart's pixels, so ALL
// data shaping is extracted here as pure functions over the row arrays the plant
// detail page already loads. No Recharts, React, or DOM import — these are
// deterministic, never throw, and return [] for empty input.
//
// The series sort ASCENDING (oldest -> newest) for a left->right time axis (the
// lists are DESC; same total order reversed, R3). Display labels are DD.MM.YYYY
// via the frozen `@/lib/dates` helper (SC-1).
//
// @trace FR-CHART-01
// @trace FR-CHART-02
// @trace SC-1
import type { Measurement } from "@/db/schema/growth";
import type { Watering } from "@/db/schema/watering";
import { formatAcquiredDate } from "@/lib/dates";

/** One point of the growth (height-over-time) line. */
export interface GrowthPoint {
  /** ISO `YYYY-MM-DD` measurement date (raw key, sortable). */
  date: string;
  /** Display label `DD.MM.YYYY` (SC-1). */
  label: string;
  /** The exact stored numeric height in cm (no round/drop/re-parse, R4). */
  heightCm: number;
}

/** One point of the watering (count-per-day) line (design D2). */
export interface WateringPoint {
  /** ISO `YYYY-MM-DD` calendar day (raw key, sortable). */
  date: string;
  /** Display label `DD.MM.YYYY` (SC-1). */
  label: string;
  /** Number of watering events on that calendar day (frequency, D2). */
  count: number;
}

/**
 * Shape growth measurements into a height-over-time series (design D3,
 * FR-CHART-02). One point per measurement, sorted by `measuredOn` ASCENDING and
 * tie-broken by row `id` ASC so two same-date measurements stay deterministic
 * (the list's total order reversed). The exact stored `heightCm` is carried
 * through unchanged. Empty input -> []. Never mutates the input, never throws.
 */
export function toGrowthSeries(measurements: readonly Measurement[]): GrowthPoint[] {
  return [...measurements]
    .sort((a, b) => {
      if (a.measuredOn < b.measuredOn) return -1;
      if (a.measuredOn > b.measuredOn) return 1;
      return a.id - b.id;
    })
    .map((m) => ({
      date: m.measuredOn,
      label: formatAcquiredDate(m.measuredOn),
      heightCm: m.heightCm,
    }));
}

/**
 * Shape watering events into a count-per-day series (design D2, FR-CHART-01).
 * Events are grouped by `wateredOn` into one point per calendar day whose
 * `count` is the number of events that day (same-day events collapse), sorted by
 * date ASCENDING. No bucketing, no zero-filling of empty days (FR-CHART-05 is
 * Future). Empty input -> []. Never mutates the input, never throws.
 */
export function toWateringSeries(waterings: readonly Watering[]): WateringPoint[] {
  const countByDay = new Map<string, number>();
  for (const w of waterings) {
    countByDay.set(w.wateredOn, (countByDay.get(w.wateredOn) ?? 0) + 1);
  }

  return [...countByDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, count]) => ({
      date,
      label: formatAcquiredDate(date),
      count,
    }));
}
