// api segment — requests cancellation (add-payments-emulator task 3.2,
// FR-BILLING-01/02). The server routes it through the payments provider,
// whose state change arrives via the webhook path — this client never writes
// subscription state. Calm result union, no exceptions escape (NFR-OBS-01).

export type CancelSubscriptionResult = "ok" | "error";

export async function cancelSubscription(): Promise<CancelSubscriptionResult> {
  try {
    const response = await fetch("/api/payments/subscription/cancel", { method: "POST" });
    return response.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
