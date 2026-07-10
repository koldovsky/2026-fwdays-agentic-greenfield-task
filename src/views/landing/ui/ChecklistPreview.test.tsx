// ChecklistPreview locale-forwarding + layout contract (fix-checklist-pill-i18n,
// fix-landing-checklist-ua-layout, NFR-I18N-01, FR-SALES-02, FR-CHECKLIST-02/04).
// This is the root of the locale-forwarding chain on the landing:
// ChecklistPreview -> ChecklistRow -> StatusPill. Tests prove the actual bug that
// motivated the i18n change (EN pills showing Ukrainian text) and lock the current
// layout contract: a MatchScore summary card sits on top, followed by the
// checklist rows laid out as a single flat, equal-height two-column grid
// (sm:grid-cols-2 + auto-rows-fr) whose rows are DIRECT children below it.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { en, ua } from "@/shared/lib/i18n";
import { checklistSection } from "../lib/content";
import { ChecklistPreview } from "./ChecklistPreview";

// Derive label sets from the dictionaries so the tests do not hard-code strings that
// the i18n keys own — if a label changes in the dictionary, both the component and
// the test break at the same point (correct coupling to spec behavior).
const EN_LABELS = Object.values(en.checklist.statusLabel);
const UA_LABELS = Object.values(ua.checklist.statusLabel);

/**
 * The single flat grid container that lays the checklist rows out in two
 * equal-height columns. ChecklistRow items are DIRECT children of this grid
 * (row-major fill), not wrapped in per-column divs.
 */
function findColumnGrid(container: HTMLElement): HTMLElement {
  const grid = container.querySelector<HTMLElement>('[class*="sm:grid-cols-2"]');
  if (grid === null) {
    throw new Error("expected a two-column grid container (sm:grid-cols-2)");
  }
  return grid;
}

