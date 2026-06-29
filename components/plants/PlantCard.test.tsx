// Component test for the «Поливайко» plant card (design D6, FR-DS-03). Asserts
// the jsdom-provable contract of the card the list (`app/page.tsx`) renders:
//   - the whole card is a LINK to `/plants/[id]` (list→detail navigation,
//     FR-PLANT-04), keyboard-operable;
//   - the plant name renders as the card title and the species/latin name is
//     shown alongside it;
//   - the placeholder status pill node is present (dot + status label);
//   - a full-width action affordance is rendered;
//   - the status LINE copy is keyed by status, so it matches the pill/action
//     once slice 7 supplies the real derived status (no hardcoded "healthy"
//     line under a non-healthy pill).
//
// What this test deliberately does NOT assert: exact pixel radius / stripe
// gradient / font rendering — those are paint-level and verified in Phase 6
// (vision-verify). Here we assert the structural + copy contract only.
//
// @trace FR-DS-03
// @trace FR-PLANT-04
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PlantCard } from "@/components/plants/PlantCard";
import { uk } from "@/lib/i18n/uk";

afterEach(cleanup);

describe("<PlantCard> — structure & navigation (FR-DS-03, FR-PLANT-04)", () => {
  it("wraps the whole card in a link to /plants/[id]", () => {
    render(<PlantCard id={7} name="Монстера" species="Monstera deliciosa" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/plants/7");
  });

  it("renders the plant name as the card title and the species alongside it", () => {
    render(<PlantCard id={7} name="Монстера" species="Monstera deliciosa" />);
    expect(
      screen.getByRole("heading", { name: "Монстера" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Monstera deliciosa")).toBeInTheDocument();
  });

  it("renders the optional acquired-date meta line when given", () => {
    render(
      <PlantCard
        id={7}
        name="Монстера"
        species="Monstera deliciosa"
        meta="01.06.2026"
      />,
    );
    expect(screen.getByText("01.06.2026")).toBeInTheDocument();
  });
});

describe("<PlantCard> — status-keyed pill / line / action (FR-DS-03)", () => {
  it("defaults to the healthy placeholder: pill, status line, and action all read healthy", () => {
    render(<PlantCard id={1} name="Фікус" species="Ficus" />);
    expect(screen.getByText(uk.plants.card.statusHealthy)).toBeInTheDocument();
    expect(
      screen.getByText(uk.plants.card.statusLineHealthy),
    ).toBeInTheDocument();
    expect(screen.getByText(uk.plants.card.actionHealthy)).toBeInTheDocument();
  });

  it("renders the overdue pill, the matching overdue status line, and the overdue action", () => {
    render(
      <PlantCard id={1} name="Фікус" species="Ficus" status="overdue" />,
    );
    // The pill label, the status line, and the action are all status-keyed, so
    // an overdue card never shows the healthy "watering on schedule" line under
    // a red "needs watering" pill.
    expect(screen.getByText(uk.plants.card.statusOverdue)).toBeInTheDocument();
    expect(
      screen.getByText(uk.plants.card.statusLineOverdue),
    ).toBeInTheDocument();
    expect(screen.getByText(uk.plants.card.actionOverdue)).toBeInTheDocument();
    // The healthy line must NOT appear on an overdue card.
    expect(
      screen.queryByText(uk.plants.card.statusLineHealthy),
    ).not.toBeInTheDocument();
  });

  it("renders the soon pill, line, and action for the soon status", () => {
    render(<PlantCard id={1} name="Фікус" species="Ficus" status="soon" />);
    expect(screen.getByText(uk.plants.card.statusSoon)).toBeInTheDocument();
    expect(
      screen.getByText(uk.plants.card.statusLineSoon),
    ).toBeInTheDocument();
    expect(screen.getByText(uk.plants.card.actionSoon)).toBeInTheDocument();
  });
});

// RED (Phase 4b, slice 7 add-reminders, task 1.14) — slice 7 wires the REAL
// derived status (FR-REM-07) into the placeholder status prop. The pill color +
// label must match the supplied status, so the card reflects the SAME derived
// status as the summary count and reminder list. These assertions strengthen the
// status-prop contract for the wiring slice 7 performs.
//
// @trace FR-REM-07
describe("<PlantCard> — derived status pill color + label (FR-REM-07)", () => {
  it("renders the overdue chip color + label when status is overdue", () => {
    render(<PlantCard id={1} name="Фікус" species="Ficus" status="overdue" />);
    const pill = screen.getByText(uk.plants.card.statusOverdue);
    // The pill carries the overdue chip color class (paint verified in Phase 6;
    // the class WIRING is unit-checkable here).
    expect(pill.className).toMatch(/overdue/);
  });

  it("renders the healthy chip color + label when status is healthy", () => {
    render(<PlantCard id={1} name="Фікус" species="Ficus" status="healthy" />);
    const pill = screen.getByText(uk.plants.card.statusHealthy);
    expect(pill.className).toMatch(/healthy/);
  });
});
