// Profile view composition (FR-SHELL-01, FR-BILLING-01, NFR-GDPR-01/02):
// identity, plan summary + subscription link, refer-a-friend coming-soon, and
// the GDPR export/delete actions.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";

import { AccountProfileView } from "./AccountProfileView";

vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

const USER = { name: "Olena", email: "olena@example.com" };

describe("AccountProfileView", () => {
  it("shows identity and the Free plan by default with a link to subscription", () => {
    render(<AccountProfileView user={USER} subscription={null} />);
    expect(screen.getByText("olena@example.com")).toBeInTheDocument();
    expect(screen.getByText("Olena")).toBeInTheDocument();
    expect(screen.getByText(ua.billing.planName.free)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: ua.profile.viewSubscription }),
    ).toHaveAttribute("href", "/account/billing");
  });

  it("reflects a paid plan in the plan summary", () => {
    render(
      <AccountProfileView
        user={USER}
        subscription={{ plan: "pro", status: "active", currentPeriodEnd: null }}
      />,
    );
    expect(screen.getByText(ua.billing.planName.pro)).toBeInTheDocument();
  });

  it("surfaces the refer-a-friend promo as coming soon", () => {
    render(<AccountProfileView user={USER} subscription={null} />);
    expect(screen.getByText(ua.profile.referTitle)).toBeInTheDocument();
    expect(screen.getByText(ua.accountMenu.comingSoon)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Task 4.5 — NFR-OBS-01, NFR-GDPR-01: the old plain <a href> export pattern
  // is replaced by ExportDataButton. Assert the anchor-to-/api/account/export
  // is gone from the GDPR section and the button-based control is present.
  // -----------------------------------------------------------------------

  it("GDPR section does not contain a plain anchor pointing to /api/account/export (old pattern removed)", () => {
    render(<AccountProfileView user={USER} subscription={null} />);

    // Query ALL anchors in the document and assert none points at the export URL.
    const anchors = screen.queryAllByRole("link");
    const exportAnchors = anchors.filter(
      (a) => a.getAttribute("href") === "/api/account/export",
    );
    expect(exportAnchors).toHaveLength(0);
  });

  it("GDPR section renders a button-based export control (ExportDataButton) instead of a plain link", () => {
    render(<AccountProfileView user={USER} subscription={null} />);

    // ExportDataButton renders a <button> labelled with exportAction in idle state.
    const exportButton = screen.getByRole("button", { name: ua.profile.exportAction });
    expect(exportButton).toBeInTheDocument();
    // It must not be an anchor element.
    expect(exportButton.tagName.toLowerCase()).toBe("button");
  });

  it("GDPR delete action is still present alongside the export button", () => {
    render(<AccountProfileView user={USER} subscription={null} />);
    expect(screen.getByRole("button", { name: ua.profile.deleteAction })).toBeInTheDocument();
  });
});
