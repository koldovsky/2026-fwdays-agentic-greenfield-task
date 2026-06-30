// RED (Phase 4b, slice 7 add-reminders, task 1.12) — the home summary-card
// contract, written from the spec BEFORE the implementation. The card shows the
// "Сьогодні полити" label and the due COUNT; a count of 0 renders a literal 0,
// never a blank (the all-done state replaces the LIST, not the count display).
// Paint (pine bg, paper text, radius 22) is a Phase-6 vision concern, not here.
//
// Imports fail until components/reminders/SummaryCard.tsx and uk.reminders copy
// exist. That is the intended RED.
//
// @trace FR-REM-03
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SummaryCard } from "@/components/reminders/SummaryCard";
import { uk } from "@/lib/i18n/uk";

afterEach(cleanup);

describe("<SummaryCard> (FR-REM-03)", () => {
  it("renders the 'Сьогодні полити' label and the due count", () => {
    render(<SummaryCard count={3} />);
    expect(screen.getByText(uk.reminders.summaryLabel)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders a literal 0 when nothing is due (not a blank)", () => {
    render(<SummaryCard count={0} />);
    expect(screen.getByText(uk.reminders.summaryLabel)).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
