// Shared session + paid-entitlement gate for the tailoring-history routes
// (FR-HISTORY-01/02, FR-TAILOR-04). Not a route file (Next only treats
// `route.ts` as an endpoint), so it is safe to co-locate here.
//
// History is a paid feature: an anonymous caller gets 401, a signed-in free
// caller gets 402 (the client maps this to the upgrade paywall). An unreadable
// session or subscription degrades to the stricter outcome (no history), never a
// raw 500 (NFR-OBS-01).
import { currentUserId } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";

export type PaidUserResult =
  | { readonly ok: true; readonly userId: string }
  | { readonly ok: false; readonly status: 401 | 402 };

export async function resolvePaidUser(): Promise<PaidUserResult> {
  let userId: string | null = null;
  try {
    userId = await currentUserId();
  } catch {
    userId = null;
  }
  if (userId === null) return { ok: false, status: 401 };

  try {
    const subscription = await createSubscriptionRepo(getDb()).get(userId);
    if (!hasPaidAccess(subscription, new Date().toISOString())) {
      return { ok: false, status: 402 };
    }
  } catch {
    // An unreadable subscription is treated as not-paid (no history), never a
    // failure — the strict-degradation rule the rest of the app follows.
    return { ok: false, status: 402 };
  }
  return { ok: true, userId };
}

/** Map a gate rejection to its calm coded JSON body. */
export function paidGateError(status: 401 | 402): { error: string } {
  return { error: status === 401 ? "unauthorized" : "payment_required" };
}
