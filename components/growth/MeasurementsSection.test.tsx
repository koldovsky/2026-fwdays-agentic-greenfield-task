// Component test for the measurements section shell (task 1.7). Asserts the
// FR-GROWTH-02 / SC-3 contract at the jsdom level: a clear empty state when the
// plant has no measurements, and otherwise the list rendered in the query's order
// (date DESC, id DESC) showing each height in cm and the date as DD.MM.YYYY.
//
// @trace FR-GROWTH-02
// @trace SC-3
// @trace NFR-A11Y-03
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Measurement } from "@/db/schema/growth";
import { uk } from "@/lib/i18n/uk";

// The section embeds client islands (form + rows) that touch next/navigation and
// the server actions; stub them so the section renders outside the App Router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/growth/actions", () => ({
  createMeasurementAction: vi.fn(),
  updateMeasurementAction: vi.fn(),
  deleteMeasurementAction: vi.fn(),
}));

import { MeasurementsSection } from "@/components/growth/MeasurementsSection";

const TODAY = "2026-06-29";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<MeasurementsSection> — list & empty state (FR-GROWTH-02, SC-3)", () => {
  it("shows the empty state when there are no measurements", () => {
    render(
      <MeasurementsSection plantId={1} measurements={[]} today={TODAY} />,
    );
    expect(screen.getByText(uk.growth.empty)).toBeInTheDocument();
    // No measurement rows are rendered.
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("renders each measurement in the supplied (date DESC, id DESC) order with cm + DD.MM.YYYY", () => {
    // Pre-ordered by the query: most recent first, then id desc on a tie.
    const measurements: Measurement[] = [
      {
        id: 3,
        plantId: 1,
        heightCm: 30,
        measuredOn: "2026-06-20",
        createdAt: "2026-06-20 10:00:00",
      },
      {
        id: 2,
        plantId: 1,
        heightCm: 12.5,
        measuredOn: "2026-06-10",
        createdAt: "2026-06-10 10:00:00",
      },
    ];

    render(
      <MeasurementsSection
        plantId={1}
        measurements={measurements}
        today={TODAY}
      />,
    );

    expect(screen.queryByText(uk.growth.empty)).not.toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // First row is the most-recent measurement, shown as DD.MM.YYYY + cm.
    expect(items[0]).toHaveTextContent("20.06.2026");
    expect(items[0]).toHaveTextContent("30");
    expect(items[1]).toHaveTextContent("10.06.2026");
    // formatHeight renders a non-integer via toFixed(1) — a dot, not a comma.
    expect(items[1]).toHaveTextContent("12.5");
  });
});
