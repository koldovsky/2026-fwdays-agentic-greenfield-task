// POST /api/payments/checkout/complete (add-payments-emulator task 1.2). The
// emulator's stand-in for the merchant-of-record BACKEND: exchanges a verified
// checkout-session token + chosen outcome for a SIGNED webhook event that the
// browser then delivers to /api/payments/webhook — mirroring how a real MoR
// calls back after payment. This endpoint never writes subscriptions; the
// webhook handler is the sole writer.
//
// Hard-disabled outside the emulator (production included): a plain 404, as if
// the route did not exist (task 4.2 guard, NFR-OBS-01 calm failure).
import { randomUUID } from "node:crypto";
import { getPaymentsWebhookSecret, isPaymentsEmulatorEnabled } from "@/shared/config";
import {
  serializePaymentsEvent,
  signPayload,
  verifyCheckoutToken,
  type PaymentsEvent,
} from "@/shared/lib/payments";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!isPaymentsEmulatorEnabled()) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  let secret: string;
  try {
    secret = getPaymentsWebhookSecret();
  } catch {
    console.error("[payments-emulator] PAYMENTS_WEBHOOK_SECRET is not configured");
    return Response.json({ error: "payments_unconfigured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const { token, outcome } = (body ?? {}) as { token?: unknown; outcome?: unknown };
  if (outcome !== "succeeded" && outcome !== "failed") {
    return Response.json({ error: "invalid_outcome" }, { status: 400 });
  }
  // A missing or tampered token dies here — the plan and user in the event
  // below can only ever come from a session the server itself signed.
  const session = typeof token === "string" ? verifyCheckoutToken(token, secret) : null;
  if (session === null) {
    return Response.json({ error: "invalid_token" }, { status: 400 });
  }

  const event: PaymentsEvent = {
    id: `evt_${randomUUID()}`,
    type: outcome === "succeeded" ? "checkout.completed" : "checkout.failed",
    userId: session.userId,
    plan: session.plan,
    occurredAt: new Date().toISOString(),
  };
  const payload = serializePaymentsEvent(event);
  return Response.json({ event: payload, signature: signPayload(payload, secret) });
}
