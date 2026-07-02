// FAQ accordion behavior (FR-SALES-01, NFR-A11Y-01): aria-expanded toggles,
// answer shows/hides, and the control is keyboard operable.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { faqItems } from "../lib/content";
import { Faq } from "./Faq";

describe("Faq", () => {
  it("renders every question as a collapsed button", () => {
    render(<Faq />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(faqItems.length);
    for (const btn of buttons) {
      expect(btn).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("toggles a question open and closed on click", async () => {
    render(<Faq />);
    const first = screen.getByRole("button", { name: faqItems[0].question });

    await userEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(faqItems[0].answer)).toBeVisible();

    await userEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("is operable by keyboard", async () => {
    render(<Faq />);
    const first = screen.getByRole("button", { name: faqItems[0].question });
    first.focus();
    await userEvent.keyboard("{Enter}");
    expect(first).toHaveAttribute("aria-expanded", "true");
  });
});
