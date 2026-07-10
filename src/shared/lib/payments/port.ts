// Payments provider port (add-payments-emulator design, TC-STACK-06). The app
// accesses payments ONLY through this interface; the emulator adapter and a
// future real merchant-of-record are interchangeable implementations.
import type {
  CheckoutSession,
  CreateCheckoutInput,
  PaymentsEvent,
  PaymentsSubscription,
} from "./types";

export interface PaymentsProvider {
  /** Start a checkout for a plan; the user is sent to `checkoutUrl` to pay. */
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
  /**
   * Apply a verified provider event. This is the SOLE path that writes
   * subscription state (FR-PAYWALL-03, FR-BILLING-02): checkout screens and
   * app code never touch the subscriptions store directly.
   */
  handleWebhook(event: PaymentsEvent): Promise<void>;
  /** Synced subscription for a user; null means Free (never purchased). */
  getSubscription(userId: string): Promise<PaymentsSubscription | null>;
  /** Request cancellation; state changes arrive via the webhook path. */
  cancel(userId: string): Promise<void>;
}

/**
 * Minimal persistence the port needs for subscription sync. The db layer's
 * SubscriptionRepo satisfies it structurally; tests inject an in-memory map.
 */
export interface SubscriptionsStore {
  get(userId: string): Promise<PaymentsSubscription | null>;
  upsert(record: PaymentsSubscription): Promise<void>;
}
