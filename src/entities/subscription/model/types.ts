// subscription entity — a user's current plan (FR-BILLING-01). Pure model,
// framework-free (TC-PURE-01). Mirrors the landing pricing: Free / Pro (monthly,
// $12) / Ultra (monthly, $30) / Job-hunt Pass (one-time, $20, 14 days).

export type Plan = "free" | "pro" | "ultra" | "job_hunt_pass";

export type SubscriptionStatus = "active" | "canceled" | "expired";

export interface Subscription {
  readonly id: string;
  readonly userId: string;
  readonly plan: Plan;
  readonly status: SubscriptionStatus;
  /**
   * ISO-8601 end of the current paid period. For `pro` and `ultra` it's the
   * renewal date; for `job_hunt_pass` it's the 14-day expiry. Null for `free`.
   */
  readonly currentPeriodEnd: string | null;
}
