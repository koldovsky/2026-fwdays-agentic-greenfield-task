import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { pathname } = vi.hoisted(() => ({ pathname: { value: "/procurement" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import { Navigation, isNavigationActive } from "@/components/navigation";

describe("primary navigation state", () => {
  // @trace FR-13
  it("marks only the current destination as active and accessible", () => {
    pathname.value = "/procurement";
    const html = renderToStaticMarkup(<Navigation />);
    expect(html).toMatch(/<a class="[^"]+" aria-current="page" href="\/procurement">/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).not.toMatch(/aria-current="page" href="\/inventory"/);
  });

  // @trace FR-13
  it("keeps a section active for nested routes without matching sibling prefixes", () => {
    expect(isNavigationActive("/inventory/materials", "/inventory")).toBe(true);
    expect(isNavigationActive("/inventory-copy", "/inventory")).toBe(false);
    expect(isNavigationActive("/dashboard", "/dashboard")).toBe(true);
  });
});

// @trace FR-13
