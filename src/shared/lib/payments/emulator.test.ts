// Emulator adapter tests (task 1.2): the shared port contract over an
// in-memory store, plus emulator-specific behavior — signed checkout tokens,
// deterministic period ends, and the single-writer discipline (every state
// change flows through handleWebhook).
import { describe, expect, it } from "vitest";
import { verifyCheckoutToken } from "./checkout-token";
import { createEmulatorProvider } from "./emulator";
import type { SubscriptionsStore } from "./port";
import type { PaymentsSubscription } from "./types";
import { describePaymentsProviderContract } from "./testing/contract";

const SECRET = "test-webhook-secret";

function memoryStore(): SubscriptionsStore & { readonly writes: PaymentsSubscription[] } {
  const rows = new Map<string, PaymentsSubscription>();
  const writes: PaymentsSubscription[] = [];
  return {
    writes,
    async get(userId) {
      return rows.get(userId) ?? null;
    },
    async upsert(record) {
      writes.push(record);
      rows.set(record.userId, record);
    },
  };
}

function makeProvider(store = memoryStore()) {
  return createEmulatorProvider({
    subscriptions: store,
    secret: SECRET,
    now: () => new Date("2026-07-03T12:00:00.000Z"),
    newEventId: () => "evt_test",
  });
}

describePaymentsProviderContract("emulator", () => makeProvider());

describe("emulator specifics", () => {
  it("createCheckout returns a local /checkout url with a verifiable signed token", async () => {
    const provider = makeProvider();
    const { checkoutUrl } = await provider.createCheckout({
      userId: "u1",
      plan: "pro",
      returnTo: "/tailor",
    });

    const url = new URL(checkoutUrl, "http://localhost");
    expect(url.pathname).toBe("/checkout");
    const token = url.searchParams.get("token") ?? "";
    // The token round-trips through the same HMAC seam the webhook uses.
    expect(verifyCheckoutToken(token, SECRET)).toEqual({
      userId: "u1",
      plan: "pro",
      returnTo: "/tailor",
      issuedAt: "2026-07-03T12:00:00.000Z",
    });
    // A tampered token dies at verification.
    expect(verifyCheckoutToken(`${token}00`, SECRET)).toBeNull();
  });

  it("rejects an off-site returnTo at checkout creation (open-redirect guard)", async () => {
    const provider = makeProvider();
    await expect(
      provider.createCheckout({ userId: "u1", plan: "pro", returnTo: "https://evil.example" }),
    ).rejects.toThrow(/site-relative/);
  });

  it("grants exactly 30 days from the event time on checkout.completed", async () => {
    const store = memoryStore();
    const provider = makeProvider(store);
    await provider.handleWebhook({
      id: "evt_1",
      type: "checkout.completed",
      userId: "u1",
      plan: "pro",
      occurredAt: "2026-07-03T00:00:00.000Z",
    });

    expect(store.writes).toHaveLength(1);
    expect(store.writes[0].currentPeriodEnd).toBe("2026-08-02T00:00:00.000Z");
  });

  it("writes nothing at all for checkout.failed (FR-BILLING-03)", async () => {
    const store = memoryStore();
    await makeProvider(store).handleWebhook({
      id: "evt_1",
      type: "checkout.failed",
      userId: "u1",
      plan: "pro",
      occurredAt: "2026-07-03T00:00:00.000Z",
    });

    expect(store.writes).toHaveLength(0);
  });

  // Task 3.2 — per-plan period ends (FR-BILLING-01, FR-PAYWALL-02, FR-BILLING-03)
  it("job_hunt_pass checkout.completed grants exactly 14 days from occurredAt", async () => {
    const store = memoryStore();
    await makeProvider(store).handleWebhook({
      id: "evt_pass",
      type: "checkout.completed",
      userId: "u_pass",
      plan: "job_hunt_pass",
      occurredAt: "2026-07-03T00:00:00.000Z",
    });

    expect(store.writes).toHaveLength(1);
    // 2026-07-03 + 14 days = 2026-07-17
    expect(store.writes[0].currentPeriodEnd).toBe("2026-07-17T00:00:00.000Z");
  });

  it("ultra checkout.completed grants exactly 30 days from occurredAt", async () => {
    const store = memoryStore();
    await makeProvider(store).handleWebhook({
      id: "evt_ultra",
      type: "checkout.completed",
      userId: "u_ultra",
      plan: "ultra",
      occurredAt: "2026-07-03T00:00:00.000Z",
    });

    expect(store.writes).toHaveLength(1);
    // 2026-07-03 + 30 days = 2026-08-02
    expect(store.writes[0].currentPeriodEnd).toBe("2026-08-02T00:00:00.000Z");
  });

  it("pro checkout.completed still grants exactly 30 days (no regression)", async () => {
    const store = memoryStore();
    await makeProvider(store).handleWebhook({
      id: "evt_pro",
      type: "checkout.completed",
      userId: "u_pro",
      plan: "pro",
      occurredAt: "2026-07-03T00:00:00.000Z",
    });

    expect(store.writes).toHaveLength(1);
    expect(store.writes[0].currentPeriodEnd).toBe("2026-08-02T00:00:00.000Z");
  });

  it("checkout.failed writes nothing for job_hunt_pass (FR-BILLING-03)", async () => {
    const store = memoryStore();
    await makeProvider(store).handleWebhook({
      id: "evt_fail_pass",
      type: "checkout.failed",
      userId: "u_fail_pass",
      plan: "job_hunt_pass",
      occurredAt: "2026-07-03T00:00:00.000Z",
    });

    expect(store.writes).toHaveLength(0);
  });

  it("checkout.failed writes nothing for ultra (FR-BILLING-03)", async () => {
    const store = memoryStore();
    await makeProvider(store).handleWebhook({
      id: "evt_fail_ultra",
      type: "checkout.failed",
      userId: "u_fail_ultra",
      plan: "ultra",
      occurredAt: "2026-07-03T00:00:00.000Z",
    });

    expect(store.writes).toHaveLength(0);
  });

  it("cancel routes through the webhook path — never a direct store write", async () => {
    const store = memoryStore();
    const provider = makeProvider(store);
    await provider.handleWebhook({
      id: "evt_1",
      type: "checkout.completed",
      userId: "u1",
      plan: "job_hunt_pass",
      occurredAt: "2026-07-03T00:00:00.000Z",
    });
    await provider.cancel("u1");

    // Two writes total: the grant, then the cancellation via its own event.
    expect(store.writes).toHaveLength(2);
    expect(store.writes[1]).toMatchObject({ userId: "u1", status: "canceled" });
    // Plan and period end survive cancellation (FR-BILLING-02).
    expect(store.writes[1].plan).toBe("job_hunt_pass");
    // job_hunt_pass is a 14-day pass: 2026-07-03 + 14 days = 2026-07-17.
    expect(store.writes[1].currentPeriodEnd).toBe("2026-07-17T00:00:00.000Z");
  });
});
