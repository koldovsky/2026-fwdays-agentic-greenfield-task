// Synthetic invoice derivation for the billing portal (add-payments-emulator
// task 3.1, FR-BILLING-01). The emulator keeps no invoice ledger (design.md
// non-goal: "emulator shows a synthetic invoice list only"), so the history is
// derived deterministically from the one fact the subscription row carries:
// each successful checkout grants exactly one 30-day period ending at
// `currentPeriodEnd`. Pure, no IO — unit-testable.
import type { SubscriptionAccess } from "@/entities/subscription";

/** Mirrors the emulator's period grant (shared/lib/payments/emulator.ts). */
const PERIOD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole-dollar price per purchasable plan — matches the landing pricing table. */
const PLAN_AMOUNT_USD: Readonly<Record<"pro" | "job_hunt_pass", number>> = {
  pro: 12,
  job_hunt_pass: 19,
};

export interface SyntheticInvoice {
  readonly id: string;
  /** ISO-8601 date the period was paid for (period start). */
  readonly issuedAt: string;
  readonly plan: "pro" | "job_hunt_pass";
  readonly amountUsd: number;
}

/**
 * Invoice history for a subscription snapshot. A lapsed or canceled paid
 * subscription keeps its invoice visible — history does not disappear on
 * downgrade (FR-BILLING-01/02). Free (or a malformed row) has none.
 */
export function deriveInvoices(sub: SubscriptionAccess | null): readonly SyntheticInvoice[] {
  if (sub === null || sub.plan === "free" || sub.currentPeriodEnd === null) return [];
  const periodEnd = Date.parse(sub.currentPeriodEnd);
  if (Number.isNaN(periodEnd)) return [];
  return [
    {
      id: "inv-0001",
      issuedAt: new Date(periodEnd - PERIOD_DAYS * DAY_MS).toISOString(),
      plan: sub.plan,
      amountUsd: PLAN_AMOUNT_USD[sub.plan],
    },
  ];
}
