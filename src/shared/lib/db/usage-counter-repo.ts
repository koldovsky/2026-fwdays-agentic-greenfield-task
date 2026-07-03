// Usage-counter repository (NFR-COST-02). Persists the lifetime tailoring
// count that entities/usage-counter's pure canTailor() gates against. Depends
// only on the Queryable port — no entities layer, no concrete driver.
import type { Queryable } from "./port";

export interface UsageCounterRecord {
  readonly userId: string;
  readonly tailoringsUsed: number;
}

interface CounterRow {
  readonly tailorings_used: number;
}

/** Postgres foreign_key_violation (23503) — the pg driver attaches `code` to
 * the thrown error, not a typed class, so this is a runtime shape check. */
function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23503"
  );
}

/** Build a usage-counter repository over a {@link Queryable}. */
export function createUsageCounterRepo(db: Queryable) {
  return {
    /** Current lifetime count for a user, or null if they have never tailored. */
    async get(userId: string): Promise<UsageCounterRecord | null> {
      const { rows } = await db.query<CounterRow>(
        `SELECT tailorings_used FROM usage_counters WHERE user_id = $1`,
        [userId],
      );
      if (rows.length === 0) return null;
      return { userId, tailoringsUsed: rows[0].tailorings_used };
    },

    /** Increment the lifetime count, creating the row on first use.
     * Unconditional — only `reserve` enforces the limit. */
    async increment(userId: string): Promise<void> {
      await db.query(
        `INSERT INTO usage_counters (user_id, tailorings_used)
         VALUES ($1, 1)
         ON CONFLICT (user_id)
         DO UPDATE SET tailorings_used = usage_counters.tailorings_used + 1`,
        [userId],
      );
    },

    /**
     * Atomically increment iff the current count is still under `limit`,
     * returning whether the reservation was granted. The read (is this
     * under the limit?) and the write (record it) happen in one round trip
     * — a single `INSERT ... ON CONFLICT DO UPDATE ... WHERE` — so two
     * concurrent callers for the same user can't both read "under the
     * limit" and both be granted, the way a separate `get()` then
     * `increment()` pair allows once any `await` (e.g. an LLM call) sits
     * between them. `DO UPDATE ... WHERE` only fires — and only then does
     * `RETURNING` produce a row — when the condition still holds at write
     * time; Postgres's per-row lock on the conflicting row makes this
     * check-and-write atomic across concurrent transactions.
     *
     * Roll back a granted reservation with `release` if the attempt it
     * gated turns out not to count (FR-TAILOR-03: failed runs never
     * consume budget).
     *
     * A session can outlive the user row it names — a stateless JWT
     * (src/app/auth.ts) is never re-checked against the DB, so a stale
     * cookie from before an account deletion (or, in dev, before a pglite
     * restart wipes the in-memory DB — docs/dev-setup.md) still resolves a
     * user id that `users` no longer has a row for. The INSERT's foreign
     * key then rejects the write with a raw `23503` — degrade that to "not
     * granted" (the caller's existing `rate_limited` calm-failure path)
     * rather than let a DB constraint violation surface as an opaque
     * generic failure; this mirrors the same-file `subscription.get()`
     * lookup already degrading an unreadable account to the stricter free
     * gate one level up (src/app/api/tailor/route.ts).
     */
    async reserve(userId: string, limit: number): Promise<boolean> {
      try {
        const { rows } = await db.query<CounterRow>(
          `INSERT INTO usage_counters (user_id, tailorings_used)
           VALUES ($1, 1)
           ON CONFLICT (user_id)
           DO UPDATE SET tailorings_used = usage_counters.tailorings_used + 1
           WHERE usage_counters.tailorings_used < $2
           RETURNING tailorings_used`,
          [userId, limit],
        );
        return rows.length > 0;
      } catch (error) {
        if (isForeignKeyViolation(error)) return false;
        throw error;
      }
    },

    /** Undo a reservation made by `reserve`. Floors at 0 — a no-op if the
     * user has no row (nothing to release). */
    async release(userId: string): Promise<void> {
      await db.query(
        `UPDATE usage_counters
         SET tailorings_used = GREATEST(0, tailorings_used - 1)
         WHERE user_id = $1`,
        [userId],
      );
    },
  };
}

export type UsageCounterRepo = ReturnType<typeof createUsageCounterRepo>;
