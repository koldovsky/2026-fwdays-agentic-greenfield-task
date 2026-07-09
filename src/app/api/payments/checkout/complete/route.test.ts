// Route-level tests for POST /api/payments/checkout/complete (task 1.2): the
// emulator's signer endpoint. Proves the returned event verifies against the
// webhook seam, tokens cannot be forged, and the whole endpoint is a 404 in
// production (task 4.2 guard).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCheckoutToken,
  parsePaymentsEvent,
  verifySignature,
} from "@/shared/lib/payments";
import { POST } from "./route";

const SECRET = "route-test-secret";

function completeRequest(body: unknown): Request {
  return new Request("http://localhost/api/payments/checkout/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validToken(): string {
  return createCheckoutToken(
    { userId: "u1", plan: "pro", returnTo: "/tailor", issuedAt: "2026-07-03T12:00:00.000Z" },
    SECRET,
  );
}

beforeEach(() => {
  vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/payments/checkout/complete", () => {
  it("exchanges a valid token + succeeded for a signed checkout.completed event", async () => {
    const response = await POST(completeRequest({ token: validToken(), outcome: "succeeded" }));

    expect(response.status).toBe(200);
    const { event, signature } = (await response.json()) as { event: string; signature: string };
    // The signature verifies through the same seam the webhook route uses.
    expect(verifySignature(event, signature, SECRET)).toBe(true);
    expect(parsePaymentsEvent(event)).toMatchObject({
      type: "checkout.completed",
      userId: "u1",
      plan: "pro",
    });
  });

  it("maps the failed outcome to a signed checkout.failed event", async () => {
    const response = await POST(completeRequest({ token: validToken(), outcome: "failed" }));

    const { event, signature } = (await response.json()) as { event: string; signature: string };
    expect(verifySignature(event, signature, SECRET)).toBe(true);
    expect(parsePaymentsEvent(event)?.type).toBe("checkout.failed");
  });

  it("rejects a tampered or missing token with 400", async () => {
    const tampered = await POST(
      completeRequest({ token: `${validToken()}00`, outcome: "succeeded" }),
    );
    expect(tampered.status).toBe(400);
    expect(await tampered.json()).toEqual({ error: "invalid_token" });

    const missing = await POST(completeRequest({ outcome: "succeeded" }));
    expect(missing.status).toBe(400);
  });

  it("rejects an unknown outcome with 400", async () => {
    const response = await POST(completeRequest({ token: validToken(), outcome: "maybe" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_outcome" });
  });

  it("rejects a non-JSON body with 400", async () => {
    const response = await POST(
      new Request("http://localhost/api/payments/checkout/complete", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_body" });
  });

  it("is hard-disabled in production — a plain 404, no signing (task 4.2 guard)", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(completeRequest({ token: validToken(), outcome: "succeeded" }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });
});
