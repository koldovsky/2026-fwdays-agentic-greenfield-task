// RED (Phase 4b) — component test for the watering chart wrapper, written FROM
// the spec/design BEFORE the implementation. Asserts the jsdom-provable
// contract only (design D1/D6/R1):
//   - EMPTY branch (FR-CHART-03): given an empty series, the component renders
//     the Ukrainian empty-state message inside an accessible region — NOT a
//     blank/zeroed Recharts plot and NOT an error.
//   - NON-EMPTY branch (NFR-A11Y-03, SC-6): given a count-per-day series, the
//     data-bearing chart region carries an accessible name (figure + aria-label)
//     so a screen reader announces the watering-frequency chart, and the
//     underlying values stay readable as the EXISTING waterings list (this
//     component does not replace it).
//
// What this test deliberately does NOT assert: Recharts' ResponsiveContainer
// resolves to 0x0 in jsdom and paints no SVG, so asserting axis ticks / paths /
// pixels would pass on a blank or broken chart (R1). It is STUBBED to a
// fixed-size div so the non-empty branch mounts without layout warnings; the
// RENDERED legibility / contrast / 500 ms perf (NFR-PERF-02) are validated in
// PHASE 6 (vision-verify + axe + perf gate), not here.
//
// Stays RED until `components/charts/WateringChart` + the `charts` copy block in
// `@/lib/i18n/uk` exist.
//
// @trace FR-CHART-03
// @trace NFR-A11Y-03
// @trace SC-6
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 600, height: 300 }}>{children}</div>
    ),
  };
});

import { WateringChart } from "@/components/charts/WateringChart";
import { uk } from "@/lib/i18n/uk";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<WateringChart> empty state (FR-CHART-03)", () => {
  it("renders the Ukrainian empty-state message when the series is empty", () => {
    render(<WateringChart series={[]} />);
    expect(screen.getByText(uk.charts.wateringEmpty)).toBeInTheDocument();
  });

  it("does not render a chart figure region in the empty state (no blank/zeroed plot)", () => {
    render(<WateringChart series={[]} />);
    expect(
      screen.queryByRole("figure", { name: uk.charts.wateringTitle }),
    ).not.toBeInTheDocument();
  });
});

describe("<WateringChart> data branch (NFR-A11Y-03, SC-6)", () => {
  const series = [
    { date: "2026-06-05", label: "05.06.2026", count: 1 },
    { date: "2026-06-12", label: "12.06.2026", count: 2 },
  ];

  it("renders a chart region with an accessible name (figure + aria-label) (SC-6)", () => {
    render(<WateringChart series={series} />);
    expect(
      screen.getByRole("figure", { name: uk.charts.wateringTitle }),
    ).toBeInTheDocument();
  });

  it("does not show the empty-state message when there is data", () => {
    render(<WateringChart series={series} />);
    expect(screen.queryByText(uk.charts.wateringEmpty)).not.toBeInTheDocument();
  });
});
