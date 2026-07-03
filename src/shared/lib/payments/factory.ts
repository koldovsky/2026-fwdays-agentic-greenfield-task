// Provider factory: resolves the configured payments adapter at the app edge
// (PAYMENTS_PROVIDER env, TC-STACK-06). Mirrors llm/factory.ts: config comes
// from shared/config, adapters stay behind the port. The production guard
// lives in getPaymentsProviderName — selecting the emulator (explicitly or by
// default) under NODE_ENV=production throws before any adapter is built
// (task 4.2 asserts this).
import { getPaymentsProviderName, getPaymentsWebhookSecret } from "@/shared/config";
import { createEmulatorProvider } from "./emulator";
import type { PaymentsProvider, SubscriptionsStore } from "./port";

export interface PaymentsDeps {
  readonly subscriptions: SubscriptionsStore;
}

export function resolvePaymentsProvider(deps: PaymentsDeps): PaymentsProvider {
  // Only one adapter exists today; the call still validates the name and
  // hard-refuses the emulator in production. A real MoR adapter branches here.
  getPaymentsProviderName();
  return createEmulatorProvider({
    subscriptions: deps.subscriptions,
    secret: getPaymentsWebhookSecret(),
  });
}
