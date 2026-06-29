// RED (Phase 4b) — written from the spec BEFORE the implementation exists.
// Two FR-SHELL-02a / FR-DS-05 contracts for the restyled shell:
//   1. The «Поливайко» brand wordmark is exposed in the uk copy module and
//      rendered in the shell header (FR-DS-05).
//   2. The shell carries NO theme machinery: it renders WITHOUT a ThemeProvider
//      and exposes NO theme-toggle control (FR-SHELL-02a).
//
// Both currently FAIL for the right reason: `uk.brand` does not exist yet, the
// Shell still renders the old app-title text + a <ThemeToggle/>, and `<Shell>`
// today cannot render outside a <ThemeProvider> (the toggle's useTheme throws). The
// green step adds `uk.brand`, swaps the wordmark in, and removes the toggle +
// provider dependency.
//
// NOTE (deliberate removals in green): the existing theme-machinery tests
// — `lib/theme/persistence.test.ts` and `lib/theme/no-flash-script.test.ts`,
// plus the theme-toggle assertions in `components/shell/Shell.test.tsx` — pin
// the superseded FR-SHELL-02 (light/dark persistence + no-flash). Their modules
// (`components/theme/*`, `lib/theme/persistence.ts`, `lib/theme/no-flash-script.ts`)
// are deleted in green, so those tests go away with them. This file preserves
// the honest regression value (no half-wired toggle creeps back — design R1).
//
// @trace FR-DS-05
// @trace FR-SHELL-02a
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Shell } from "@/components/shell/Shell";
import { uk } from "@/lib/i18n/uk";

afterEach(cleanup);

const BRAND = "Поливайко";

describe("shell brand wordmark (FR-DS-05)", () => {
  it("the uk copy module exposes the «Поливайко» brand string", () => {
    // String constant in the copy module, not an inline literal (NFR-LOC-01).
    expect((uk as { brand?: string }).brand).toBe(BRAND);
  });

  it("renders the «Поливайко» wordmark in the shell header", () => {
    render(
      <Shell>
        <p>placeholder content</p>
      </Shell>,
    );
    expect(screen.getByText(BRAND)).toBeInTheDocument();
  });
});

describe("no theme machinery in the shell (FR-SHELL-02a)", () => {
  it("renders WITHOUT a ThemeProvider wrapper (no provider required)", () => {
    // FR-SHELL-02a: the app requires no theme provider. Rendering the bare Shell
    // must not throw a useTheme()-outside-provider error.
    expect(() =>
      render(
        <Shell>
          <p>content</p>
        </Shell>,
      ),
    ).not.toThrow();
  });

  it("exposes NO theme-toggle control", () => {
    render(
      <Shell>
        <p>content</p>
      </Shell>,
    );
    // The old toggle's accessible name «Перемкнути тему» must not be present.
    expect(
      screen.queryByRole("button", { name: "Перемкнути тему" }),
    ).toBeNull();
    // Belt-and-braces: its label text must be gone from the rendered shell too.
    expect(screen.queryByText("Перемкнути тему")).toBeNull();
  });
});
