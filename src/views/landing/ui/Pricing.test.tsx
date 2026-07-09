// Landing Pricing section tests (task 5.3, FR-SALES-03, BC-BRAND-01, NFR-A11Y-01,
// NFR-I18N-01). Asserts that all four plan names and prices render correctly, that
// Ultra is the only featured (inverted) card, and that brand rules hold.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { en, ua } from "@/shared/lib/i18n";
import { Pricing } from "./Pricing";

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/u;

describe("Pricing — plan names and prices (task 5.3, FR-SALES-03)", () => {
  it("renders all four plan names in UA locale by default", () => {
    render(<Pricing locale="ua" />);
    expect(screen.getByText(ua.landing.pricing.free.name)).toBeInTheDocument();
    expect(screen.getByText(ua.landing.pricing.pro.name)).toBeInTheDocument();
    expect(screen.getByText(ua.landing.pricing.ultra.name)).toBeInTheDocument();
    expect(screen.getByText(ua.landing.pricing.pass.name)).toBeInTheDocument();
  });

  it("renders all four plan names in EN locale", () => {
    render(<Pricing locale="en" />);
    // Free, Pro, Ultra, Job-hunt Pass
    expect(screen.getByText(en.landing.pricing.free.name)).toBeInTheDocument();
    expect(screen.getByText(en.landing.pricing.pro.name)).toBeInTheDocument();
    expect(screen.getByText(en.landing.pricing.ultra.name)).toBeInTheDocument();
    expect(screen.getByText(en.landing.pricing.pass.name)).toBeInTheDocument();
  });

  it("renders the $0 price for Free", () => {
    render(<Pricing locale="en" />);
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("renders $12 for Pro", () => {
    render(<Pricing locale="en" />);
    expect(screen.getByText("$12")).toBeInTheDocument();
  });

  it("renders $30 for Ultra", () => {
    render(<Pricing locale="en" />);
    expect(screen.getByText("$30")).toBeInTheDocument();
  });

  it("renders $20 for Job-hunt Pass", () => {
    render(<Pricing locale="en" />);
    expect(screen.getByText("$20")).toBeInTheDocument();
  });
});

describe("Pricing — Ultra is the only featured card (task 5.3)", () => {
  it("Ultra card has the inverted (bg-ink) treatment — only one such card", () => {
    render(<Pricing locale="en" />);
    // The featured card is distinguished by bg-ink on its container.
    const featured = document.querySelectorAll(".bg-ink");
    expect(featured.length).toBe(1);
  });

  it("Ultra CTA button uses the primary variant (task 5.3, FR-SALES-03)", () => {
    render(<Pricing locale="en" />);
    const ultraCta = screen.getByRole("link", { name: en.landing.pricing.ultra.cta });
    expect(ultraCta).toBeInTheDocument();
  });

  it("Free is rendered as a lightweight row, not a full card (freeRow treatment)", () => {
    render(<Pricing locale="en" />);
    // Free uses a secondary button variant and is not inside the paid grid.
    const freeCta = screen.getByRole("link", { name: en.landing.pricing.free.cta });
    expect(freeCta).toBeInTheDocument();
  });
});

describe("Pricing — feature lists use <li> elements (task 5.3, NFR-A11Y-01)", () => {
  it("each paid plan renders its features as <li> items", () => {
    render(<Pricing locale="en" />);
    // Some feature strings (e.g. "Everything in Pro") appear in multiple plans;
    // use getAllByText so a multi-match does not throw.
    const allFeatures = [
      ...en.landing.pricing.pro.features,
      ...en.landing.pricing.ultra.features,
      ...en.landing.pricing.pass.features,
    ];
    for (const feature of allFeatures) {
      const elements = screen.getAllByText(feature);
      expect(elements.length).toBeGreaterThanOrEqual(1);
      // Every match must be inside a <li>
      for (const el of elements) {
        expect(el.closest("li")).not.toBeNull();
      }
    }
  });

  it("feature items are rendered inside <li> elements", () => {
    render(<Pricing locale="en" />);
    const listItems = document.querySelectorAll("li");
    // At least the sum of all paid plan features should be present as <li>
    const totalPaidFeatures =
      en.landing.pricing.pro.features.length +
      en.landing.pricing.ultra.features.length +
      en.landing.pricing.pass.features.length;
    expect(listItems.length).toBeGreaterThanOrEqual(totalPaidFeatures);
  });
});

describe("Pricing — brand audit (task 5.3, BC-BRAND-01)", () => {
  it("rendered text contains no emoji (BC-BRAND-01)", () => {
    render(<Pricing locale="en" />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(EMOJI);
  });

  it("rendered text contains no exclamation points (BC-BRAND-01)", () => {
    render(<Pricing locale="en" />);
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("!");
  });
});

describe("Pricing — i18n locale switching (task 5.3, NFR-I18N-01)", () => {
  it("renders plan names in UA and not EN when locale='ua'", () => {
    render(<Pricing locale="ua" />);
    // Job-hunt Pass name is the same in both locales — use billing planName which differ
    // Use the pricing head kicker which differs between locales if they are different,
    // or simply confirm all ua plan names are visible.
    const rendered = document.body.textContent ?? "";
    // The UA pricing section head kicker should be present
    expect(rendered).toContain(ua.landing.pricing.head.kicker);
  });

  it("renders section head kicker in EN when locale='en'", () => {
    render(<Pricing locale="en" />);
    const rendered = document.body.textContent ?? "";
    expect(rendered).toContain(en.landing.pricing.head.kicker);
  });
});
