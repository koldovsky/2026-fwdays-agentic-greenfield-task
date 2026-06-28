// @trace FR-SHELL-01
import { describe, expect, it } from "vitest";
import { CABINET_NAV, isActiveNavItem } from "@/lib/nav/cabinet-nav";

describe("isActiveNavItem", () => {
  it("is active for an exact path match", () => {
    expect(isActiveNavItem("/cycles", "/cycles")).toBe(true);
  });

  it("is active for a nested route under the href", () => {
    expect(isActiveNavItem("/cycles/abc123", "/cycles")).toBe(true);
  });

  it("is not active for an unrelated path", () => {
    expect(isActiveNavItem("/employees", "/cycles")).toBe(false);
  });

  it("is not active for a prefix that is not a path-segment boundary", () => {
    expect(isActiveNavItem("/cyclesomething", "/cycles")).toBe(false);
  });

  it("root pathname never matches a non-root href", () => {
    expect(isActiveNavItem("/", "/cycles")).toBe(false);
  });
});

describe("CABINET_NAV", () => {
  it("lists Cycles, Employees, Usage in order with stable keys", () => {
    expect(CABINET_NAV[0]?.key).toBe("cycles");
    expect(CABINET_NAV[1]?.key).toBe("employees");
    expect(CABINET_NAV[2]?.key).toBe("usage");
  });

  it("carries a stable href for each entry", () => {
    expect(CABINET_NAV[0]?.href).toBe("/cycles");
    expect(CABINET_NAV[1]?.href).toBe("/employees");
    expect(CABINET_NAV[2]?.href).toBe("/usage");
  });
});
