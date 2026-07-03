// POST /api/payments/checkout (add-payments-emulator task 2.1/2.3,
// FR-PAYWALL-02/03). Creates a checkout session for the signed-in user's
// chosen plan through the payments provider port. The plan, user id, and
// returnTo are signed into the checkout token server-side — the browser can
// carry them but never alter them. returnTo is validated as a same-origin
// relative path BEFORE anything is created (open-redirect guard, task 2.3).
//
// Failure discipline (NFR-OBS-01): anonymous → 401 (the client routes to
// sign-in), malformed input → 400 with a machine code, unconfigured payments
// → calm 503. No stacks or payloads in responses or logs.
import { currentUserId } from "@/app/auth";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import {
  isPaymentsPlan,
  isSafeReturnTo,
  resolvePaymentsProvider,
} from "@/shared/lib/payments";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  // Checkout is per-user — subscriptions key on the user id (FR-PAYWALL-03).
  // A broken session read degrades to anonymous: 401, never a raw 500.
  let userId: string | null = null;
  try {
    userId = await currentUserId();
  } catch {
    userId = null;
  }
  if (userId === null) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const { plan, returnTo } = (body ?? {}) as { plan?: unknown; returnTo?: unknown };
  if (!isPaymentsPlan(plan)) {
    return Response.json({ error: "invalid_plan" }, { status: 400 });
  }
  // Open-redirect guard (task 2.3): only a same-origin relative path may be a
  // return target — absolute URLs and protocol-relative forms die here.
  if (typeof returnTo !== "string" || !isSafeReturnTo(returnTo)) {
    return Response.json({ error: "invalid_return_to" }, { status: 400 });
  }

  try {
    const provider = resolvePaymentsProvider({
      subscriptions: createSubscriptionRepo(getDb()),
    });
    const session = await provider.createCheckout({ userId, plan, returnTo });
    return Response.json({ checkoutUrl: session.checkoutUrl });
  } catch (cause) {
    // Missing secret, emulator-in-production, or a broken adapter — one calm
    // code; enough to diagnose in logs, nothing sensitive leaks (NFR-SEC-01).
    console.error("[payments-checkout] failed to create a checkout session", cause);
    return Response.json({ error: "payments_unconfigured" }, { status: 503 });
  }
}
