import { describe, expect, it } from "vitest";
import { clientIpFrom } from "./client-ip";

describe("clientIpFrom (NFR-SEC-04)", () => {
  it("takes the first hop of a multi-hop x-forwarded-for list", () => {
    expect(clientIpFrom("203.0.113.7, 10.0.0.1, 10.0.0.2", null)).toBe("203.0.113.7");
  });

  it("trims whitespace around the forwarded address", () => {
    expect(clientIpFrom("  203.0.113.7  ", null)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is missing or empty", () => {
    expect(clientIpFrom(null, "198.51.100.9")).toBe("198.51.100.9");
    expect(clientIpFrom("", "198.51.100.9")).toBe("198.51.100.9");
  });

  it("returns the shared unknown bucket when no header is present", () => {
    expect(clientIpFrom(null, null)).toBe("unknown");
    expect(clientIpFrom("", "  ")).toBe("unknown");
  });
});
