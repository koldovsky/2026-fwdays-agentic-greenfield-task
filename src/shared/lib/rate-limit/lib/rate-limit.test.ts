import { describe, expect, it } from "vitest";
import { checkRateLimit, recordHit, type RateLimitStore } from "./rate-limit";

function fakeStore(): RateLimitStore {
  const map = new Map<string, readonly number[]>();
  return {
    get: (key) => map.get(key),
    set: (key, hits) => map.set(key, hits),
  };
}

describe("checkRateLimit / recordHit (TC-PURE-01, NFR-SEC-04)", () => {
  it("allows requests until max is reached within the window", () => {
    const store = fakeStore();
    let now = 0;
    const clock = () => now;
    const base = { store, clock, key: "ip:1", windowMs: 1000 };

    expect(checkRateLimit({ ...base, max: 2 })).toEqual({ allowed: true, remaining: 2 });
    recordHit(base);
    now += 100;
    expect(checkRateLimit({ ...base, max: 2 })).toEqual({ allowed: true, remaining: 1 });
    recordHit(base);
    now += 100;
    expect(checkRateLimit({ ...base, max: 2 })).toEqual({ allowed: false, remaining: 0 });
  });

  it("rejects further hits once max is exceeded within the window", () => {
    const store = fakeStore();
    const clock = () => 0;
    const base = { store, clock, key: "ip:anon", windowMs: 24 * 60 * 60 * 1000 };

    recordHit(base);
    expect(checkRateLimit({ ...base, max: 1 }).allowed).toBe(false);
  });

  it("resets once the window has fully elapsed", () => {
    const store = fakeStore();
    let now = 0;
    const clock = () => now;
    const base = { store, clock, key: "ip:2", windowMs: 1000 };

    recordHit(base);
    expect(checkRateLimit({ ...base, max: 1 }).allowed).toBe(false);

    now += 1001; // past the window
    expect(checkRateLimit({ ...base, max: 1 })).toEqual({ allowed: true, remaining: 1 });
  });

  it("tracks separate keys independently", () => {
    const store = fakeStore();
    const clock = () => 0;

    recordHit({ store, clock, key: "a", windowMs: 1000 });
    expect(checkRateLimit({ store, clock, key: "a", windowMs: 1000, max: 1 }).allowed).toBe(false);
    expect(checkRateLimit({ store, clock, key: "b", windowMs: 1000, max: 1 }).allowed).toBe(true);
  });
});
