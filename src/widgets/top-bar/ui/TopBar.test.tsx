// Top-bar session state (FR-SHELL-01, add-auth 3.1): anonymous visitors get
// sign-in / try-free CTAs; a signed-in user sees their identity and sign-out.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";

import { TopBar } from "./TopBar";

vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

describe("TopBar", () => {
  it("shows sign-in and try-free CTAs when anonymous", () => {
    render(<TopBar />);
    expect(screen.getByRole("link", { name: ua.topBar.signIn })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.getByRole("link", { name: ua.topBar.tryFree })).toHaveAttribute(
      "href",
      "/tailor",
    );
    expect(
      screen.queryByRole("button", { name: ua.auth.signOutAction }),
    ).not.toBeInTheDocument();
  });

  it("shows the account menu (identity + sign-out) behind the burger when signed in", () => {
    render(<TopBar user={{ email: "olena@example.com", name: null }} />);
    // Signed-in: the burger trigger is shown, the sign-in CTA is gone.
    const trigger = screen.getByRole("button", { name: ua.accountMenu.triggerLabel });
    expect(screen.queryByRole("link", { name: ua.topBar.signIn })).not.toBeInTheDocument();
    // Identity + sign-out live inside the dropdown, revealed on open.
    expect(screen.queryByText("olena@example.com")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByText("olena@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ua.auth.signOutAction })).toBeInTheDocument();
  });

  it("keeps the primary nav (logo, features, pricing) in both states", () => {
    render(<TopBar />);
    expect(screen.getByRole("link", { name: ua.topBar.homeLabel })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: ua.topBar.navFeatures })).toHaveAttribute(
      "href",
      "/#how",
    );
    expect(screen.getByRole("link", { name: ua.topBar.navPricing })).toHaveAttribute(
      "href",
      "/#pricing",
    );
  });
});
