import { describe, expect, it } from "vitest";
import { releaseHit, reserveHit, type RateLimitStore, type ReserveResult } from "./rate-limit";

function fakeStore(): RateLimitStore {
  const map = new Map<string, readonly number[]>();
  return {
    get: (key) => map.get(key),
    set: (key, hits) => map.set(key, hits),
  };
}

/** Test-only helper: a reservation the test already asserted `allowed` on
 * always carries a token; this narrows the type without a bare assertion. */
function tokenOf(result: ReserveResult): number {
  if (result.token === undefined) throw new Error("expected an allowed reservation with a token");
  return result.token;
}

describe("reserveHit / releaseHit (TC-PURE-01, NFR-SEC-04)", () => {
  it("allows and records reservations until max is reached within the window", () => {
    const store = fakeStore();
    let now = 0;
    const clock = () => now;
    const base = { store, clock, key: "ip:1", windowMs: 1000, max: 2 };

    expect(reserveHit(base)).toMatchObject({ allowed: true, remaining: 1 });
    now += 100;
    expect(reserveHit(base)).toMatchObject({ allowed: true, remaining: 0 });
    now += 100;
    expect(reserveHit(base)).toEqual({ allowed: false, remaining: 0 });
  });

  it("rejects further reservations once max is exceeded within the window", () => {
    const store = fakeStore();
    const clock = () => 0;
    const base = { store, clock, key: "ip:anon", windowMs: 24 * 60 * 60 * 1000, max: 1 };

    expect(reserveHit(base).allowed).toBe(true);
    expect(reserveHit(base).allowed).toBe(false);
  });

  it("resets once the window has fully elapsed", () => {
    const store = fakeStore();
    let now = 0;
    const clock = () => now;
    const base = { store, clock, key: "ip:2", windowMs: 1000, max: 1 };

    expect(reserveHit(base).allowed).toBe(true);
    expect(reserveHit(base).allowed).toBe(false);

    now += 1001; // past the window
    expect(reserveHit(base)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("tracks separate keys independently", () => {
    const store = fakeStore();
    const clock = () => 0;

    expect(reserveHit({ store, clock, key: "a", windowMs: 1000, max: 1 }).allowed).toBe(true);
    expect(reserveHit({ store, clock, key: "a", windowMs: 1000, max: 1 }).allowed).toBe(false);
    expect(reserveHit({ store, clock, key: "b", windowMs: 1000, max: 1 }).allowed).toBe(true);
  });

  it("two concurrent reservations against max=1 never both succeed (the race the old check-then-record pattern allowed)", () => {
    const store = fakeStore();
    const clock = () => 0;
    const base = { store, clock, key: "ip:race", windowMs: 1000, max: 1 };

    // Two "concurrent" callers each call reserveHit with no await between
    // them — this is the synchronous-atomicity guarantee under test.
    const first = reserveHit(base);
    const second = reserveHit(base);

    expect([first.allowed, second.allowed].filter(Boolean)).toHaveLength(1);
  });

  it("releaseHit undoes a reservation so a later caller can take its place", () => {
    const store = fakeStore();
    const clock = () => 0;
    const base = { store, clock, key: "ip:3", windowMs: 1000, max: 1 };

    const reserved = reserveHit(base);
    expect(reserved.allowed).toBe(true);
    expect(reserveHit(base).allowed).toBe(false);

    releaseHit(base, tokenOf(reserved));

    expect(reserveHit(base).allowed).toBe(true);
  });

  it("releaseHit only removes the matching token, leaving other hits in the window intact", () => {
    const store = fakeStore();
    let now = 0;
    const clock = () => now;
    const base = { store, clock, key: "ip:4", windowMs: 1000, max: 2 };

    const first = reserveHit(base);
    now += 10;
    reserveHit(base);
    expect(reserveHit(base).allowed).toBe(false);

    releaseHit(base, tokenOf(first));

    expect(reserveHit(base).allowed).toBe(true);
    expect(reserveHit(base).allowed).toBe(false);
  });

  it("releaseHit is a no-op for a token that already aged out of the window", () => {
    const store = fakeStore();
    let now = 0;
    const clock = () => now;
    const base = { store, clock, key: "ip:5", windowMs: 1000, max: 1 };

    const reserved = reserveHit(base);
    now += 1001;
    // Should not throw and should not disturb the now-independent window.
    releaseHit(base, tokenOf(reserved));
    expect(reserveHit(base).allowed).toBe(true);
  });
});
