// POST /api/payments/subscription/cancel (add-payments-emulator task 3.2,
// FR-BILLING-01/02). Requests cancellation of the signed-in user's
// subscription through the provider port. The provider confirms via its
// webhook path — the sole subscription writer — and the resulting state is
// "canceled, access until period end" (downgrade at period END, FR-BILLING-02).
// Cancel is idempotent: cancelling on Free is a calm no-op.
//
// Failure discipline (NFR-OBS-01): anonymous → 401, unconfigured payments →
// 503, provider failure → calm coded 500. No payloads in logs (NFR-SEC-01).
import { currentUserId } from "@/app/auth";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { resolvePaymentsProvider, type PaymentsProvider } from "@/shared/lib/payments";

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  let userId: string | null = null;
  try {
    userId = await currentUserId();
  } catch {
    userId = null;
  }
  if (userId === null) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  let provider: PaymentsProvider;
  try {
    provider = resolvePaymentsProvider({
      subscriptions: createSubscriptionRepo(getDb()),
    });
  } catch (cause) {
    console.error("[payments-cancel] payments provider is not configured", cause);
    return Response.json({ error: "payments_unconfigured" }, { status: 503 });
  }

  try {
    await provider.cancel(userId);
    return Response.json({ ok: true });
  } catch (cause) {
    console.error("[payments-cancel] failed to cancel the subscription", cause);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
