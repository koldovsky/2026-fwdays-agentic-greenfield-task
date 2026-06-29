"use client";

// Growth chart island (design D6, FR-CHART-02). A THIN client wrapper over
// Recharts: it takes the already-shaped growth series (the SERVER page calls the
// pure `toGrowthSeries` and passes the result down) and either renders the
// shared empty state (when the series is empty) or a height-over-time line.
//
// The data branch is wrapped in a labelled <figure> (accessible name from the
// `charts` copy) so a screen reader announces the chart region (SC-6,
// NFR-A11Y-04). The X axis is keyed on the DD.MM.YYYY label (SC-1) and the Y axis
// is the numeric height in cm. The rendered legibility/contrast/perf are
// validated in Phase 6 (vision-verify + axe + perf gate) — jsdom paints nothing.
//
// @trace FR-CHART-02
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
import type { GrowthPoint } from "@/lib/charts/series";
import { uk } from "@/lib/i18n/uk";

export interface GrowthChartProps {
  /** Height-over-time series from `toGrowthSeries` (ascending by date). */
  series: GrowthPoint[];
}

export function GrowthChart({ series }: GrowthChartProps) {
  if (series.length === 0) {
    return <ChartEmptyState message={uk.charts.growthEmpty} />;
  }

  return (
    <figure aria-label={uk.charts.growthTitle} className="m-0 w-full">
      <figcaption className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {uk.charts.growthTitle}
      </figcaption>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-zinc-200 dark:stroke-zinc-700"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              className="text-zinc-700 dark:text-zinc-300"
            />
            <YAxis
              allowDecimals
              tick={{ fontSize: 12 }}
              className="text-zinc-700 dark:text-zinc-300"
              label={{
                value: uk.charts.heightAxis,
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12 },
              }}
            />
            <Tooltip
              labelFormatter={(label) => `${uk.charts.dateAxis}: ${label}`}
              formatter={(value) => [value, uk.charts.heightAxis]}
            />
            <Line
              type="monotone"
              dataKey="heightCm"
              stroke="#16a34a"
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
