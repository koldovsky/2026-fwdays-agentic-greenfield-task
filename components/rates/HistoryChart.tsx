"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { HistoryPoint } from "@/lib/nbu/mapHistory";

/** Module-scoped (not created during render — react-hooks/static-components). */
function HistoryTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="history-chart__tooltip">
      <div className="history-chart__tooltip-label">{label}</div>
      <div className="history-chart__tooltip-value">
        {typeof value === "number"
          ? value.toLocaleString("uk-UA", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })
          : ""}{" "}
        ₴
      </div>
    </div>
  );
}

/**
 * A calm ~30-day line of one currency's official UAH rate — real `recharts`
 * import (ADR-0004), not the vendored `window.Recharts`-based component.
 * Visually matches the vendored design: brand-coloured area with a soft
 * gradient wash, calm grid, mono tabular ticks/tooltip, no chart animation
 * (DESIGN.md: "honest, not theatrical"), and a padded y-domain (FR-HISTORY-04).
 */
export function HistoryChart({
  data,
  height = 240,
  color = "var(--brand)",
}: {
  data: HistoryPoint[];
  height?: number;
  color?: string;
}) {
  const vals = data.map((d) => d.rate);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.35, max * 0.004);

  const axisTick = {
    fill: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
  };

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="hryv-history-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={28}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            width={52}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v.toLocaleString("uk-UA", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              })
            }
          />
          <Tooltip
            content={HistoryTooltip}
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke={color}
            strokeWidth={2}
            fill="url(#hryv-history-fill)"
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
