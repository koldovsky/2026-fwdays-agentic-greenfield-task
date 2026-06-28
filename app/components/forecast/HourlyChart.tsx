"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { uk } from "@/lib/i18n/uk";
import type { HourlyPoint } from "@/lib/forecast/types";

function formatHour(isoTime: string): string {
  try {
    const date = new Date(isoTime);
    return String(date.getHours()).padStart(2, "0") + ":00";
  } catch {
    return isoTime.slice(11, 16);
  }
}

const TICK_EVERY = 6;

function CustomCursor({
  points,
  height,
}: {
  points?: { x: number; y: number }[];
  height?: number;
}) {
  if (!points?.length) return null;
  const { x } = points[0];
  return (
    <line x1={x} y1={0} x2={x} y2={height ?? 160} stroke="var(--border-strong)" strokeWidth={1} />
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { rawLabel: string; temp: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const { rawLabel, temp } = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
        fontSize: 12,
        fontFamily: "var(--font-mono)",
        color: "var(--text)",
        padding: "4px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {rawLabel} – {temp}°C
    </div>
  );
}

// Defined outside the component so the reference is stable across renders.
// A new function reference would cause Recharts to reset activeIndex to 0.
function renderActiveDot({ cx, cy }: { cx?: number; cy?: number }) {
  return <circle cx={cx} cy={cy} r={4} fill="var(--brand)" />;
}

export function HourlyChart({ hours }: { hours: HourlyPoint[] }) {
  // Memoized so Recharts does not see a new data array on every render,
  // which would also reset activeIndex to 0.
  const data = useMemo(
    () =>
      hours.map((h) => ({
        temp: h.tempC,
        rawLabel: formatHour(h.time),
      })),
    [hours]
  );

  return (
    <section aria-label={uk.forecast.hourlyChartLabel} className="w-full">
      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                tickFormatter={(_, index) =>
                  index % TICK_EVERY === 0 ? (data[index]?.rawLabel ?? "") : ""
                }
                tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}°`}
                width={36}
              />
              <Tooltip cursor={<CustomCursor />} content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="var(--brand)"
                strokeWidth={2}
                dot={false}
                activeDot={renderActiveDot}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
