// RED (Phase 4b) — component test for the growth chart wrapper, written FROM
// the spec/design BEFORE the implementation. Asserts the jsdom-provable
// contract only (design D1/D6/R1):
//   - EMPTY branch (FR-CHART-03): given an empty series, the component renders
//     the Ukrainian empty-state message inside an accessible region — NOT a
//     blank/zeroed Recharts plot and NOT an error.
//   - NON-EMPTY branch (NFR-A11Y-03, SC-6): given a series, the data-bearing
//     chart region carries an accessible name (figure + aria-label) so a screen
//     reader announces what it is, and the underlying values stay readable as
//     the EXISTING measurements list (this component does not replace it).
//
// What this test deliberately does NOT assert: Recharts' ResponsiveContainer
// resolves to 0x0 in jsdom and paints no SVG, so asserting axis ticks / paths /
// pixels would pass on a blank or broken chart (R1). It is STUBBED to a
// fixed-size div so the non-empty branch mounts without layout warnings; the
// RENDERED legibility / contrast / 500 ms perf (NFR-PERF-02) are validated in
// PHASE 6 (vision-verify + axe + perf gate), not here.
//
// Stays RED until `components/charts/GrowthChart` + the `charts` copy block in
// `@/lib/i18n/uk` exist.
//
// @trace FR-CHART-03
// @trace NFR-A11Y-03
// @trace SC-6
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Recharts' ResponsiveContainer measures the DOM (0x0 in jsdom) and warns; stub
// it to a fixed-size div so the data branch mounts cleanly. We never assert on
// the painted SVG — only on the accessible wrapper + the empty-state text.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 600, height: 300 }}>{children}</div>
    ),
  };
});

import { GrowthChart } from "@/components/charts/GrowthChart";
import { uk } from "@/lib/i18n/uk";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<GrowthChart> empty state (FR-CHART-03)", () => {
  it("renders the Ukrainian empty-state message when the series is empty", () => {
    render(<GrowthChart series={[]} />);
    expect(screen.getByText(uk.charts.growthEmpty)).toBeInTheDocument();
  });

  it("does not render a chart figure region in the empty state (no blank/zeroed plot)", () => {
    render(<GrowthChart series={[]} />);
    // The data-bearing chart region (the accessible figure) is absent when empty;
    // the empty state stands in its place, distinct from a rendered chart.
    expect(
      screen.queryByRole("figure", { name: uk.charts.growthTitle }),
    ).not.toBeInTheDocument();
  });
});

describe("<GrowthChart> data branch (NFR-A11Y-03, SC-6)", () => {
  const series = [
    { date: "2026-06-01", label: "01.06.2026", heightCm: 10 },
    { date: "2026-06-10", label: "10.06.2026", heightCm: 12.5 },
  ];

  it("renders a chart region with an accessible name (figure + aria-label) (SC-6)", () => {
    render(<GrowthChart series={series} />);
    expect(
      screen.getByRole("figure", { name: uk.charts.growthTitle }),
    ).toBeInTheDocument();
  });

  it("does not show the empty-state message when there is data", () => {
    render(<GrowthChart series={series} />);
    expect(screen.queryByText(uk.charts.growthEmpty)).not.toBeInTheDocument();
  });
});
