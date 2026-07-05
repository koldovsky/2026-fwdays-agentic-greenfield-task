// StatusPill locale-forwarding contract (fix-checklist-pill-i18n, NFR-I18N-01,
// FR-CHECKLIST-02). Tests are written against spec scenarios, not implementation.
// TC-PURE-01: no Next.js or DOM-globals dependency — jsdom render only.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./StatusPill";

describe("StatusPill — locale prop (fix-checklist-pill-i18n spec)", () => {
  // Scenario: StatusPill without a locale prop defaults to Ukrainian
  it("renders Ukrainian labels when locale is omitted (Ukrainian-first default)", () => {
    render(<StatusPill status="met" />);
    expect(screen.getByText("Підтверджено")).toBeInTheDocument();
  });

  it("renders Ukrainian label for partial when locale='ua'", () => {
    render(<StatusPill status="partial" locale="ua" />);
    expect(screen.getByText("Частково")).toBeInTheDocument();
  });

  // Scenario: EN visitor sees English pill labels
  it("renders 'Met' (English) when status='met' and locale='en'", () => {
    render(<StatusPill status="met" locale="en" />);
    expect(screen.getByText("Met")).toBeInTheDocument();
  });

  it("renders 'Partial' (English) when status='partial' and locale='en'", () => {
    render(<StatusPill status="partial" locale="en" />);
    expect(screen.getByText("Partial")).toBeInTheDocument();
  });

  it("renders 'Coverable' (English) when status='info' and locale='en'", () => {
    render(<StatusPill status="info" locale="en" />);
    expect(screen.getByText("Coverable")).toBeInTheDocument();
  });

  it("renders 'Gap' (English) when status='gap' and locale='en'", () => {
    render(<StatusPill status="gap" locale="en" />);
    expect(screen.getByText("Gap")).toBeInTheDocument();
  });

  it("renders 'Overclaim risk' (English) when status='overclaim-risk' and locale='en'", () => {
    render(<StatusPill status="overclaim-risk" locale="en" />);
    expect(screen.getByText("Overclaim risk")).toBeInTheDocument();
  });

  // EN locale: no Ukrainian text leaks through. Render every status so each
  // negative assertion is load-bearing (the UA label for that status would
  // otherwise appear when the mapping regresses).
  it("does not render any Ukrainian label text when locale='en'", () => {
    const statuses = ["met", "partial", "info", "gap", "overclaim-risk"] as const;
    const { container } = render(
      <>
        {statuses.map((status) => (
          <StatusPill key={status} status={status} locale="en" />
        ))}
      </>,
    );
    expect(container.textContent).not.toContain("Підтверджено");
    expect(container.textContent).not.toContain("Частково");
    expect(container.textContent).not.toContain("Можна підсилити");
    expect(container.textContent).not.toContain("Відсутнє");
    expect(container.textContent).not.toContain("Ризик перебільшення");
  });

  // Scenario: an explicit label override takes precedence regardless of locale
  it("renders an explicit label prop over the locale-resolved default", () => {
    render(<StatusPill status="met" label="Custom override" locale="en" />);
    expect(screen.getByText("Custom override")).toBeInTheDocument();
    expect(screen.queryByText("Met")).not.toBeInTheDocument();
  });

  it("renders an explicit label prop over the Ukrainian default when no locale is given", () => {
    render(<StatusPill status="met" label="Custom override" />);
    expect(screen.getByText("Custom override")).toBeInTheDocument();
    expect(screen.queryByText("Підтверджено")).not.toBeInTheDocument();
  });

  // Scenario: locale change does not alter pill appearance (only text changes)
  it("preserves color class structure across locales (visual contract unchanged)", () => {
    const { container: uaContainer } = render(<StatusPill status="met" locale="ua" />);
    const { container: enContainer } = render(<StatusPill status="met" locale="en" />);
    // The pill <span> carries the same token classes regardless of locale.
    const uaPill = uaContainer.querySelector("span");
    const enPill = enContainer.querySelector("span");
    expect(uaPill?.className).toBe(enPill?.className);
  });
});
