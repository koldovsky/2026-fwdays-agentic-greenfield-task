// Route-level tests for POST /api/payments/subscription/cancel (task 3.2,
// FR-BILLING-01/02): cancellation flows through the provider's webhook path —
// status becomes `canceled` but plan + period end stay, so access runs until
// the period lapses (downgrade at period END).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentsSubscription } from "@/shared/lib/payments";

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

// In-memory subscriptions store standing in for the pg-backed repo.
const store = vi.hoisted(() => {
  const rows = new Map<string, PaymentsSubscription>();
  return {
    rows,
    repo: {
      get: async (userId: string) => rows.get(userId) ?? null,
      upsert: async (record: PaymentsSubscription) => {
        rows.set(record.userId, record);
      },
    },
  };
});
vi.mock("@/shared/lib/db", () => ({ createSubscriptionRepo: () => store.repo }));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

import { POST } from "./route";

const SECRET = "cancel-route-secret";

beforeEach(() => {
  vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", SECRET);
  store.rows.clear();
  currentUserId.mockResolvedValue("u1");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/payments/subscription/cancel", () => {
  it("marks the subscription canceled but keeps plan + period end (FR-BILLING-02)", async () => {
    store.rows.set("u1", {
      userId: "u1",
      plan: "pro",
      status: "active",
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(store.rows.get("u1")).toEqual({
      userId: "u1",
      plan: "pro",
      status: "canceled",
      // Access until period end — the downgrade happens when it lapses.
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    });
  });

  it("is a calm no-op for a user with no subscription (idempotent cancel)", async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    expect(store.rows.size).toBe(0);
  });

  it("requires a session — anonymous callers get a calm 401", async () => {
    currentUserId.mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthenticated" });
  });

  it("answers a calm 503 when payments are unconfigured (NFR-OBS-01)", async () => {
    vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "payments_unconfigured" });
    consoleError.mockRestore();
  });

  it("answers a calm coded 500 when the store fails, no stack in the body", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const brokenGet = vi
      .spyOn(store.repo, "get")
      .mockRejectedValue(new Error("connection refused"));

    const response = await POST();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "server_error" });
    brokenGet.mockRestore();
    consoleError.mockRestore();
  });
});
