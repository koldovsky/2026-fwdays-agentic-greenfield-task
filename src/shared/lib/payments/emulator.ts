// Emulator adapter (add-payments-emulator task 1.2). Fakes the merchant of
// record for dev/demo: createCheckout points at the local /checkout screen,
// and completion arrives as a signed webhook event — the SAME path a real MoR
// uses — so subscription sync is identical in both modes. Never enabled in
// production (guarded in shared/config + the factory; asserted by task 4.2).
//
// Single-writer invariant: only handleWebhook touches the subscriptions store.
// Even this adapter's own cancel() goes through handleWebhook with a
// self-generated event, mirroring how a real MoR confirms cancellation via a
// callback rather than a synchronous write.
import { randomUUID } from "node:crypto";
import { createCheckoutToken } from "./checkout-token";
import type { PaymentsProvider, SubscriptionsStore } from "./port";
import { isPaymentsPlan, type PaymentsEvent } from "./types";

/**
 * Paid period granted by one successful checkout. Pro renews monthly and the
 * Job-hunt Pass is a one-time 30-day unlock (landing pricing) — both grant 30
 * days per payment; renewal is a later `checkout.completed` event.
 */
const PERIOD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface EmulatorProviderDeps {
  readonly subscriptions: SubscriptionsStore;
  /** HMAC secret shared with the webhook verifier (the MoR-swap seam). */
  readonly secret: string;
  /** Injectable clock — deterministic period ends in tests. */
  readonly now?: () => Date;
  /** Injectable id factory for self-generated events. */
  readonly newEventId?: () => string;
}

export function createEmulatorProvider(deps: EmulatorProviderDeps): PaymentsProvider {
  const now = deps.now ?? (() => new Date());
  const newEventId = deps.newEventId ?? (() => `evt_${randomUUID()}`);

  async function handleWebhook(event: PaymentsEvent): Promise<void> {
    if (event.type === "checkout.completed") {
      // Successful payment: grant the plan for one period (FR-PAYWALL-03).
      await deps.subscriptions.upsert({
        userId: event.userId,
        plan: event.plan,
        status: "active",
        currentPeriodEnd: new Date(
          Date.parse(event.occurredAt) + PERIOD_DAYS * DAY_MS,
        ).toISOString(),
      });
      return;
    }
    if (event.type === "subscription.canceled") {
      // Keep the plan and period end: access runs until the period lapses,
      // then Free (FR-BILLING-02 downgrade-at-period-end semantics).
      const existing = await deps.subscriptions.get(event.userId);
      if (existing === null) return;
      await deps.subscriptions.upsert({ ...existing, status: "canceled" });
      return;
    }
    // checkout.failed: deliberately NO write. Absence of a paid row is Free —
    // a failed payment must not create any partial-access state (FR-BILLING-03).
  }

  return {
    async createCheckout(input) {
      const token = createCheckoutToken(
        {
          userId: input.userId,
          plan: input.plan,
          returnTo: input.returnTo,
          issuedAt: now().toISOString(),
        },
        deps.secret,
      );
      return { checkoutUrl: `/checkout?token=${encodeURIComponent(token)}` };
    },

    handleWebhook,

    async getSubscription(userId) {
      return deps.subscriptions.get(userId);
    },

    async cancel(userId) {
      const existing = await deps.subscriptions.get(userId);
      // Nothing to cancel on Free — cancel is idempotent and calm.
      if (existing === null || !isPaymentsPlan(existing.plan)) return;
      await handleWebhook({
        id: newEventId(),
        type: "subscription.canceled",
        userId,
        plan: existing.plan,
        occurredAt: now().toISOString(),
      });
    },
  };
}
