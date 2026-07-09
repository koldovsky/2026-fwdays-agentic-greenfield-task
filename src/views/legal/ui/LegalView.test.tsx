// views/legal (add-legal-pages): both documents render from i18n, state the
// required privacy/GDPR facts, and carry no tracker/analytics <script> markup
// (BC-PRIVACY-01, NFR-GDPR-01/02).
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";

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
    expect(screen.getByText(/не використовуємо ваше резюме для навчання/i)).toBeInTheDocument();
    expect(screen.getByText(/немає сторонніх трекерів/i)).toBeInTheDocument();
    // GDPR export + delete rights are disclosed.
    expect(screen.getByText(/експортувати всі збережені дані/i)).toBeInTheDocument();
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
