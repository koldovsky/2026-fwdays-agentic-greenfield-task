// Subscriptions repository (FR-BILLING-01, TC-STACK-06). Persists the plan
// state that the payments webhook handler — the SOLE subscription writer
// (add-payments-emulator design) — syncs from provider events. Depends only on
// the Queryable port — no entities layer, no concrete driver. Table shape is
// migrations/0001_init.sql `subscriptions` (one row per user, UNIQUE user_id).
import type { Queryable } from "./port";

export type SubscriptionPlan = "free" | "pro" | "ultra" | "job_hunt_pass";
export type SubscriptionStatus = "active" | "canceled" | "expired";

export interface SubscriptionRecord {
  readonly id: string;
  readonly userId: string;
  readonly plan: SubscriptionPlan;
  readonly status: SubscriptionStatus;
  /** ISO-8601 end of the paid period; null for plans without one. */
  readonly currentPeriodEnd: string | null;
}

export interface UpsertSubscriptionInput {
  readonly userId: string;
  readonly plan: SubscriptionPlan;
  readonly status: SubscriptionStatus;
  readonly currentPeriodEnd: string | null;
}

interface SubscriptionRow {
  readonly id: string;
  readonly user_id: string;
  readonly plan: SubscriptionPlan;
  readonly status: SubscriptionStatus;
  /** node-postgres returns timestamptz as Date; pglite may return a string. */
  readonly current_period_end: Date | string | null;
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toRecord(row: SubscriptionRow): SubscriptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: toIso(row.current_period_end),
  };
}

/** Build a subscriptions repository over a {@link Queryable}. */
export function createSubscriptionRepo(db: Queryable) {
  return {
    /** Current subscription for a user, or null if they have never paid (Free). */
    async get(userId: string): Promise<SubscriptionRecord | null> {
      const { rows } = await db.query<SubscriptionRow>(
        `SELECT id, user_id, plan, status, current_period_end
         FROM subscriptions WHERE user_id = $1`,
        [userId],
      );
      if (rows.length === 0) return null;
      return toRecord(rows[0]);
    },

    /** Create or replace the user's single subscription row (UNIQUE user_id). */
    async upsert(input: UpsertSubscriptionInput): Promise<void> {
      await db.query(
        `INSERT INTO subscriptions (user_id, plan, status, current_period_end)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id)
         DO UPDATE SET plan = EXCLUDED.plan,
                       status = EXCLUDED.status,
                       current_period_end = EXCLUDED.current_period_end`,
        [input.userId, input.plan, input.status, input.currentPeriodEnd],
      );
    },
  };
}

export type SubscriptionRepo = ReturnType<typeof createSubscriptionRepo>;
