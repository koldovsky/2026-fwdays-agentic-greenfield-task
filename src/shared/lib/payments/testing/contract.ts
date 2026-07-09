// Shared PaymentsProvider contract (add-payments-emulator task 1.1). Every
// adapter — fake, emulator, and a future real MoR test double — must pass the
// same observable behavior: checkout grants nothing by itself, only webhook
// events change state, failure grants nothing (FR-BILLING-03), cancel keeps
// access until period end (FR-BILLING-02). Imported by *.test.ts files only.
import { describe, expect, it } from "vitest";
import type { PaymentsProvider } from "../port";
import type { PaymentsEvent } from "../types";

const USER = "user-1";

function completedEvent(overrides: Partial<PaymentsEvent> = {}): PaymentsEvent {
  return {
    id: "evt_1",
    type: "checkout.completed",
    userId: USER,
    plan: "pro",
    occurredAt: "2026-07-03T00:00:00.000Z",
    ...overrides,
  };
}

export function describePaymentsProviderContract(
  name: string,
  makeProvider: () => PaymentsProvider,
): void {
  describe(`${name} satisfies the PaymentsProvider contract`, () => {
    it("createCheckout returns a checkout url and grants nothing by itself", async () => {
      const provider = makeProvider();
      const session = await provider.createCheckout({
        userId: USER,
        plan: "pro",
        returnTo: "/tailor",
      });

      expect(session.checkoutUrl).toContain("/checkout");
      // Webhook is the sole writer: starting a checkout must not create state.
      expect(await provider.getSubscription(USER)).toBeNull();
    });

    it("reports null (Free) for a user who never purchased", async () => {
      expect(await makeProvider().getSubscription("nobody")).toBeNull();
    });

    it("activates the plan when a checkout.completed webhook arrives (FR-PAYWALL-03)", async () => {
      const provider = makeProvider();
      await provider.handleWebhook(completedEvent({ plan: "job_hunt_pass" }));

      const sub = await provider.getSubscription(USER);
      expect(sub).not.toBeNull();
      expect(sub?.plan).toBe("job_hunt_pass");
      expect(sub?.status).toBe("active");
      // A paid grant is bounded — the period end must be after the event time.
      expect(Date.parse(sub?.currentPeriodEnd ?? "")).toBeGreaterThan(
        Date.parse("2026-07-03T00:00:00.000Z"),
      );
    });

    it("grants nothing on checkout.failed — no partial access (FR-BILLING-03)", async () => {
      const provider = makeProvider();
      await provider.handleWebhook(completedEvent({ type: "checkout.failed" }));

      expect(await provider.getSubscription(USER)).toBeNull();
    });

    it("cancel marks the subscription canceled but keeps plan and period end (FR-BILLING-02)", async () => {
      const provider = makeProvider();
      await provider.handleWebhook(completedEvent());
      await provider.cancel(USER);

      const sub = await provider.getSubscription(USER);
      expect(sub?.status).toBe("canceled");
      expect(sub?.plan).toBe("pro");
      expect(sub?.currentPeriodEnd).not.toBeNull();
    });

    it("cancel on a Free user is a calm no-op", async () => {
      const provider = makeProvider();
      await provider.cancel(USER);

      expect(await provider.getSubscription(USER)).toBeNull();
    });
  });
}
