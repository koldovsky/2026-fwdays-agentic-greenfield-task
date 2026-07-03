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

/**
 * The fields entitlement checks actually need — structural, so db records and
 * UI snapshots qualify without carrying the full entity.
 */
export type SubscriptionAccess = Pick<Subscription, "plan" | "status" | "currentPeriodEnd">;

/**
 * Whether the user has PAID access at `nowIso` — the paywall/export gate
 * (FR-PAYWALL-01). Unlike {@link isSubscriptionActive}, a `canceled`
 * subscription still grants access until its period end: cancellation
 * downgrades to Free at the END of the current period, not immediately
 * (FR-BILLING-02). A canceled subscription without a period end grants
 * nothing — there is no defined period left to run out.
 */
export function hasPaidAccess(sub: SubscriptionAccess | null, nowIso: string): boolean {
  if (sub === null || !PAID_PLANS.has(sub.plan)) return false;
  if (sub.status === "active") {
    return sub.currentPeriodEnd === null || Date.parse(nowIso) < Date.parse(sub.currentPeriodEnd);
  }
  if (sub.status === "canceled") {
    return sub.currentPeriodEnd !== null && Date.parse(nowIso) < Date.parse(sub.currentPeriodEnd);
  }
  return false; // expired
}
