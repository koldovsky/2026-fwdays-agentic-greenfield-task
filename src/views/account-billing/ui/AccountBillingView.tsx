// account-billing view — route-level composition for /account/billing
// (add-payments-emulator tasks 3.1–3.3, FR-BILLING-01). Server-renderable:
// the route resolves the session + subscription snapshot and passes them
// down; all interaction (cancel, upgrade) lives inside the widgets.
import type { SubscriptionAccess } from "@/entities/subscription";
import { t, type Locale } from "@/shared/lib/i18n";
import { BillingPortal } from "@/widgets/billing-portal";

export interface AccountBillingViewProps {
  /** Server-resolved subscription snapshot; null = never paid (Free). */
  readonly subscription: SubscriptionAccess | null;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function AccountBillingView({ subscription, locale = "ua" }: AccountBillingViewProps) {
  const copy = t(locale);
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl tracking-tight text-ink">{copy.billing.title}</h1>
      <p className="mb-8 mt-2 max-w-2xl font-body text-base text-ink-soft">{copy.billing.lead}</p>
      <BillingPortal subscription={subscription} locale={locale} />
    </main>
  );
}
