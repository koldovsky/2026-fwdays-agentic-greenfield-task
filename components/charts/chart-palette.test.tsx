// Chart palette coverage (design D6/D7, FR-DS-06). The «Поливайко» restyle
// mandates the named forest/clay palette for the chart lines: the GROWTH line is
// forest #2F6B3F and the WATERING line is clay #A9744E (design.md D7, spec
// FR-DS-06 "Charts use the forest/clay palette"). jsdom paints no pixels, so we
// cannot verify the rendered contrast here (that is the Phase-6 vision-verify +
// axe gate); instead we lock the NAMED stroke values against regression by
// capturing the prop each chart passes to its Recharts <Line>. A regression that
// reverted a stroke to the old blue/green hex (or any other color) fails here.
//
// @trace FR-DS-06
import { cleanup, render } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Capture every <Line> stroke; stub ResponsiveContainer (0x0 in jsdom) and Line
// (we only inspect the stroke prop, never paint) so the data branch mounts
// cleanly. All other Recharts exports stay real.
const lineStrokes: Array<string | undefined> = [];

// Recharts' LineChart traverses its children by component type and only renders
// recognized child types, so a plain functional mock for <Line> would be dropped
// and never execute. Instead, stub the container + LineChart to passthroughs that
// render their children directly, and stub <Line> to record the stroke prop — so
// the chart's <Line stroke=...> definitely runs and is captured. The other
// presentational children (axes, grid, tooltip) become no-ops.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  const passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const noop = () => null;
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 600, height: 300 }}>{children}</div>
    ),
    LineChart: passthrough,
    CartesianGrid: noop,
    XAxis: noop,
    YAxis: noop,
    Tooltip: noop,
    Line: (props: ComponentProps<typeof actual.Line>) => {
      lineStrokes.push(props.stroke as string | undefined);
      return null;
    },
  };
});

import { GrowthChart } from "@/components/charts/GrowthChart";
import { WateringChart } from "@/components/charts/WateringChart";

afterEach(() => {
  cleanup();
  lineStrokes.length = 0;
  vi.clearAllMocks();
});

describe("chart palette (FR-DS-06)", () => {
  it("the growth chart line uses the forest stroke #2F6B3F", () => {
    render(
      <GrowthChart
        series={[
          { date: "2026-06-01", label: "01.06.2026", heightCm: 10 },
          { date: "2026-06-10", label: "10.06.2026", heightCm: 12.5 },
        ]}
      />,
    );
    expect(lineStrokes).toContain("#2F6B3F");
  });

  it("the watering chart line uses the clay stroke #A9744E", () => {
    render(
      <WateringChart
        series={[
          { date: "2026-06-05", label: "05.06.2026", count: 1 },
          { date: "2026-06-12", label: "12.06.2026", count: 2 },
        ]}
      />,
    );
    expect(lineStrokes).toContain("#A9744E");
  });
});
