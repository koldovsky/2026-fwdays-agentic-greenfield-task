// In-memory PaymentsProvider for tests (mirrors llm/testing/fake-provider.ts).
// No HMAC, no tokens, no store port — just the port's observable semantics, so
// upper layers (paywall, upgrade, billing portal) can be tested without config
// or a database. Must satisfy the same contract as the emulator
// (see ./contract.ts).
import type { PaymentsProvider } from "../port";
import { isPaymentsPlan, type PaymentsSubscription } from "../types";

const PERIOD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface FakePaymentsProvider extends PaymentsProvider {
  /** Direct state access for test assertions. */
  readonly subscriptions: Map<string, PaymentsSubscription>;
}

export function createFakePaymentsProvider(): FakePaymentsProvider {
  const subscriptions = new Map<string, PaymentsSubscription>();

  return {
    subscriptions,

    async createCheckout(input) {
      return {
        checkoutUrl: `/checkout?fake=1&plan=${input.plan}&returnTo=${encodeURIComponent(
          input.returnTo,
        )}`,
      };
    },

    async handleWebhook(event) {
      if (event.type === "checkout.completed") {
        subscriptions.set(event.userId, {
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
        const existing = subscriptions.get(event.userId);
        if (existing === undefined) return;
        subscriptions.set(event.userId, { ...existing, status: "canceled" });
        return;
      }
      // checkout.failed: no write — no partial access (FR-BILLING-03).
    },

    async getSubscription(userId) {
      return subscriptions.get(userId) ?? null;
    },

    async cancel(userId) {
      const existing = subscriptions.get(userId);
      if (existing === undefined || !isPaymentsPlan(existing.plan)) return;
      await this.handleWebhook({
        id: `evt_fake_${subscriptions.size}`,
        type: "subscription.canceled",
        userId,
        plan: existing.plan,
        occurredAt: new Date().toISOString(),
      });
    },
  };
}
