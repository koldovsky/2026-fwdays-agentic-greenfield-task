// Component test for the chart render-failure boundary (FR-CHART-03,
// NFR-A11Y-03). The charts are prop-driven client islands with no async load,
// but a Recharts render error would otherwise crash the whole plant detail
// page. This boundary contains that: a thrown child becomes a non-blocking
// inline fallback, while a SIBLING data list on the same page stays readable
// (the canonical view never disappears because a chart broke).
//
// @trace FR-CHART-03
// @trace NFR-A11Y-03
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChartErrorBoundary } from "@/components/charts/ChartErrorBoundary";
import { uk } from "@/lib/i18n/uk";

// A child that throws on render to simulate a Recharts render failure.
function Boom(): never {
  throw new Error("simulated chart render failure");
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  // React logs the caught error to console.error; the boundary also logs the
  // cause. Silence both so the test output stays clean (we assert behavior, not
  // the console).
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("<ChartErrorBoundary> (FR-CHART-03, NFR-A11Y-03)", () => {
  it("renders children unchanged when they do not throw", () => {
    render(
      <ChartErrorBoundary fallbackMessage={uk.charts.renderError}>
        <div>healthy chart</div>
      </ChartErrorBoundary>,
    );
    expect(screen.getByText("healthy chart")).toBeInTheDocument();
    expect(screen.queryByText(uk.charts.renderError)).not.toBeInTheDocument();
  });

  it("shows the Ukrainian fallback in a role=alert region when a child throws", () => {
    render(
      <ChartErrorBoundary fallbackMessage={uk.charts.renderError}>
        <Boom />
      </ChartErrorBoundary>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(uk.charts.renderError);
  });

  it("leaves a sibling data list readable when the chart boundary fails (NFR-A11Y-03)", () => {
    // Mirrors the plant detail page: the chart and the list are independent
    // siblings, so a chart render failure must NOT take the data list with it.
    render(
      <div>
        <ChartErrorBoundary fallbackMessage={uk.charts.renderError}>
          <Boom />
        </ChartErrorBoundary>
        <ul aria-label="measurements list">
          <li>12.5 cm</li>
        </ul>
      </div>,
    );

    // Chart degraded to the fallback...
    expect(screen.getByText(uk.charts.renderError)).toBeInTheDocument();
    // ...and the underlying data is still fully present and readable.
    const list = screen.getByRole("list", { name: "measurements list" });
    expect(list).toBeInTheDocument();
    expect(screen.getByText("12.5 cm")).toBeInTheDocument();
  });
});
