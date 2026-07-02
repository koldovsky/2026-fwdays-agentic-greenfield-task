// Pure helpers for the subscription entity. Deterministic, no IO.
import type { Plan, Subscription } from "../model/types";

/** Plans that unlock unlimited tailorings + export (everything above Free). */
const PAID_PLANS: ReadonlySet<Plan> = new Set<Plan>(["pro", "job_hunt_pass"]);

/**
 * Whether the subscription grants paid access at `nowIso`. Requires `active`
 * status, a paid plan, and — when a period end is set — that it hasn't lapsed.
 */
export function isSubscriptionActive(sub: Subscription, nowIso: string): boolean {
  if (sub.status !== "active" || !PAID_PLANS.has(sub.plan)) return false;
  if (sub.currentPeriodEnd === null) return true;
  return Date.parse(nowIso) < Date.parse(sub.currentPeriodEnd);
}

/** True for the Free tier (or any non-paid plan). */
export function isFree(sub: Subscription): boolean {
  return !PAID_PLANS.has(sub.plan);
}
