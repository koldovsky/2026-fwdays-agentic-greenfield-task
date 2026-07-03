// api segment — the emulated checkout round-trip (add-payments-emulator task
// 1.2). Two hops that mirror a real MoR: (1) the emulator "backend"
// (/api/payments/checkout/complete) exchanges the session token + chosen
// outcome for a SIGNED event; (2) the browser delivers that event to
// /api/payments/webhook — the sole subscription writer — exactly like a MoR
// callback. The client never sees the secret, only a signed blob it cannot
// forge or alter.

export type CheckoutOutcome = "succeeded" | "failed";

/** Calm tri-state for the view (NFR-OBS-01): no exceptions escape. */
export type CompleteCheckoutResult = "completed" | "declined" | "error";

export async function completeEmulatedCheckout(
  token: string,
  outcome: CheckoutOutcome,
): Promise<CompleteCheckoutResult> {
  try {
    const signed = await fetch("/api/payments/checkout/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, outcome }),
    });
    if (!signed.ok) return "error";

    const { event, signature } = (await signed.json()) as {
      event?: unknown;
      signature?: unknown;
    };
    if (typeof event !== "string" || typeof signature !== "string") return "error";

    const delivered = await fetch("/api/payments/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-payments-signature": signature,
      },
      body: event,
    });
    if (!delivered.ok) return "error";

    return outcome === "succeeded" ? "completed" : "declined";
  } catch {
    return "error";
  }
}
