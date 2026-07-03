// Pure sliding-window rate limiter (NFR-SEC-04, NFR-COST-02). Framework-free,
// deterministic (TC-PURE-01): clock and store are injected, so callers can
// unit-test with a fake clock and no real timers. The only impure adapter
// (real Date.now + a module-level Map) lives in ./in-memory-adapter.ts.

/** Minimal Map-like store: one sliding-window key -> its hit timestamps. */
export interface RateLimitStore {
  get(key: string): readonly number[] | undefined;
  set(key: string, hits: readonly number[]): void;
}

export interface RateLimitParams {
  readonly store: RateLimitStore;
  /** Milliseconds since epoch. Inject a fake clock in tests. */
  readonly clock: () => number;
  readonly key: string;
  readonly windowMs: number;
  readonly max: number;
}

export interface ReserveResult {
  readonly allowed: boolean;
  /** Remaining hits allowed in the current window; never negative. */
  readonly remaining: number;
  /** Present only when `allowed` — pass to {@link releaseHit} to undo this
   * reservation (e.g. the reserved attempt failed and must not be charged). */
  readonly token?: number;
}

function hitsInWindow(store: RateLimitStore, key: string, windowStart: number): number[] {
  const existing = store.get(key) ?? [];
  return existing.filter((timestamp) => timestamp > windowStart);
}

/**
 * Atomically check-and-record a hit. The check and the write happen in one
 * synchronous call — there is no window in which two concurrent callers can
 * both observe "under the limit" before either records, which a separate
 * check-then-record pair allows once any `await` sits between them (the
 * caller's own async work, e.g. an LLM call or a DB round trip). A rejected
 * attempt records nothing.
 *
 * Roll back an allowed reservation with {@link releaseHit} if the attempt it
 * gated turns out not to count (FR-TAILOR-03: failed runs never consume
 * budget).
 */
export function reserveHit(params: RateLimitParams): ReserveResult {
  const now = params.clock();
  const windowStart = now - params.windowMs;
  const hits = hitsInWindow(params.store, params.key, windowStart);
  if (hits.length >= params.max) {
    params.store.set(params.key, hits);
    return { allowed: false, remaining: 0 };
  }
  hits.push(now);
  params.store.set(params.key, hits);
  return { allowed: true, remaining: params.max - hits.length, token: now };
}

/** Undo a reservation made by {@link reserveHit}. Removes exactly the one hit
 * matching `token`; a no-op if it already aged out of the window. */
export function releaseHit(params: Omit<RateLimitParams, "max">, token: number): void {
  const existing = params.store.get(params.key) ?? [];
  const index = existing.indexOf(token);
  if (index === -1) return;
  params.store.set(params.key, [...existing.slice(0, index), ...existing.slice(index + 1)]);
}
