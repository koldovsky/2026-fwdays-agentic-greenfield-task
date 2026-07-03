// Public API for shared/lib/payments (add-payments-emulator, TC-STACK-06):
// provider port + emulator adapter + the webhook signature seam.
export type { PaymentsProvider, SubscriptionsStore } from "./port";
export {
  isPaymentsPlan,
  type CheckoutSession,
  type CreateCheckoutInput,
  type PaymentsEvent,
  type PaymentsEventType,
  type PaymentsPlan,
  type PaymentsSubscription,
} from "./types";
export { signPayload, verifySignature } from "./signature";
export { parsePaymentsEvent, serializePaymentsEvent } from "./events";
export {
  createCheckoutToken,
  verifyCheckoutToken,
  isSafeReturnTo,
  type CheckoutTokenPayload,
} from "./checkout-token";
export { createEmulatorProvider, type EmulatorProviderDeps } from "./emulator";
export { resolvePaymentsProvider, type PaymentsDeps } from "./factory";
