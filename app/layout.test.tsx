// This file used to pin the WIRING half of FR-SHELL-02 (design.md R1): that the
// root layout injects the pre-hydration no-flash <script> into <head>. Slice 6
// collapses the app to a single paper theme (FR-SHELL-02a, superseding
// FR-SHELL-02): there is no wrong theme to flash, so the no-flash script — and
// its module `lib/theme/no-flash-script.ts` — are deliberately deleted. The
// no-flash-injection assertion is therefore meaningless and is removed with the
// module (same deliberate-removal category as tasks.md 1.8).
//
// The honest regression value is preserved by INVERTING it: assert the layout no
// longer injects any inline <script> (no half-wired theme machinery creeps back
// in), while keeping the `lang="uk"` assertion (NFR-LOC-01).
//
// @trace FR-SHELL-02a
// @trace NFR-LOC-01
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// next/font/google would do network/font work at module load; stub it to a
// plain variable shape so we can render the layout element tree in jsdom.
vi.mock("next/font/google", () => ({
  Quicksand: () => ({ variable: "--font-display-handle" }),
  Mulish: () => ({ variable: "--font-body-handle" }),
  Spline_Sans_Mono: () => ({ variable: "--font-mono-handle" }),
}));

import RootLayout from "@/app/layout";

type AnyNode = { type?: unknown; props?: Record<string, unknown> } | unknown;

// Depth-first search over the React element tree for the first node matching
// the predicate (we never mount it, just inspect the returned elements).
function findNode(
  node: AnyNode,
  match: (n: { type?: unknown; props?: Record<string, unknown> }) => boolean,
): { type?: unknown; props?: Record<string, unknown> } | undefined {
  if (!node || typeof node !== "object") return undefined;
  const el = node as { type?: unknown; props?: Record<string, unknown> };
  if (match(el)) return el;
  const children = el.props?.children;
  const list = Array.isArray(children) ? children : children !== undefined ? [children] : [];
  for (const child of list) {
    const found = findNode(child, match);
    if (found) return found;
  }
  return undefined;
}

describe("RootLayout — single paper theme, no theme machinery (FR-SHELL-02a)", () => {
  it("injects NO inline no-flash <script> (single theme has nothing to flash)", () => {
    const tree = RootLayout({ children: null }) as ReactElement;

    const script = findNode(
      tree,
      (n) =>
        n.type === "script" &&
        typeof n.props?.dangerouslySetInnerHTML === "object" &&
        n.props?.dangerouslySetInnerHTML !== null,
    );

    expect(script).toBeUndefined();
  });

  it("sets the document language to Ukrainian (NFR-LOC-01)", () => {
    const tree = RootLayout({ children: null }) as ReactElement;
    const htmlEl = findNode(tree, (n) => n.type === "html");
    expect(htmlEl?.props?.lang).toBe("uk");
  });
});
