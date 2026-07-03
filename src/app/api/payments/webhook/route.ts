// POST /api/payments/webhook (add-payments-emulator task 1.3). The SOLE writer
// of subscription state: emulator today, real merchant-of-record later, both
// through the same HMAC seam (TC-STACK-06) — the signature is verified over
// the raw body BEFORE anything is parsed or touched. Checkout screens never
// write subscriptions; they only trigger events that land here.
//
// Failure discipline (NFR-OBS-01): bad signature → 401, malformed event → 400,
// unconfigured/broken infra → calm machine-coded 5xx. No stacks, no event
// payloads in responses; server logs carry no payload either (NFR-SEC-01
// hygiene — events carry user ids).
import { getPaymentsWebhookSecret } from "@/shared/config";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import {
  parsePaymentsEvent,
  resolvePaymentsProvider,
  verifySignature,
} from "@/shared/lib/payments";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  // Signature secret first: without it no webhook can be trusted at all.
  let secret: string;
  try {
    secret = getPaymentsWebhookSecret();
  } catch {
    console.error("[payments-webhook] PAYMENTS_WEBHOOK_SECRET is not configured");
    return Response.json({ error: "payments_unconfigured" }, { status: 503 });
  }

  // Verify over the RAW body — the exact bytes the sender signed.
  const raw = await request.text();
  const signature = request.headers.get("x-payments-signature") ?? "";
  if (!verifySignature(raw, signature, secret)) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  const event = parsePaymentsEvent(raw);
  if (event === null) {
    return Response.json({ error: "invalid_event" }, { status: 400 });
  }

  try {
    const provider = resolvePaymentsProvider({
      subscriptions: createSubscriptionRepo(getDb()),
    });
    await provider.handleWebhook(event);
    return Response.json({ received: true });
  } catch (cause) {
    // Log without the payload: enough to diagnose, nothing personal leaks.
    console.error("[payments-webhook] failed to apply event", cause);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
