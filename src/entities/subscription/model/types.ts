// subscription entity — a user's current plan (FR-BILLING-01). Pure model,
// framework-free (TC-PURE-01). Mirrors the landing pricing: Free / Pro (monthly)
// / Job-hunt Pass (one-time, 30 days).

export type Plan = "free" | "pro" | "job_hunt_pass";

export type SubscriptionStatus = "active" | "canceled" | "expired";

export interface Subscription {
  readonly id: string;
  readonly userId: string;
  readonly plan: Plan;
  readonly status: SubscriptionStatus;
  /**
   * ISO-8601 end of the current paid period. For `pro` it's the renewal date;
   * for `job_hunt_pass` it's the 30-day expiry. Null for `free` (no period).
   */
  readonly currentPeriodEnd: string | null;
}
