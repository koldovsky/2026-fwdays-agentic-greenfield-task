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

  it("exposes GDPR export (download link) and delete (action)", () => {
    render(<AccountProfileView user={USER} subscription={null} />);
    expect(screen.getByRole("link", { name: ua.profile.exportAction })).toHaveAttribute(
      "href",
      "/api/account/export",
    );
    expect(screen.getByRole("button", { name: ua.profile.deleteAction })).toBeInTheDocument();
  });
});
