// RED (Phase 4b) — written from the spec BEFORE the implementation exists.
// Reads `app/globals.css` from disk and asserts the «Поливайко» palette is the
// SINGLE theme source: the named color/status/radii/font tokens are declared
// with their exact values, and there is NO light/dark alternate palette block
// (single paper theme). These assertions fail on the current globals.css, which
// still carries the old `--background/--foreground` light/dark split and a
// `.dark {…}` block (slated for replacement in the green step).
//
// @trace FR-DS-01
// @trace FR-SHELL-02a
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// Resolve from the vitest root (process.cwd() is the repo root under the
// `vitest run` config). `import.meta.url` is not a usable file URL when vite
// transforms the test, so anchor on cwd instead.
const globalsCssPath = resolve(process.cwd(), "app/globals.css");

function readGlobalsCss(): string {
  return readFileSync(globalsCssPath, "utf8");
}

// Case-insensitive whole-value hex match: the hex appears as a token value
// (preceded by ':' / whitespace, followed by ';' / whitespace / end) so a
// substring like `#2F6B3F0` cannot satisfy a `#2F6B3F` assertion.
function declaresHex(css: string, hex: string): boolean {
  const escaped = hex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`[:\\s]${escaped}(?![0-9a-fA-F])`, "i").test(css);
}

describe("«Поливайко» design tokens in app/globals.css (FR-DS-01)", () => {
  const css = readGlobalsCss();

  // Scenario: Palette tokens present in the theme — the named greens, earth,
  // and neutral tokens with exactly their hex values (FR-DS-01).
  const palette: Array<[string, string]> = [
    ["forest", "#2F6B3F"],
    ["pine", "#213D2A"],
    ["sage", "#7E9B6E"],
    ["moss", "#A7BE92"],
    ["mist", "#DDE7CF"],
    ["bark", "#5A4232"],
    // clay darkened #A9744E → #94623C: as terracotta TEXT ("soon" due line,
    // secondary CTA label) #A9744E only reached ~3.8:1 on cloud — under WCAG AA
    // 4.5:1 (NFR-A11Y-02). #94623C reaches 4.94:1 (cloud) / 4.57:1 (paper) and
    // stays a recognizable terracotta. The decorative `status-soon-dot` keeps
    // #A9744E (a dot is non-text). Contrast fix, not a weakened assertion.
    ["clay", "#94623C"],
    ["sand", "#E6D7BE"],
    ["paper", "#F4F1E8"],
    ["cloud", "#FBFAF5"],
    ["ink", "#1B1E18"],
    // stone darkened #6E7268 → #62655C: muted/secondary text only reached
    // 4.35:1 on paper — under WCAG AA 4.5:1 (NFR-A11Y-02). #62655C reaches
    // 5.26:1 (paper) / 5.68:1 (cloud), still a warm muted grey. Contrast fix.
    ["stone", "#62655C"],
    ["border", "#E2DDCF"],
  ];

  it.each(palette)("declares the %s token as %s", (_name, hex) => {
    expect(declaresHex(css, hex)).toBe(true);
  });

  // Scenario: Status colors present in the theme (FR-DS-01).
  const statusHexes: Array<[string, string]> = [
    ["healthy chip", "#DDE7CF"],
    ["soon dot/clay", "#A9744E"],
    ["soon chip", "#F6E7D6"],
    ["overdue dot / danger", "#B5462E"],
    ["overdue chip", "#F3DAD0"],
  ];

  it.each(statusHexes)("declares the %s status hex %s", (_name, hex) => {
    expect(declaresHex(css, hex)).toBe(true);
  });

  it("declares the danger hover hex #9D3B25", () => {
    // The primary danger token and its hover are both required tokens (D4).
    expect(declaresHex(css, "#9D3B25")).toBe(true);
  });

  // Scenario: Typography families declared — Quicksand (display), Mulish
  // (body), Spline Sans Mono (mono) (FR-DS-01).
  it.each(["Quicksand", "Mulish", "Spline Sans Mono"])(
    "declares the %s font family",
    (family) => {
      expect(css).toContain(family);
    },
  );

  // Scenario: Radii tokens declared — input 13, soft 14, card 18–22, pill 999
  // (FR-DS-01).
  it("declares the radii tokens (13px input, 14px soft, 22px card, 999px pill)", () => {
    expect(/13px/.test(css)).toBe(true);
    expect(/14px/.test(css)).toBe(true);
    expect(/22px/.test(css)).toBe(true);
    expect(/999px/.test(css)).toBe(true);
  });
});

describe("single paper theme — no alternate palette (FR-SHELL-02a)", () => {
  const css = readGlobalsCss();

  // Scenario: No theme machinery / single theme source — the design collapses
  // to one paper theme, so there must be NO dark-mode media query and NO `.dark`
  // alternate palette block. The current globals.css FAILS this (it has a
  // `@custom-variant dark` + `.dark {…}` block) until the green step removes it.
  it("has no prefers-color-scheme: dark media query", () => {
    expect(/@media\s*\([^)]*prefers-color-scheme\s*:\s*dark/i.test(css)).toBe(
      false,
    );
  });

  it("has no `.dark` alternate-palette selector block", () => {
    // Match a `.dark` class selector opening a rule block (the alternate
    // palette), not an incidental mention in a comment.
    expect(/\.dark\s*[,{]/.test(css)).toBe(false);
  });

  it("does not declare a Tailwind dark custom-variant", () => {
    expect(/@custom-variant\s+dark/i.test(css)).toBe(false);
  });

  // The single theme uses `paper` as the app background — the old white
  // `--background: #ffffff` must be gone (replaced by the paper token).
  it("no longer uses the old white --background: #ffffff", () => {
    expect(/--background\s*:\s*#ffffff/i.test(css)).toBe(false);
  });
});
