// Factory + production guard tests (groundwork for task 4.2): the emulator is
// HARD-disabled under NODE_ENV=production — selecting it, explicitly or by
// default, throws before any adapter is built.
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolvePaymentsProvider } from "./factory";
import type { SubscriptionsStore } from "./port";

const store: SubscriptionsStore = {
  async get() {
    return null;
  },
  async upsert() {},
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolvePaymentsProvider", () => {
  it("returns the emulator adapter outside production", () => {
    vi.stubEnv("PAYMENTS_PROVIDER", "emulator");
    vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", "test-secret");

    const provider = resolvePaymentsProvider({ subscriptions: store });
    expect(typeof provider.createCheckout).toBe("function");
    expect(typeof provider.handleWebhook).toBe("function");
  });

  it("defaults to the emulator when PAYMENTS_PROVIDER is unset (dev)", () => {
    vi.stubEnv("PAYMENTS_PROVIDER", "");
    vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", "test-secret");

    expect(() => resolvePaymentsProvider({ subscriptions: store })).not.toThrow();
  });

  it("hard-refuses the emulator in production, even by default (task 4.2 guard)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", "test-secret");

    expect(() => resolvePaymentsProvider({ subscriptions: store })).toThrow(/production/);

    vi.stubEnv("PAYMENTS_PROVIDER", "emulator");
    expect(() => resolvePaymentsProvider({ subscriptions: store })).toThrow(/production/);
  });

  it("rejects an unknown provider name", () => {
    vi.stubEnv("PAYMENTS_PROVIDER", "paddle");
    vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", "test-secret");

    expect(() => resolvePaymentsProvider({ subscriptions: store })).toThrow(
      /PAYMENTS_PROVIDER/,
    );
  });

  it("requires the webhook secret", () => {
    vi.stubEnv("PAYMENTS_PROVIDER", "emulator");
    vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", "");

    expect(() => resolvePaymentsProvider({ subscriptions: store })).toThrow(
      /PAYMENTS_WEBHOOK_SECRET/,
    );
  });
});
