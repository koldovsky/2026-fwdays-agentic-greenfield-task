import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT, safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it("keeps a same-origin relative path", () => {
    expect(safeNextPath("/cycles")).toBe("/cycles");
    expect(safeNextPath("/employees/123?tab=open")).toBe("/employees/123?tab=open");
  });

  it("falls back for missing or empty input", () => {
    expect(safeNextPath(null)).toBe(DEFAULT_NEXT);
    expect(safeNextPath(undefined)).toBe(DEFAULT_NEXT);
    expect(safeNextPath("")).toBe(DEFAULT_NEXT);
  });

  it("rejects absolute and protocol-relative URLs (open-redirect guard)", () => {
    expect(safeNextPath("https://evil.example/phish")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("//evil.example")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("/\\evil.example")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("/javascript:alert(1)")).toBe(DEFAULT_NEXT);
  });

  it("rejects backslashes and control characters", () => {
    expect(safeNextPath("/a\\b")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("/a\nb")).toBe(DEFAULT_NEXT);
  });

  it("rejects a path not rooted at /", () => {
    expect(safeNextPath("cycles")).toBe(DEFAULT_NEXT);
  });
});
