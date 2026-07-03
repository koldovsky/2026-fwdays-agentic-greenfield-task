// Account menu behavior (FR-SHELL-01): burger discloses a dropdown of account
// links; Usage is disabled ("coming soon"); Escape closes it. It's a disclosure
// of Tab-focusable links, not a WAI-ARIA menu.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";

import { AccountMenu } from "./AccountMenu";

vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

const USER = { name: "Olena", email: "olena@example.com" };

function open() {
  fireEvent.click(screen.getByRole("button", { name: ua.accountMenu.triggerLabel }));
}

describe("AccountMenu", () => {
  it("keeps the dropdown closed until the burger is clicked", () => {
    render(<AccountMenu user={USER} />);
    expect(screen.queryByRole("link", { name: ua.accountMenu.profile })).not.toBeInTheDocument();
    open();
    expect(screen.getByRole("link", { name: ua.accountMenu.profile })).toBeInTheDocument();
  });

  it("links to profile, tailoring, and subscription with the right hrefs", () => {
    render(<AccountMenu user={USER} />);
    open();
    expect(screen.getByRole("link", { name: ua.accountMenu.profile })).toHaveAttribute(
      "href",
      "/account/profile",
    );
    expect(screen.getByRole("link", { name: ua.accountMenu.tailoring })).toHaveAttribute(
      "href",
      "/tailor",
    );
    expect(screen.getByRole("link", { name: ua.accountMenu.subscription })).toHaveAttribute(
      "href",
      "/account/billing",
    );
  });

  it("shows Usage as a disabled coming-soon item (no link)", () => {
    render(<AccountMenu user={USER} />);
    open();
    // Not a link — Usage is not navigable yet.
    expect(screen.queryByRole("link", { name: new RegExp(ua.accountMenu.usage) })).toBeNull();
    const usage = screen.getByText(ua.accountMenu.usage);
    expect(usage.tagName).not.toBe("A");
    expect(usage.closest("[aria-disabled]")).not.toBeNull();
    expect(screen.getByText(ua.accountMenu.comingSoon)).toBeInTheDocument();
  });

  it("exposes the burger's expanded state and closes on Escape", () => {
    render(<AccountMenu user={USER} />);
    const trigger = screen.getByRole("button", { name: ua.accountMenu.triggerLabel });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    open();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: ua.accountMenu.profile })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("link", { name: ua.accountMenu.profile })).not.toBeInTheDocument();
  });
});
