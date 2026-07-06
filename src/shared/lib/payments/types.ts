// Payments capability types (add-payments-emulator, TC-STACK-06). Framework-free
// (TC-PURE-01). Defined locally — shared/lib may not import entities — but the
// plan/status unions deliberately mirror entities/subscription and the
// subscriptions table CHECK constraints (migrations/0001_init.sql).

/** Purchasable plans (FR-PAYWALL-02). Free is the absence of a purchase. */
export type PaymentsPlan = "pro" | "ultra" | "job_hunt_pass";

const PAYMENTS_PLANS: readonly string[] = ["pro", "ultra", "job_hunt_pass"];

/** Type guard for {@link PaymentsPlan} on untrusted input. */
export function isPaymentsPlan(value: unknown): value is PaymentsPlan {
  return typeof value === "string" && PAYMENTS_PLANS.includes(value);
}

export type PaymentsEventType =
  | "checkout.completed"
  | "checkout.failed"
  | "subscription.canceled";

/**
 * Provider callback event — the ONLY input that may mutate subscription state
 * (design: "webhook is the source of truth"). The emulator self-posts these;
 * a real MoR delivers the same shape through the same signature seam.
 */
export interface PaymentsEvent {
  /** Provider-side event id (idempotency key for a real MoR). */
  readonly id: string;
  readonly type: PaymentsEventType;
  readonly userId: string;
  readonly plan: PaymentsPlan;
  /** ISO-8601 time the event occurred at the provider. */
  readonly occurredAt: string;
}

export interface CreateCheckoutInput {
  readonly userId: string;
  readonly plan: PaymentsPlan;
  /** Site-relative path to return to after checkout (FR-PAYWALL-03). */
  readonly returnTo: string;
}

export interface CheckoutSession {
  /** Where to send the user to pay — the emulator's local /checkout screen. */
  readonly checkoutUrl: string;
}

/** A user's synced subscription state as the payments port reports it. */
export interface PaymentsSubscription {
  readonly userId: string;
  readonly plan: "free" | PaymentsPlan;
  readonly status: "active" | "canceled" | "expired";
  /** ISO-8601 end of the paid period; null when there is none. */
  readonly currentPeriodEnd: string | null;
}
