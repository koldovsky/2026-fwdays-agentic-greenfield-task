"use client";

// billing-portal widget (add-payments-emulator tasks 3.1–3.3, FR-BILLING-01/
// 02/03): current plan, next renewal, invoice history, cancel. Three states:
// - active paid   → plan + renewal/expiry date + invoices + cancel button
// - canceled      → access-until date + downgrade-at-period-end note; no
//                   cancel button (already canceled), invoices kept
// - free          → calm note + the plan chooser as the retry/upgrade CTA
//                   (FR-BILLING-03: a failed payment wrote nothing, so the
//                   user simply IS free here — no partial-access state)
// The widget never writes subscription state: cancel goes through the api
// segment → provider → webhook path, then refreshes the server-resolved page.
import { useState } from "react";
import { hasPaidAccess, type SubscriptionAccess } from "@/entities/subscription";
import { UpgradePlans } from "@/features/upgrade";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";
import { cancelSubscription, type CancelSubscriptionResult } from "../api/cancel-subscription";
import { deriveInvoices } from "../lib/invoices";

export interface BillingPortalProps {
  /** Server-resolved subscription snapshot; null = never paid (Free). */
  readonly subscription: SubscriptionAccess | null;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /** Cancellation seam — injectable in tests; defaults to the real api call. */
  readonly cancel?: () => Promise<CancelSubscriptionResult>;
  /** Refresh seam after a successful cancel — the server re-renders the new state. */
  readonly refresh?: () => void;
  /** Injectable clock for deterministic entitlement checks in tests. */
  readonly now?: () => Date;
}

/** Deterministic, locale-free date display (YYYY-MM-DD) — calm and unambiguous. */
function formatIsoDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

type CancelPhase = "idle" | "pending" | "error";

export function BillingPortal({
  subscription,
  locale = "ua",
  cancel = cancelSubscription,
  refresh = () => window.location.reload(),
  now = () => new Date(),
}: BillingPortalProps) {
  const copy = t(locale);
  const [cancelPhase, setCancelPhase] = useState<CancelPhase>("idle");

  const paid = hasPaidAccess(subscription, now().toISOString());
  const canceled = paid && subscription !== null && subscription.status === "canceled";
  // Display plan: what the user effectively has RIGHT NOW (FR-BILLING-02 — a
  // lapsed or failed payment means Free, never a partial state).
  const effectivePlan = paid && subscription !== null ? subscription.plan : "free";
  const invoices = deriveInvoices(subscription);

  async function handleCancel() {
    setCancelPhase("pending");
    const result = await cancel();
    if (result === "ok") {
      // Subscription state changed server-side (webhook path); re-render it.
      refresh();
      return;
    }
    setCancelPhase("error");
  }

  const periodEnd = subscription?.currentPeriodEnd ?? null;
  const dateLabel = canceled
    ? copy.billing.accessUntilLabel
    : effectivePlan === "pro"
      ? copy.billing.renewsOnLabel
      : copy.billing.expiresOnLabel;

  return (
    <section
      aria-label={copy.billing.title}
      className="flex flex-col gap-6 rounded-xl border border-hairline bg-surface-card p-6 shadow-card sm:p-8"
    >
      <div>
        <div className="text-sm text-ink-soft">{copy.billing.currentPlanLabel}</div>
        <div data-testid="current-plan-name" className="mt-1 font-display text-2xl text-ink">
          {copy.billing.planName[effectivePlan]}
        </div>
        {effectivePlan !== "free" && (
          <div className="text-sm text-ink-muted">{copy.checkout.planPrice[effectivePlan]}</div>
        )}

        {paid && periodEnd !== null && (
          <dl className="mt-4 rounded-md border border-hairline bg-surface-canvas p-4">
            <dt className="text-sm text-ink-soft">{dateLabel}</dt>
            <dd className="mt-1 font-mono text-base text-ink">{formatIsoDate(periodEnd)}</dd>
          </dl>
        )}

        {canceled && <p className="mt-3 max-w-2xl text-sm text-ink-soft">{copy.billing.canceledNote}</p>}

        {!paid && (
          <p className="mt-3 max-w-2xl text-sm text-ink-soft">{copy.billing.freeNote}</p>
        )}
      </div>

      {/* Cancel — only an active (not yet canceled) paid subscription offers it. */}
      {paid && !canceled && (
        <div>
          <Button
            label={copy.billing.cancelAction}
            variant="secondary"
            size="sm"
            disabled={cancelPhase === "pending"}
            onClick={() => void handleCancel()}
          />
          {cancelPhase === "pending" && (
            <p role="status" className="mt-2 text-sm text-ink-soft">
              {copy.billing.cancelPending}
            </p>
          )}
          {cancelPhase === "error" && (
            <p role="alert" className="mt-2 text-sm text-gap-text">
              {copy.billing.cancelError}
            </p>
          )}
        </div>
      )}

      {/* Free state: the plan chooser doubles as the retry CTA (FR-BILLING-03). */}
      {!paid && (
        <div>
          <h2 className="mb-3 font-display text-lg text-ink">{copy.billing.upgradeTitle}</h2>
          <UpgradePlans locale={locale} returnTo="/account/billing" />
        </div>
      )}

      <div>
        <h2 className="font-display text-lg text-ink">{copy.billing.invoicesTitle}</h2>
        {invoices.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">{copy.billing.noInvoices}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex items-center justify-between rounded-md border border-hairline bg-surface-canvas px-4 py-3 text-sm"
              >
                <span className="font-mono text-ink">{formatIsoDate(invoice.issuedAt)}</span>
                <span className="text-ink-soft">{copy.billing.planName[invoice.plan]}</span>
                <span className="text-ink">{`$${invoice.amountUsd}`}</span>
                <span className="text-met">{copy.billing.invoicePaidLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
