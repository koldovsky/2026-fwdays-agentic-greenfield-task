// Route-level tests for POST /api/payments/checkout (tasks 2.1/2.3): checkout
// sessions are per-user, the plan is validated, and returnTo is provably a
// same-origin relative path — the signed token round-trips exactly what the
// server vouched for (FR-PAYWALL-03, open-redirect guard).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyCheckoutToken } from "@/shared/lib/payments";

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

vi.mock("@/shared/lib/db", () => ({
  createSubscriptionRepo: () => ({ get: vi.fn(), upsert: vi.fn() }),
}));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

import { POST } from "./route";

const SECRET = "checkout-route-secret";

function checkoutRequest(body: unknown): Request {
  return new Request("http://localhost/api/payments/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", SECRET);
  currentUserId.mockResolvedValue("u1");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/payments/checkout", () => {
  it("creates a session whose signed token round-trips user, plan, and returnTo (2.3)", async () => {
    const response = await POST(
      checkoutRequest({ plan: "job_hunt_pass", returnTo: "/tailor?run=1" }),
    );

    expect(response.status).toBe(200);
    const { checkoutUrl } = (await response.json()) as { checkoutUrl: string };
    expect(checkoutUrl.startsWith("/checkout?token=")).toBe(true);

    const token = new URL(checkoutUrl, "http://localhost").searchParams.get("token") ?? "";
    // The token verifies against the same secret seam and carries exactly
    // what the server signed — the browser cannot upgrade plan or target.
    expect(verifyCheckoutToken(token, SECRET)).toMatchObject({
      userId: "u1",
      plan: "job_hunt_pass",
      returnTo: "/tailor?run=1",
    });
  });

  it("requires a session — anonymous callers get a calm 401", async () => {
    currentUserId.mockResolvedValue(null);
    const response = await POST(checkoutRequest({ plan: "pro", returnTo: "/tailor" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthenticated" });
  });

  it("degrades a broken session read to 401, never a raw 500 (NFR-OBS-01)", async () => {
    currentUserId.mockRejectedValue(new Error("AUTH_SECRET is not set"));
    const response = await POST(checkoutRequest({ plan: "pro", returnTo: "/tailor" }));
    expect(response.status).toBe(401);
  });

  it("rejects an unknown plan with 400", async () => {
    const response = await POST(checkoutRequest({ plan: "enterprise", returnTo: "/tailor" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_plan" });
  });

  it.each([
    ["absolute URL", "https://evil.example/phish"],
    ["protocol-relative", "//evil.example"],
    ["backslash form", "/\\evil.example"],
    ["missing", undefined],
    ["not a path", "tailor"],
  ])("rejects a %s returnTo with 400 (open-redirect guard)", async (_name, returnTo) => {
    const response = await POST(checkoutRequest({ plan: "pro", returnTo }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_return_to" });
  });

  it("rejects a non-JSON body with 400", async () => {
    const response = await POST(
      new Request("http://localhost/api/payments/checkout", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_body" });
  });

  it("answers a calm 503 when payments are unconfigured (NFR-OBS-01)", async () => {
    vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(checkoutRequest({ plan: "pro", returnTo: "/tailor" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "payments_unconfigured" });
    consoleError.mockRestore();
  });
});
