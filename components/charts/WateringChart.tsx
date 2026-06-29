"use client";

// Watering chart island (design D6, D2, FR-CHART-01) — the headline feature. A
// THIN client wrapper over Recharts: it takes the already-shaped count-per-day
// series (the SERVER page calls the pure `toWateringSeries` and passes the result
// down) and either renders the shared empty state (when the series is empty) or a
// watering-frequency line. The y-value is the number of waterings on each
// calendar day (D2), so the line legibly shows clusters and gaps rather than a
// flat row of markers.
//
// The data branch is wrapped in a labelled <figure> (accessible name from the
// `charts` copy) so a screen reader announces the chart region (SC-6,
// NFR-A11Y-04). The X axis is keyed on the DD.MM.YYYY label (SC-1) and the Y axis
// is the per-day count. The rendered legibility/contrast/perf are validated in
// Phase 6 (vision-verify + axe + perf gate) — jsdom paints nothing.
//
// @trace FR-CHART-01
// @trace FR-CHART-03
// @trace SC-6
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartEmptyState } from "@/components/charts/ChartEmptyState";
import type { WateringPoint } from "@/lib/charts/series";
import { uk } from "@/lib/i18n/uk";

export interface WateringChartProps {
  /** Count-per-day series from `toWateringSeries` (ascending by date). */
  series: WateringPoint[];
}

export function WateringChart({ series }: WateringChartProps) {
  if (series.length === 0) {
    return <ChartEmptyState message={uk.charts.wateringEmpty} />;
  }

  return (
    <figure aria-label={uk.charts.wateringTitle} className="m-0 w-full">
      <figcaption className="mb-2 font-display text-sm font-semibold text-bark">
        {uk.charts.wateringTitle}
      </figcaption>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              className="text-stone"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              className="text-stone"
              label={{
                value: uk.charts.countAxis,
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12 },
              }}
            />
            <Tooltip
              labelFormatter={(label) => `${uk.charts.dateAxis}: ${label}`}
              formatter={(value) => [value, uk.charts.countAxis]}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#A9744E"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
