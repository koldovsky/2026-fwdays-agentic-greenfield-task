// In-memory adapter for the pure sliding-window core (see ./rate-limit.ts).
// Real Date.now() and a module-level Map live ONLY here, isolated from the
// unit-testable core. Single-instance / resets on restart — a stopgap until a
// Redis-backed store (add-docker-dev-env) replaces it behind the same
// RateLimitStore shape (design.md "Rate limiting is in-memory for now").
import { releaseHit, reserveHit, type ReserveResult, type RateLimitStore } from "./rate-limit";

const hits = new Map<string, readonly number[]>();

const memoryStore: RateLimitStore = {
  get: (key) => hits.get(key),
  set: (key, value) => hits.set(key, value),
};

/** Atomically check-and-record a hit for `key`. See {@link reserveHit}. */
export function reserveHitInMemory(key: string, windowMs: number, max: number): ReserveResult {
  return reserveHit({ store: memoryStore, clock: Date.now, key, windowMs, max });
}

/** Undo a reservation made by {@link reserveHitInMemory}. */
export function releaseHitInMemory(key: string, windowMs: number, token: number): void {
  releaseHit({ store: memoryStore, clock: Date.now, key, windowMs }, token);
}
