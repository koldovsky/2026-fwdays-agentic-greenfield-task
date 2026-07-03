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

export interface RateLimitResult {
  readonly allowed: boolean;
  /** Remaining hits allowed in the current window; never negative. */
  readonly remaining: number;
}

function hitsInWindow(store: RateLimitStore, key: string, windowStart: number): number[] {
  const existing = store.get(key) ?? [];
  return existing.filter((timestamp) => timestamp > windowStart);
}

/** Read-only check: does NOT record a hit. Callers decide whether to charge
 * the window via {@link recordHit} (e.g. only on a successful run). */
export function checkRateLimit(params: RateLimitParams): RateLimitResult {
  const windowStart = params.clock() - params.windowMs;
  const hits = hitsInWindow(params.store, params.key, windowStart);
  return { allowed: hits.length < params.max, remaining: Math.max(0, params.max - hits.length) };
}

/** Record one hit for `key` at the current clock time, pruning expired hits. */
export function recordHit(params: Omit<RateLimitParams, "max">): void {
  const now = params.clock();
  const windowStart = now - params.windowMs;
  const hits = hitsInWindow(params.store, params.key, windowStart);
  hits.push(now);
  params.store.set(params.key, hits);
}
