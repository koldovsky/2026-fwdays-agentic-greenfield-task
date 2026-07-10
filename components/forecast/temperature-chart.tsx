"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyTemperaturePoint } from "@/lib/forecast/forecast";

type TemperatureChartProps = {
  points: HourlyTemperaturePoint[];
};

export function TemperatureChart({ points }: TemperatureChartProps) {
  return (
    <div className="h-64 w-full" aria-label="Графік температури на 48 годин">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#d8e3f0" strokeDasharray="4 6" />
          <XAxis
            dataKey="label"
            minTickGap={28}
            tick={{ fill: "#5c6b7a", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            unit="°"
            tick={{ fill: "#5c6b7a", fontSize: 12 }}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value) => [`${value} °C`, "Температура"]}
            labelFormatter={(label) => `Час: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="temperatureC"
            stroke="#3b6fd9"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
