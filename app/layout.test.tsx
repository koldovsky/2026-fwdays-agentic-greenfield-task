// Pins the WIRING half of FR-SHELL-02 / design.md R1: it is not enough that the
// no-flash script string is correct (covered by no-flash-script.test.ts) — the
// root layout must actually inject it into <head> before paint. This test walks
// the RootLayout element tree and asserts a <script dangerouslySetInnerHTML> in
// <head> carries `noFlashThemeScript`, so deleting that injection fails CI (no
// silent flash regression).
//
// @trace FR-SHELL-02
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { noFlashThemeScript } from "@/lib/theme/no-flash-script";

// next/font/google would do network/font work at module load; stub it to a
// plain variable shape so we can render the layout element tree in jsdom.
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
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

describe("RootLayout no-flash script injection (FR-SHELL-02)", () => {
  it("injects the no-flash theme script into <head> before paint", () => {
    const tree = RootLayout({ children: null }) as ReactElement;

    const script = findNode(
      tree,
      (n) =>
        n.type === "script" &&
        typeof n.props?.dangerouslySetInnerHTML === "object" &&
        n.props?.dangerouslySetInnerHTML !== null,
    );

    expect(script, "RootLayout must render an inline <script> in <head>").toBeDefined();
    const html = (
      script?.props?.dangerouslySetInnerHTML as { __html?: string } | undefined
    )?.__html;
    expect(html).toBe(noFlashThemeScript);
  });

  it("sets the document language to Ukrainian (NFR-LOC-01)", () => {
    const tree = RootLayout({ children: null }) as ReactElement;
    const htmlEl = findNode(tree, (n) => n.type === "html");
    expect(htmlEl?.props?.lang).toBe("uk");
  });
});
