// ChecklistPreview locale-forwarding contract (fix-checklist-pill-i18n, NFR-I18N-01,
// FR-SALES-02, FR-CHECKLIST-02). This is the root of the locale-forwarding chain on
// the landing: ChecklistPreview -> ChecklistRow -> StatusPill. Tests prove the
// actual bug that motivated the change: EN pills were showing Ukrainian text.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { en, ua } from "@/shared/lib/i18n";
import { ChecklistPreview } from "./ChecklistPreview";

// Derive label sets from the dictionaries so the tests do not hard-code strings that
// the i18n keys own — if a label changes in the dictionary, both the component and
// the test break at the same point (correct coupling to spec behavior).
const EN_LABELS = Object.values(en.checklist.statusLabel);
const UA_LABELS = Object.values(ua.checklist.statusLabel);

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
