// ChecklistRow locale-forwarding contract (fix-checklist-pill-i18n, NFR-I18N-01,
// FR-CHECKLIST-02). Proves ChecklistRow threads its locale prop through to the
// StatusPill it renders — the key integration point in the forwarding chain.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChecklistRow } from "./ChecklistRow";

describe("ChecklistRow — locale forwarding (fix-checklist-pill-i18n spec)", () => {
  // Baseline: no locale prop falls back to Ukrainian (Ukrainian-first default)
  it("renders Ukrainian pill label when locale is omitted", () => {
    render(
      <ChecklistRow
        requirement="React 5+ years"
        status="partial"
      />,
    );
    expect(screen.getByText("Частково")).toBeInTheDocument();
  });

  it("renders Ukrainian pill label when locale='ua'", () => {
    render(
      <ChecklistRow
        requirement="React 5+ years"
        status="met"
        locale="ua"
      />,
    );
    expect(screen.getByText("Підтверджено")).toBeInTheDocument();
  });

  // Core contract: locale='en' must reach the StatusPill inside ChecklistRow
  it("renders 'Partial' (English) inside the pill when status='partial' and locale='en'", () => {
    render(
      <ChecklistRow
        requirement="React 5+ years"
        status="partial"
        locale="en"
      />,
    );
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.queryByText("Частково")).not.toBeInTheDocument();
  });

  it("renders 'Met' (English) inside the pill when status='met' and locale='en'", () => {
    render(
      <ChecklistRow
        requirement="Node.js"
        status="met"
        locale="en"
      />,
    );
    expect(screen.getByText("Met")).toBeInTheDocument();
  });

  it("renders 'Gap' (English) inside the pill when status='gap' and locale='en'", () => {
    render(
      <ChecklistRow
        requirement="AWS experience"
        status="gap"
        locale="en"
      />,
    );
    expect(screen.getByText("Gap")).toBeInTheDocument();
  });

  it("renders 'Overclaim risk' (English) when status='overclaim' and locale='en'", () => {
    render(
      <ChecklistRow
        requirement="Team management"
        status="overclaim"
        locale="en"
      />,
    );
    expect(screen.getByText("Overclaim risk")).toBeInTheDocument();
  });

  it("renders 'Coverable' (English) when status='info' and locale='en'", () => {
    render(
      <ChecklistRow
        requirement="GraphQL"
        status="info"
        locale="en"
      />,
    );
    expect(screen.getByText("Coverable")).toBeInTheDocument();
  });

  // Sanity: the requirement text itself is always rendered regardless of locale
  it("renders the requirement text alongside the localized pill", () => {
    render(
      <ChecklistRow
        requirement="TypeScript"
        status="met"
        locale="en"
        rationale="Used throughout the CV."
      />,
    );
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Used throughout the CV.")).toBeInTheDocument();
    expect(screen.getByText("Met")).toBeInTheDocument();
  });
});
