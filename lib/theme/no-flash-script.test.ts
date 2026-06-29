// Pins FR-SHELL-02's "applied before first paint" guarantee (design.md R1).
// The pre-hydration no-flash script string is the SAME one app/layout.tsx
// injects into the <head>. We execute it against a fresh jsdom document and
// assert it seeds the `dark` class on <html> from localStorage BEFORE any
// React/paint — so removing or breaking the script fails CI (no silent flash
// regression).
//
// @trace FR-SHELL-02
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { noFlashThemeScript } from "@/lib/theme/no-flash-script";
import { THEME_STORAGE_KEY } from "@/lib/theme/persistence";

// Run the inline script string the way the browser would before hydration.
function runNoFlashScript() {
  (0, eval)(noFlashThemeScript);
}

describe("no-flash theme script (FR-SHELL-02)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("applies the `dark` class to the document root when the stored theme is dark", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    runNoFlashScript();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("leaves the document root light when no theme is stored (default)", () => {
    runNoFlashScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("leaves the document root light for an invalid/corrupt stored value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "not-a-theme");
    runNoFlashScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("removes a stale `dark` class when the stored theme is light", () => {
    document.documentElement.classList.add("dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");

    runNoFlashScript();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
