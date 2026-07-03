"use client";

// upgrade feature — the plan chooser (add-payments-emulator task 2.1,
// FR-PAYWALL-02): Pro and Job-hunt Pass side by side; the user picks a plan
// BEFORE entering checkout. Choosing a plan creates a checkout session for
// the current screen's returnTo (FR-PAYWALL-03) and navigates to it; an
// anonymous caller is routed to sign-in instead. Pricing copy comes from the
// shared dictionary and matches the landing pricing table (FR-SALES-03).
import { useState } from "react";
import { t, type Locale } from "@/shared/lib/i18n";
// Type-only import: shared/lib/payments' runtime code is server-side
// (node:crypto); the client only needs the plan union.
import type { PaymentsPlan } from "@/shared/lib/payments";
import { Button } from "@/shared/ui";
import { startCheckout } from "../api/start-checkout";

const PLANS: readonly PaymentsPlan[] = ["pro", "job_hunt_pass"];

export interface UpgradePlansProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /**
   * Site-relative path to return to after a successful checkout
   * (FR-PAYWALL-03). Defaults to the current location so the user lands back
   * on exactly the screen they left. Validated again server-side.
   */
  readonly returnTo?: string;
  /** Navigation seam — injectable in tests; defaults to a full page load. */
  readonly navigate?: (path: string) => void;
}

export function UpgradePlans({
  locale = "ua",
  returnTo,
  navigate = (path) => window.location.assign(path),
}: UpgradePlansProps) {
  const copy = t(locale);
  const [pendingPlan, setPendingPlan] = useState<PaymentsPlan | null>(null);
  const [failed, setFailed] = useState(false);

  async function choose(plan: PaymentsPlan) {
    setPendingPlan(plan);
    setFailed(false);
    // Default to the exact screen the user is on (path + query, never origin
    // or hash) — the server rejects anything that is not a same-origin path.
    const target = returnTo ?? `${window.location.pathname}${window.location.search}`;
    const result = await startCheckout(plan, target);
    if (result.ok) {
      navigate(result.checkoutUrl);
      return;
    }
    if (result.code === "unauthenticated") {
      // Checkout needs an account (subscriptions are per-user); sign-in first.
      navigate("/sign-in");
      return;
    }
    setPendingPlan(null);
    setFailed(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan}
            className="flex flex-col rounded-xl border border-hairline bg-surface-card p-5"
          >
            <div className="font-display text-md font-semibold text-ink">
              {copy.checkout.planName[plan]}
            </div>
            <div className="mt-1 text-sm text-ink-muted">{copy.checkout.planPrice[plan]}</div>
            <p className="mb-4 mt-2 text-sm text-ink-soft">{copy.upgrade.planFeature[plan]}</p>
            <div className="mt-auto">
              <Button
                label={copy.upgrade.chooseAction[plan]}
                size="sm"
                variant={plan === "pro" ? "primary" : "secondary"}
                disabled={pendingPlan !== null}
                onClick={() => void choose(plan)}
              />
            </div>
          </div>
        ))}
      </div>

      {pendingPlan !== null && (
        <p role="status" className="text-sm text-ink-soft">
          {copy.upgrade.pending}
        </p>
      )}
      {failed && (
        <p role="alert" className="text-sm text-gap-text">
          {copy.upgrade.error}
        </p>
      )}
    </div>
  );
}
