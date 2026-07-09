// api segment — starts an upgrade (add-payments-emulator task 2.1,
// FR-PAYWALL-02/03). Asks the server to create a checkout session for the
// chosen plan; the server signs the plan + returnTo into the checkout token,
// so nothing the client sends can be trusted or needs to be. Calm result
// union — no exceptions escape (NFR-OBS-01).

// Type-only import: shared/lib/payments' runtime code is server-side
// (node:crypto); the client only needs the plan union.
import type { PaymentsPlan } from "@/shared/lib/payments";

export type StartCheckoutResult =
  | { readonly ok: true; readonly checkoutUrl: string }
  | { readonly ok: false; readonly code: "unauthenticated" | "error" };

export async function startCheckout(
  plan: PaymentsPlan,
  returnTo: string,
): Promise<StartCheckoutResult> {
  try {
    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan, returnTo }),
    });
    // Anonymous callers need an account first — checkout is per-user
    // (subscriptions key on user id); the UI routes them to sign-in.
    if (response.status === 401) return { ok: false, code: "unauthenticated" };
    if (!response.ok) return { ok: false, code: "error" };

    const { checkoutUrl } = (await response.json()) as { checkoutUrl?: unknown };
    if (typeof checkoutUrl !== "string" || checkoutUrl === "") {
      return { ok: false, code: "error" };
    }
    return { ok: true, checkoutUrl };
  } catch {
    return { ok: false, code: "error" };
  }
}
