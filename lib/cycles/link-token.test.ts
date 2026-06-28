// @trace FR-CYCLE-02
import { describe, expect, it } from "vitest";
import { generateCycleToken } from "@/lib/cycles/link-token";

/**
 * Red-first unit tests for the cycle link-token generator (FR-CYCLE-02).
 * The module does not exist yet, so this suite MUST fail red (import resolves
 * to nothing). Asserts BEHAVIOUR: a base64url charset string of the expected
 * length (32 random bytes ⇒ ~43 chars), a large sample is all-distinct (no
 * collisions), and tokens carry no separator / sequential-counter pattern — so
 * a token is high-entropy, non-enumerable, and free of PII.
 */

const BASE64URL = /^[A-Za-z0-9_-]+$/;

describe("generateCycleToken — shape", () => {
  it("returns a non-empty base64url string (charset [A-Za-z0-9_-])", () => {
    const token = generateCycleToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(BASE64URL.test(token)).toBe(true);
  });

  it("has the length expected of 32 base64url-encoded bytes (~43 chars)", () => {
    const token = generateCycleToken();
    // 32 bytes -> ceil(32 * 4 / 3) = 43 base64 chars, padding stripped.
    expect(token.length).toBe(43);
  });

  it("contains no base64 / url separator characters (no . / + =)", () => {
    const token = generateCycleToken();
    expect(token.includes(".")).toBe(false);
    expect(token.includes("/")).toBe(false);
    expect(token.includes("+")).toBe(false);
    expect(token.includes("=")).toBe(false);
  });
});

describe("generateCycleToken — entropy / non-enumerability", () => {
  it("produces all-distinct tokens across a large sample (no collisions)", () => {
    const count = 1000;
    const tokens = new Set<string>();
    for (let i = 0; i < count; i += 1) {
      tokens.add(generateCycleToken());
    }
    expect(tokens.size).toBe(count);
  });

  it("does not embed an obvious sequential counter (consecutive tokens are unrelated)", () => {
    const a = generateCycleToken();
    const b = generateCycleToken();
    const c = generateCycleToken();
    // No two consecutive tokens are equal, and none is a trivial increment
    // (e.g. a shared prefix with only the tail nudged). A sequential generator
    // would share a long common prefix; high-entropy tokens diverge early.
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);

    const sharedPrefix = (x: string, y: string): number => {
      let n = 0;
      while (n < x.length && n < y.length && x[n] === y[n]) n += 1;
      return n;
    };
    // Random 32-byte tokens should not share most of their length as a prefix.
    expect(sharedPrefix(a, b)).toBeLessThan(a.length / 2);
    expect(sharedPrefix(b, c)).toBeLessThan(b.length / 2);
  });
});
