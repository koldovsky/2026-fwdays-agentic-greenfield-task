// Chart-level coverage for FR-CHART-04 (charts reflect mutations). The update
// mechanism is the force-dynamic page re-rendering with fresh arrays after each
// action's revalidatePath, which re-derives the series and re-renders the chart
// island with a NEW `series` prop. This test proves the CHART end of that
// contract: when the chart is re-rendered with a new series, the rendered chart
// reflects the new data (point count + empty<->data transition) — so a future
// regression that froze the chart on its first prop would be caught here.
//
// jsdom cannot paint Recharts pixels (R1), so we mock LineChart to expose the
// `data` array it receives (its point count) — the data-flow signal, not pixels.
//
// @trace FR-CHART-04
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock LineChart to surface the point count it was handed; keep the other
// primitives as no-op passthroughs so the figure/empty-state branch logic runs.
vi.mock("recharts", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 600, height: 300 }}>{children}</div>
    ),
    LineChart: ({
      data,
      children,
    }: {
      data: unknown[];
      children?: ReactNode;
    }) => (
      <div data-testid="linechart" data-point-count={data.length}>
        {children}
      </div>
    ),
    CartesianGrid: Pass,
    XAxis: Pass,
    YAxis: Pass,
    Tooltip: Pass,
    Line: Pass,
  };
});

import { GrowthChart } from "@/components/charts/GrowthChart";
import { uk } from "@/lib/i18n/uk";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<GrowthChart> reflects a new series prop (FR-CHART-04)", () => {
  const twoPoints = [
    { date: "2026-06-01", label: "01.06.2026", heightCm: 10 },
    { date: "2026-06-10", label: "10.06.2026", heightCm: 12.5 },
  ];
  const threePoints = [
    ...twoPoints,
    { date: "2026-06-20", label: "20.06.2026", heightCm: 18 },
  ];

  it("re-renders with the new point count when the series prop grows (add reflects)", () => {
    const { rerender } = render(<GrowthChart series={twoPoints} />);
    expect(screen.getByTestId("linechart")).toHaveAttribute(
      "data-point-count",
      "2",
    );

    rerender(<GrowthChart series={threePoints} />);
    expect(screen.getByTestId("linechart")).toHaveAttribute(
      "data-point-count",
      "3",
    );
  });

  it("transitions to the empty state when the last point is removed (delete reflects)", () => {
    const { rerender } = render(<GrowthChart series={twoPoints} />);
    expect(
      screen.getByRole("figure", { name: uk.charts.growthTitle }),
    ).toBeInTheDocument();

    rerender(<GrowthChart series={[]} />);
    expect(
      screen.queryByRole("figure", { name: uk.charts.growthTitle }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(uk.charts.growthEmpty)).toBeInTheDocument();
  });
});