describe("ChecklistPreview — locale threading (fix-checklist-pill-i18n spec)", () => {
  // Scenario: UA visitor sees Ukrainian pill labels (default / no regression)
  it("renders Ukrainian pill labels by default (no locale prop)", () => {
    render(<ChecklistPreview />);
    // At least one UA label must be present in the rendered output.
    const rendered = document.body.textContent ?? "";
    const hasUaLabel = UA_LABELS.some((label) => rendered.includes(label));
    expect(hasUaLabel).toBe(true);
  });

  it("renders Ukrainian pill labels when locale='ua'", () => {
    render(<ChecklistPreview locale="ua" />);
    const rendered = document.body.textContent ?? "";
    const hasUaLabel = UA_LABELS.some((label) => rendered.includes(label));
    expect(hasUaLabel).toBe(true);
  });

  // Scenario: EN visitor sees English pill labels (the actual bug)
  it("renders at least one English pill label when locale='en'", () => {
    render(<ChecklistPreview locale="en" />);
    const rendered = document.body.textContent ?? "";
    const hasEnLabel = EN_LABELS.some((label) => rendered.includes(label));
    expect(hasEnLabel).toBe(true);
  });

  it("renders no Ukrainian pill label text when locale='en'", () => {
    render(<ChecklistPreview locale="en" />);
    const rendered = document.body.textContent ?? "";
    for (const uaLabel of UA_LABELS) {
      expect(rendered).not.toContain(uaLabel);
    }
  });

  // Specifically confirm the full EN label set that the spec names
  it("shows 'Met' in the pill for a met-status row when locale='en'", () => {
    // checklistSection has at least one 'met' row (rows[0] and rows[1])
    render(<ChecklistPreview locale="en" />);
    expect(screen.getAllByText("Met").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Partial' in the pill for the partial-status row when locale='en'", () => {
    render(<ChecklistPreview locale="en" />);
    expect(screen.getByText("Partial")).toBeInTheDocument();
  });

  it("shows 'Coverable' in the pill for the info-status row when locale='en'", () => {
    render(<ChecklistPreview locale="en" />);
    expect(screen.getByText("Coverable")).toBeInTheDocument();
  });

  it("shows 'Gap' in the pill for the gap-status row when locale='en'", () => {
    render(<ChecklistPreview locale="en" />);
    expect(screen.getByText("Gap")).toBeInTheDocument();
  });

  it("shows 'Overclaim risk' in the pill for the overclaim-status row when locale='en'", () => {
    render(<ChecklistPreview locale="en" />);
    expect(screen.getByText("Overclaim risk")).toBeInTheDocument();
  });

  // Scenario: locale change does not alter pill appearance — structural integrity
  it("renders the same number of status pills regardless of locale", () => {
    const { unmount } = render(<ChecklistPreview locale="ua" />);
    const uaPills = document.querySelectorAll(".rounded-pill").length;
    unmount();
    render(<ChecklistPreview locale="en" />);
    const enPills = document.querySelectorAll(".rounded-pill").length;
    expect(enPills).toBe(uaPills);
  });
});

describe("ChecklistPreview — score card + two-column layout (fix-landing-checklist-ua-layout spec)", () => {
  // Scenario: the MatchScore summary renders as a card, above the checklist grid.
  it("renders the MatchScore summary (score value + headline) for both locales", () => {
    const uaContent = checklistSection("ua");
    const { unmount } = render(<ChecklistPreview locale="ua" />);
    expect(screen.getByText(String(uaContent.score))).toBeInTheDocument();
    expect(screen.getByText(uaContent.headline)).toBeInTheDocument();
    unmount();

    const enContent = checklistSection("en");
    render(<ChecklistPreview locale="en" />);
    expect(screen.getByText(String(enContent.score))).toBeInTheDocument();
    expect(screen.getByText(enContent.headline)).toBeInTheDocument();
    expect(enContent.headline).toBe("Strong fit, honestly scored");
  });

  // Scenario: every requirement + rationale still renders, none dropped by the
  // column split, for both locales.
  it("renders every checklist row (requirement + rationale) for the default ua locale", () => {
    const { rows } = checklistSection("ua");
    render(<ChecklistPreview />);
    for (const row of rows) {
      expect(screen.getByText(row.requirement)).toBeInTheDocument();
      expect(screen.getByText(row.rationale)).toBeInTheDocument();
    }
  });

  it("renders every checklist row (requirement + rationale) for locale='en'", () => {
    const { rows } = checklistSection("en");
    render(<ChecklistPreview locale="en" />);
    for (const row of rows) {
      expect(screen.getByText(row.requirement)).toBeInTheDocument();
      expect(screen.getByText(row.rationale)).toBeInTheDocument();
    }
  });

  // Scenario: rows are laid out as a single flat two-column grid whose direct
  // children are the N ChecklistRow items (not per-column wrapper divs), and the
  // grid carries the equal-height fix (auto-rows-fr) — the point of this change.
  it("lays the checklist rows out as one flat grid with every row as a direct child", () => {
    const { rows } = checklistSection("en");
    const { container } = render(<ChecklistPreview locale="en" />);
    const grid = findColumnGrid(container);
    // One direct child per row (6 for the real data) — no per-column wrapper divs.
    expect(grid.children.length).toBe(rows.length);
  });

  it("carries both sm:grid-cols-2 and auto-rows-fr on the grid container", () => {
    const { container } = render(<ChecklistPreview locale="en" />);
    const grid = findColumnGrid(container);
    expect(grid.className).toContain("sm:grid-cols-2");
    expect(grid.className).toContain("auto-rows-fr");
  });

  it("renders the score card before the checklist grid in DOM order", () => {
    const { container } = render(<ChecklistPreview locale="en" />);
    const scoreCard = container.querySelector<HTMLElement>(".bg-surface-card");
    expect(scoreCard).not.toBeNull();
    const grid = findColumnGrid(container);
    // scoreCard must precede grid: grid should report itself as FOLLOWING scoreCard.
    const position = scoreCard!.compareDocumentPosition(grid);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Scenario: a flat row-major grid never drops a row, including when the row
  // count is odd — locked independently of the current (even, 6-row) static
  // content by mocking the content source. With a flat grid there is no per-column
  // split to assert; every provided row must render as a direct grid child.
  it("drops no row when the row count is odd", async () => {
    vi.resetModules();
    vi.doMock("../lib/content", async () => {
      const actual = await vi.importActual<typeof import("../lib/content")>(
        "../lib/content",
      );
      const oddRows = [
        { requirement: "Req A", priority: "must" as const, status: "met" as const, rationale: "Rationale A" },
        { requirement: "Req B", priority: "must" as const, status: "gap" as const, rationale: "Rationale B" },
        { requirement: "Req C", priority: "nice" as const, status: "partial" as const, rationale: "Rationale C" },
        { requirement: "Req D", priority: "nice" as const, status: "info" as const, rationale: "Rationale D" },
        { requirement: "Req E", priority: "must" as const, status: "overclaim" as const, rationale: "Rationale E" },
      ];
      return {
        ...actual,
        checklistSection: () => ({
          head: { kicker: "K", title: "T", lead: "L" },
          score: 82,
          headline: "Headline",
          subtext: "Subtext",
          rows: oddRows,
        }),
      };
    });

    const { ChecklistPreview: MockedChecklistPreview } = await import("./ChecklistPreview");
    const { container } = render(<MockedChecklistPreview locale="en" />);

    for (const req of ["Req A", "Req B", "Req C", "Req D", "Req E"]) {
      expect(screen.getByText(req)).toBeInTheDocument();
    }
    const grid = findColumnGrid(container);
    // Flat grid: all 5 rows are direct children — none lost or duplicated.
    expect(grid.children.length).toBe(5);

    vi.doUnmock("../lib/content");
    vi.resetModules();
  });
});
