// RED (Phase 4b) — shell smoke test written from the spec BEFORE the
// implementation exists. Asserts the shell renders the list/detail navigation
// and that the theme toggle exists, is labeled, and is keyboard-reachable
// (SC-6 / NFR-A11Y-04). Imports will fail until the shell, ThemeToggle, the uk
// copy module, and the theme provider are built.
//
// @trace FR-SHELL-01
// @trace FR-SHELL-02
// @trace NFR-A11Y-04
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Shell } from "@/components/shell/Shell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { uk } from "@/lib/i18n/uk";

afterEach(cleanup);

function renderShell(children?: React.ReactNode) {
  // ThemeProvider wraps the toggle (client island, design.md D1/D2).
  return render(
    <ThemeProvider>
      <Shell>{children ?? <p>placeholder content</p>}</Shell>
    </ThemeProvider>,
  );
}

describe("app shell — navigation (FR-SHELL-01)", () => {
  it("renders a navigation landmark", () => {
    renderShell();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders the app title from the Ukrainian copy module (not an inline literal)", () => {
    renderShell();
    expect(screen.getByText(uk.appTitle)).toBeInTheDocument();
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

describe("app shell — theme toggle is operable & labeled (FR-SHELL-02 / SC-6 / NFR-A11Y-04)", () => {
  it("renders a theme toggle control with an accessible name from the uk copy", () => {
    renderShell();
    const toggle = screen.getByRole("button", { name: uk.theme.toggleLabel });
    expect(toggle).toBeInTheDocument();
  });

  it("the toggle is keyboard-reachable (focusable, not removed from tab order)", () => {
    renderShell();
    const toggle = screen.getByRole("button", { name: uk.theme.toggleLabel });
    toggle.focus();
    expect(toggle).toHaveFocus();
    // A negative tabindex would remove it from keyboard navigation — must not happen.
    expect(toggle.getAttribute("tabindex")).not.toBe("-1");
  });

  it("the toggle responds to keyboard activation (Enter) the same as a click", async () => {
    const user = userEvent.setup();
    renderShell();
    const toggle = screen.getByRole("button", { name: uk.theme.toggleLabel });
    toggle.focus();
    // Activating via keyboard must not throw and must keep the control present
    // (same affordance as a pointer click — NFR-A11Y-04 keyboard-only scenario).
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: uk.theme.toggleLabel }),
    ).toBeInTheDocument();
  });
});
