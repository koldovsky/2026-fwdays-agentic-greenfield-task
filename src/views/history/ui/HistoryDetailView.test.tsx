// HistoryDetailView render (add-tailoring-history, FR-HISTORY-02): re-opens a
// stored tailoring in the result-view widgets, with a working include toggle.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { TailoringRecord } from "@/shared/lib/db";

import { HistoryDetailView } from "./HistoryDetailView";

const RECORD: TailoringRecord = {
  id: "t-1",
  userId: "u-1",
  cvProfileId: null,
  jobDescriptionId: "jd-1",
  jobTitle: "Staff Engineer",
  matchScore: 74,
  createdAt: "2026-07-01T00:00:00.000Z",
  checklist: [{ requirement: "React", importance: "must", status: "met", rationale: "confirmed" }],
  bullets: [
    { text: "Owned the platform", grounding: "met", included: true },
    { text: "Led 30 engineers", grounding: "overclaim", included: false },
  ],
};

describe("HistoryDetailView", () => {
  it("renders the stored title, score, and bullets with a back link", () => {
    render(<HistoryDetailView record={RECORD} />);
    expect(screen.getByRole("heading", { name: "Staff Engineer" })).toBeInTheDocument();
    expect(screen.getByText("74")).toBeInTheDocument();
    expect(screen.getByText("Owned the platform")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ua.history.backToList })).toHaveAttribute(
      "href",
      "/history",
    );
  });

  it("seeds the overclaim bullet as excluded and toggles it locally", async () => {
    render(<HistoryDetailView record={RECORD} />);
    const row = screen.getByText("Led 30 engineers").closest("li") as HTMLElement;
    const toggle = within(row).getByRole("checkbox");

    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(within(row).getByRole("checkbox")).toBeChecked();
  });
});
