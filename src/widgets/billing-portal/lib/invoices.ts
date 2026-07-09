// Synthetic invoice derivation for the billing portal (add-payments-emulator
// task 3.1, FR-BILLING-01). The emulator keeps no invoice ledger (design.md
// non-goal: "emulator shows a synthetic invoice list only"), so the history is
// derived deterministically from the one fact the subscription row carries:
// each successful checkout grants exactly one period ending at
// `currentPeriodEnd`. Pure, no IO — unit-testable.
import type { SubscriptionAccess } from "@/entities/subscription";

/** Purchasable (non-free) plans an invoice can be derived for. */
type PaidPlan = "pro" | "ultra" | "job_hunt_pass";

/**
 * Period granted per plan — mirrors the emulator's PERIOD_DAYS_BY_PLAN
 * (shared/lib/payments/emulator.ts). Pro/Ultra renew monthly (30 days); the
 * Job-hunt Pass is a 14-day sprint. Kept in lockstep with the emulator map.
 */
const PERIOD_DAYS_BY_PLAN: Readonly<Record<PaidPlan, number>> = {
  pro: 30,
  ultra: 30,
  job_hunt_pass: 14,
};
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole-dollar price per purchasable plan — matches the landing pricing table. */
const PLAN_AMOUNT_USD: Readonly<Record<PaidPlan, number>> = {
  pro: 12,
  ultra: 30,
  job_hunt_pass: 20,
};

export interface SyntheticInvoice {
  readonly id: string;
  /** ISO-8601 date the period was paid for (period start). */
  readonly issuedAt: string;
  readonly plan: PaidPlan;
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
      issuedAt: new Date(periodEnd - PERIOD_DAYS_BY_PLAN[sub.plan] * DAY_MS).toISOString(),
      plan: sub.plan,
      amountUsd: PLAN_AMOUNT_USD[sub.plan],
    },
  ];
}
