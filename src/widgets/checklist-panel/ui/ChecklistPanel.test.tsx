import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Requirement } from "@/entities/requirement";
import { uk } from "@/shared/lib/i18n";

import { ChecklistPanel, type ChecklistPanelRow } from "./ChecklistPanel";

const req = (id: string, text: string, importance: Requirement["importance"]): Requirement => ({
  id,
  text,
  importance,
  keywords: [],
});

const rows: ChecklistPanelRow[] = [
  { requirement: req("a", "5+ years React", "must-have"), status: "met", rationale: "CV підтверджує React." },
  { requirement: req("b", "GraphQL", "nice-to-have"), status: "partial", rationale: "Дотичний досвід." },
  { requirement: req("c", "Team lead", "must-have"), status: "overclaim-risk", rationale: "Немає підтвердження в CV." },
];

describe("ChecklistPanel (FR-CHECKLIST-02, FR-CHECKLIST-04)", () => {
  it("renders the 0–100 match score in the header", () => {
    render(<ChecklistPanel score={76} rows={rows} />);
    expect(screen.getByText("76")).toBeInTheDocument();
    expect(screen.getByText(uk.checklist.scoreHeadline)).toBeInTheDocument();
  });

  it("renders one row per requirement, in order", () => {
    render(<ChecklistPanel score={50} rows={rows} />);
    for (const row of rows) {
      expect(screen.getByText(row.requirement.text)).toBeInTheDocument();
    }
  });

  it("visually distinguishes an overclaim-risk row via its status label", () => {
    render(<ChecklistPanel score={50} rows={rows} />);
    // The overclaim-risk row surfaces the dedicated Ukrainian status label,
    // distinct from met/partial — asserted via copy, not CSS classes.
    expect(
      screen.getByText(uk.checklist.statusLabel["overclaim-risk"]),
    ).toBeInTheDocument();
    expect(screen.queryByText(uk.checklist.statusLabel.gap)).not.toBeInTheDocument();
  });
});
