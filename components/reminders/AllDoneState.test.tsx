// RED (Phase 4b, slice 7 add-reminders, task 1.13) — the all-done empty-state
// contract, written from the spec BEFORE the implementation. When nothing is due
// the home replaces the reminder list with a centered leaf icon, the title
// "Усі политі! 🌱", and a reassurance line (FR-REM-06). It must be a helpful
// empty state, never a blank area or a raw error.
//
// Imports fail until components/reminders/AllDoneState.tsx and uk.reminders copy
// exist. That is the intended RED.
//
// @trace FR-REM-06
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AllDoneState } from "@/components/reminders/AllDoneState";
import { uk } from "@/lib/i18n/uk";

afterEach(cleanup);

describe("<AllDoneState> (FR-REM-06)", () => {
  it("renders the 'Усі политі! 🌱' title", () => {
    render(<AllDoneState />);
    expect(screen.getByText(uk.reminders.allDoneTitle)).toBeInTheDocument();
  });

  it("renders the reassurance line", () => {
    render(<AllDoneState />);
    expect(screen.getByText(uk.reminders.allDoneReassurance)).toBeInTheDocument();
  });

  it("renders a decorative leaf icon (the centered all-done glyph)", () => {
    const { container } = render(<AllDoneState />);
    // The LeafIcon renders an inline <svg>; it is decorative (aria-hidden) here.
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
