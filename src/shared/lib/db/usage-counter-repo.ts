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

    /** Increment the lifetime count, creating the row on first use. */
    async increment(userId: string): Promise<void> {
      await db.query(
        `INSERT INTO usage_counters (user_id, tailorings_used)
         VALUES ($1, 1)
         ON CONFLICT (user_id)
         DO UPDATE SET tailorings_used = usage_counters.tailorings_used + 1`,
        [userId],
      );
    },
  };
}

export type UsageCounterRepo = ReturnType<typeof createUsageCounterRepo>;
