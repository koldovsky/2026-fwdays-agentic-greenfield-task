// FAQ accordion behavior (FR-SALES-01, NFR-A11Y-01): native <details> disclosure
// toggles open/closed and each summary is keyboard reachable (focusable).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { faqSection } from "../lib/content";
import { Faq } from "./Faq";

// Faq defaults to the Ukrainian-first locale (NFR-I18N-01); assert against it.
const faqItems = faqSection("ua").items;

describe("Faq", () => {
  it("renders every question as a collapsed disclosure", () => {
    render(<Faq />);
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(faqItems.length);
    for (const g of groups) {
      expect(g).not.toHaveAttribute("open");
    }
  });

  it("toggles a question open and closed on click", async () => {
    render(<Faq />);
    const summary = screen.getByText(faqItems[0].question);
    const details = summary.closest("details");

    await userEvent.click(summary);
    expect(details).toHaveAttribute("open");
    expect(screen.getByText(faqItems[0].answer)).toBeVisible();

    await userEvent.click(summary);
    expect(details).not.toHaveAttribute("open");
  });

  it("summaries are keyboard focusable", () => {
    render(<Faq />);
    const summary = screen.getByText(faqItems[0].question);
    summary.focus();
    expect(summary).toHaveFocus();
  });
});
