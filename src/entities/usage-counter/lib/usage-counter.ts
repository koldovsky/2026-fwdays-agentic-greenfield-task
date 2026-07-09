// Pure gating helpers for the usage-counter entity. Deterministic, no IO.
// Limits mirror the product: anonymous visitors get 1 free tailoring
// (FR-ONBOARD-01), free accounts 2 lifetime, paid is unlimited.
import type { AccountKind, UsageCounter } from "../model/types";

export const ANON_TAILORING_LIMIT = 1;
export const FREE_TAILORING_LIMIT = 2;

/** Lifetime tailoring limit for an account kind; `null` means unlimited (paid). */
export function tailoringLimit(kind: AccountKind): number | null {
  switch (kind) {
    case "anonymous":
      return ANON_TAILORING_LIMIT;
    case "free":
      return FREE_TAILORING_LIMIT;
    case "paid":
      return null;
  }
}

/** Remaining free tailorings; `null` means unlimited. Never negative. */
export function remainingTailorings(
  counter: UsageCounter,
  kind: AccountKind,
): number | null {
  const limit = tailoringLimit(kind);
  if (limit === null) return null;
  return Math.max(0, limit - counter.tailoringsUsed);
}

/** Whether the account may start another tailoring right now (FR-PAYWALL-01). */
export function canTailor(counter: UsageCounter, kind: AccountKind): boolean {
  const remaining = remainingTailorings(counter, kind);
  return remaining === null || remaining > 0;
}
