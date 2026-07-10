// views/legal (add-legal-pages): both documents render from i18n, state the
// required privacy/GDPR facts, and carry no tracker/analytics <script> markup
// (BC-PRIVACY-01, NFR-GDPR-01/02).
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { en, ua } from "@/shared/lib/i18n";

import { LegalView } from "./LegalView";

// TopBarSession reads the session; anonymous is fine for a static legal page.
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => ({ status: "unauthenticated", data: null }),
}));

describe("LegalView", () => {
  it("renders the Privacy Policy with data-handling and GDPR statements", () => {
    render(<LegalView doc="privacy" />);

    expect(
      screen.getByRole("heading", { level: 1, name: ua.legal.privacy.title }),
    ).toBeInTheDocument();
    // Encryption-at-rest + no-training + no-trackers claims are present.
    expect(screen.getByText(/зашифрований у стані спокою/i)).toBeInTheDocument();
    expect(
      screen.getByText(/не використовуємо ваше резюме чи описи вакансій для навчання/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/немає сторонніх трекерів/i).length).toBeGreaterThan(0);
    // GDPR export + delete rights are disclosed.
    expect(screen.getByText(/експортувати ваш акаунт.*у форматі PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/назавжди видалити акаунт/i)).toBeInTheDocument();
  });

  it("renders the public offer with plans and terms", () => {
    render(<LegalView doc="offer" />);

    expect(
      screen.getByRole("heading", { level: 1, name: ua.legal.offer.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Job-hunt Pass/)).toBeInTheDocument();
    expect(screen.getByText(/Умови повернення коштів буде уточнено/i)).toBeInTheDocument();
  });

  it("shows the draft-pending-sign-off note", () => {
    render(<LegalView doc="privacy" />);
    expect(screen.getByText(ua.legal.draftNote)).toBeInTheDocument();
  });

  it("carries no tracker or analytics <script> markup", () => {
    const { container } = render(<LegalView doc="privacy" />);
    expect(container.querySelector("script")).toBeNull();
  });
});

// fix-faq-and-privacy-accuracy: the "Your rights" section must offer the PDF
// export (NFR-GDPR-01, revised — JSON export was replaced by a PDF render) and
// must never claim JSON. The GDPR draft must disclose Anthropic as a
// subprocessor and carry clearly-marked [TODO placeholders instead of
// asserting facts nobody has confirmed (entity/DPA/authority, BC-HONESTY-01).
describe("LegalView — GDPR draft accuracy (fix-faq-and-privacy-accuracy)", () => {
  it("UA: rights section mentions PDF export and never mentions JSON", () => {
    const { container } = render(<LegalView doc="privacy" />);
    expect(screen.getByText(/у форматі PDF/i)).toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/JSON/);
  });

  it("EN: rights section mentions PDF export and never mentions JSON", () => {
    const { container } = render(<LegalView doc="privacy" locale="en" />);
    expect(
      screen.getByRole("heading", { level: 1, name: en.legal.privacy.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(/as a PDF/i)).toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/JSON/);
  });

  it("UA: discloses Anthropic as a subprocessor of CV and job-description text", () => {
    render(<LegalView doc="privacy" />);
    expect(screen.getByText(/Anthropic \(США\)/)).toBeInTheDocument();
  });

  it("EN: discloses Anthropic as a subprocessor of CV and job-description text", () => {
    render(<LegalView doc="privacy" locale="en" />);
    expect(screen.getByText(/Anthropic \(United States\)/)).toBeInTheDocument();
  });

  it("UA: carries clearly-marked [TODO placeholders for unresolved legal facts", () => {
    const { container } = render(<LegalView doc="privacy" />);
    expect(container.textContent ?? "").toMatch(/\[TODO/);
  });

  it("EN: carries clearly-marked [TODO placeholders for unresolved legal facts", () => {
    const { container } = render(<LegalView doc="privacy" locale="en" />);
    expect(container.textContent ?? "").toMatch(/\[TODO/);
  });

  it("UA: public offer plans list includes Ultra", () => {
    render(<LegalView doc="offer" />);
    expect(screen.getByText(/^Ultra:/)).toBeInTheDocument();
  });

  it("EN: public offer plans list includes Ultra", () => {
    render(<LegalView doc="offer" locale="en" />);
    expect(
      screen.getByRole("heading", { level: 1, name: en.legal.offer.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Ultra:/)).toBeInTheDocument();
  });
});
