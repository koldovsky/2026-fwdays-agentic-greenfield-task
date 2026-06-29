// Shell navigation smoke test. The light/dark theme-toggle assertions that used
// to live here pinned the superseded FR-SHELL-02 (ThemeProvider + ThemeToggle).
// Slice 6 collapses the app to a single paper theme (FR-SHELL-02a): those
// modules are deleted, so the toggle/provider assertions are removed with them.
// The brand wordmark + no-theme-machinery contract is covered by
// `Shell.brand.test.tsx`; this file keeps the navigation/landmark assertions.
//
// @trace FR-SHELL-01
// @trace NFR-A11Y-04
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Shell } from "@/components/shell/Shell";
import { uk } from "@/lib/i18n/uk";

afterEach(cleanup);

function renderShell(children?: React.ReactNode) {
  // Single paper theme: the Shell renders with no provider wrapper (FR-SHELL-02a).
  return render(<Shell>{children ?? <p>placeholder content</p>}</Shell>);
}

describe("app shell — navigation (FR-SHELL-01)", () => {
  it("renders a navigation landmark", () => {
    renderShell();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders the brand wordmark from the Ukrainian copy module (not an inline literal)", () => {
    renderShell();
    expect(screen.getByText(uk.brand)).toBeInTheDocument();
  });

  it("exposes a link back to the plant list at /", () => {
    renderShell();
    const nav = screen.getByRole("navigation");
    const listLink = within(nav).getByRole("link", { name: uk.nav.plants });
    expect(listLink).toHaveAttribute("href", "/");
  });

  it("renders the shell's children (the active list/detail view content)", () => {
    renderShell(<p>detail view body</p>);
    expect(screen.getByText("detail view body")).toBeInTheDocument();
  });
});
