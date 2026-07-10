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

// fix-faq-and-privacy-accuracy (BC-HONESTY-01): attach + cover-letter answers
// must gate on "any paid plan" (matches hasPaidAccess, which is true for Pro,
// Ultra, and Job-hunt Pass), never on "Pro" specifically — the old copy
// falsely implied Ultra/Pass subscribers were locked out.
describe("Faq — paid-plan gating language (fix-faq-and-privacy-accuracy)", () => {
  it("EN: attach and cover-letter answers say 'any paid plan', not Pro-only", () => {
    const enItems = faqSection("en").items;
    const attach = enItems.find((i) => /attach my original PDF/i.test(i.question));
    const coverLetter = enItems.find((i) => /write my cover letter/i.test(i.question));
    expect(attach).toBeDefined();
    expect(coverLetter).toBeDefined();
    expect(attach?.answer).toMatch(/any paid plan/i);
    expect(coverLetter?.answer).toMatch(/any paid plan/i);
    expect(attach?.answer).not.toMatch(/\bPro\b/);
    expect(coverLetter?.answer).not.toMatch(/\bPro\b/);
  });

  it("UA: attach and cover-letter answers say 'будь-який платний тариф', not Pro-only", () => {
    const uaItems = faqSection("ua").items;
    const attach = uaItems.find((i) => /оригінальний PDF/i.test(i.question));
    const coverLetter = uaItems.find((i) => /супровідний лист/i.test(i.question));
    expect(attach).toBeDefined();
    expect(coverLetter).toBeDefined();
    expect(attach?.answer).toMatch(/будь-як(ому|ий) платн(ому|ий) тариф/i);
    expect(coverLetter?.answer).toMatch(/будь-як(ому|ий) платн(ому|ий) тариф/i);
    expect(attach?.answer).not.toMatch(/\bPro\b/);
    expect(coverLetter?.answer).not.toMatch(/\bPro\b/);
  });

  it("renders the corrected EN attach answer through the component (locale prop)", () => {
    render(<Faq locale="en" />);
    const enItems = faqSection("en").items;
    const attach = enItems.find((i) => /attach my original PDF/i.test(i.question));
    expect(attach).toBeDefined();
    expect(screen.getByText(attach!.answer)).toBeInTheDocument();
  });
});
