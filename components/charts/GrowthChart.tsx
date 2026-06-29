"use client";

// Growth chart island (design D6, FR-CHART-02). A THIN client wrapper over
// Recharts: it takes the already-shaped growth series (the SERVER page calls the
// pure `toGrowthSeries` and passes the result down) and either renders the
// shared empty state (when the series is empty) or a height-over-time line.
//
// The data branch is wrapped in a labelled <figure> (accessible name from the
// `charts` copy) so a screen reader announces the chart region (SC-6,
// NFR-A11Y-04). The Y axis is the numeric height in cm. The X axis is keyed on a
// monotonic INDEX (a numeric axis), NOT the DD.MM.YYYY label string: growth keeps
// one point PER measurement (design D3), so two same-date measurements must stay
// SEPARABLE on the axis — a categorical label axis would map both to the same
// DD.MM.YYYY tick and visually merge them. Each point gets its own integer index
// tick, and `tickFormatter` renders the DD.MM.YYYY label (SC-1) for that index, so
// every measurement is a distinct plotted point while the axis still reads as
// dates. The rendered legibility/contrast/perf are validated in Phase 6
// (vision-verify + axe + perf gate) — jsdom paints nothing.
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
import { type GrowthPoint, toGrowthXAxis } from "@/lib/charts/series";
import { uk } from "@/lib/i18n/uk";

export interface GrowthChartProps {
  /** Height-over-time series from `toGrowthSeries` (ascending by date). */
  series: GrowthPoint[];
}

export function GrowthChart({ series }: GrowthChartProps) {
  if (series.length === 0) {
    return <ChartEmptyState message={uk.charts.growthEmpty} />;
  }

  // Map onto a numeric X axis (one tick per measurement) so two same-date
  // measurements stay distinct, separable points (design D3). `toGrowthXAxis` is
  // the pure, unit-tested seam; the chart only wires its output to Recharts.
  const { data, labelOf } = toGrowthXAxis(series);

  return (
    <figure aria-label={uk.charts.growthTitle} className="m-0 w-full">
      <figcaption className="mb-2 font-display text-sm font-semibold text-bark">
        {uk.charts.growthTitle}
      </figcaption>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              type="number"
              dataKey="index"
              domain={[0, data.length - 1]}
              ticks={data.map((point) => point.index)}
              tickFormatter={(value) => labelOf(Number(value))}
              tick={{ fontSize: 12 }}
              className="text-stone"
            />
            <YAxis
              allowDecimals
              tick={{ fontSize: 12 }}
              className="text-stone"
              label={{
                value: uk.charts.heightAxis,
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12 },
              }}
            />
            <Tooltip
              labelFormatter={(value) =>
                `${uk.charts.dateAxis}: ${labelOf(Number(value))}`
              }
              formatter={(value) => [value, uk.charts.heightAxis]}
            />
            <Line
              type="monotone"
              dataKey="heightCm"
              stroke="#2F6B3F"
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
