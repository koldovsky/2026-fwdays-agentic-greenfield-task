// HistoryListView render (add-tailoring-history, FR-HISTORY-01).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { TailoringSummary } from "@/shared/lib/db";

import { HistoryListView } from "./HistoryListView";

const SUMMARIES: TailoringSummary[] = [
  { id: "t-1", jobTitle: "Senior Engineer", matchScore: 82, createdAt: "2026-07-03T10:00:00.000Z" },
  { id: "t-2", jobTitle: null, matchScore: null, createdAt: "2026-07-01T09:00:00.000Z" },
];

describe("HistoryListView", () => {
  it("renders a row per tailoring linking to its detail route", () => {
    render(<HistoryListView summaries={SUMMARIES} />);

    const first = screen.getByText("Senior Engineer").closest("a");
    expect(first).toHaveAttribute("href", "/history/t-1");
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("2026-07-03")).toBeInTheDocument();
  });

  it("falls back to the untitled label and a dash score when absent", () => {
    render(<HistoryListView summaries={SUMMARIES} />);
    const untitled = screen.getByText(ua.history.untitled).closest("a");
    expect(untitled).toHaveAttribute("href", "/history/t-2");
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the empty state with a start-tailoring CTA when there is no history", () => {
    render(<HistoryListView summaries={[]} />);
    expect(screen.getByText(ua.history.empty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ua.history.emptyCta })).toHaveAttribute("href", "/tailor");
  });
});
