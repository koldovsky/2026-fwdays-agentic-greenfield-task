// RED (Phase 4b) — component test for the waterings section shell + row (task
// 1.9), written from the spec BEFORE the implementation. Asserts the FR-WATER-03
// / SC-3 contract at the jsdom level: a clear empty state when the plant has no
// waterings, and otherwise the list rendered in the query's order (date DESC, id
// DESC) showing each watering date as DD.MM.YYYY and its note (or a clear "no
// note" affordance). The section renders in isolation without colliding with the
// measurements section (design R7). Imports fail until the components + the
// db/schema/watering type + the uk.watering copy block exist.
//
// @trace FR-WATER-03
// @trace SC-3
// @trace NFR-A11Y-03
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Watering } from "@/db/schema/watering";
import { uk } from "@/lib/i18n/uk";

// The section embeds client islands (form + rows) that touch next/navigation and
// the server actions; stub them so the section renders outside the App Router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/watering/actions", () => ({
  createWateringAction: vi.fn(),
  updateWateringAction: vi.fn(),
  deleteWateringAction: vi.fn(),
}));

import { WateringsSection } from "@/components/watering/WateringsSection";

const TODAY = "2026-06-29";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<WateringsSection> — list & empty state (FR-WATER-03, SC-3)", () => {
  it("shows the empty state when there are no waterings", () => {
    render(<WateringsSection plantId={1} waterings={[]} today={TODAY} />);
    expect(screen.getByText(uk.watering.empty)).toBeInTheDocument();
    // No watering rows are rendered.
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("renders each watering in the supplied (date DESC, id DESC) order with DD.MM.YYYY + note", () => {
    // Pre-ordered by the query: most recent first, then id desc on a tie.
    const waterings: Watering[] = [
      {
        id: 3,
        plantId: 1,
        wateredOn: "2026-06-20",
        note: "полив дощовою водою",
        createdAt: "2026-06-20 10:00:00",
      },
      {
        id: 2,
        plantId: 1,
        wateredOn: "2026-06-10",
        note: null,
        createdAt: "2026-06-10 10:00:00",
      },
    ];

    render(<WateringsSection plantId={1} waterings={waterings} today={TODAY} />);

    expect(screen.queryByText(uk.watering.empty)).not.toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // First row is the most-recent watering, shown as DD.MM.YYYY + its note.
    expect(items[0]).toHaveTextContent("20.06.2026");
    expect(items[0]).toHaveTextContent("полив дощовою водою");
    // Second row has no note: shows the date + a clear "no note" affordance,
    // never a blank/undefined.
    expect(items[1]).toHaveTextContent("10.06.2026");
    expect(items[1]).toHaveTextContent(uk.watering.noNote);
  });

  it("renders the add form (reachable in <= 2 clicks from the detail page) (FR-WATER-01)", () => {
    render(<WateringsSection plantId={1} waterings={[]} today={TODAY} />);
    // The add form's date field is present in the section.
    expect(screen.getByLabelText(uk.watering.wateredOnLabel)).toBeInTheDocument();
  });

  it("renders in isolation without referencing the measurements section copy (design R7)", () => {
    render(<WateringsSection plantId={1} waterings={[]} today={TODAY} />);
    // The waterings section is self-contained: it shows the watering section
    // heading and not the growth section heading (no cross-wiring).
    expect(screen.getByText(uk.watering.sectionTitle)).toBeInTheDocument();
    expect(screen.queryByText(uk.growth.sectionTitle)).not.toBeInTheDocument();
  });
});
