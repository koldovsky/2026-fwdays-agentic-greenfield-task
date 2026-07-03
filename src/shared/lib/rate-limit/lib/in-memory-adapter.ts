// In-memory adapter for the pure sliding-window core (see ./rate-limit.ts).
// Real Date.now() and a module-level Map live ONLY here, isolated from the
// unit-testable core. Single-instance / resets on restart — a stopgap until a
// Redis-backed store (add-docker-dev-env) replaces it behind the same
// RateLimitStore shape (design.md "Rate limiting is in-memory for now").
import { checkRateLimit, recordHit, type RateLimitResult, type RateLimitStore } from "./rate-limit";

const hits = new Map<string, readonly number[]>();

const memoryStore: RateLimitStore = {
  get: (key) => hits.get(key),
  set: (key, value) => hits.set(key, value),
};

/** Check (without recording) whether `key` is still within its window. */
export function checkRateLimitInMemory(key: string, windowMs: number, max: number): RateLimitResult {
  return checkRateLimit({ store: memoryStore, clock: Date.now, key, windowMs, max });
}

/** Record one hit for `key`. Call only when the attempt should count. */
export function recordRateLimitHitInMemory(key: string, windowMs: number): void {
  recordHit({ store: memoryStore, clock: Date.now, key, windowMs });
}
