"use client";

// checkout view — the emulator's local checkout screen (add-payments-emulator
// task 1.2). Explicit Succeed / Fail actions replace a card form; both deliver
// a signed event to /api/payments/webhook (see ../api/complete.ts), so this
// screen NEVER writes subscription state itself — the webhook handler does.
// On success the user returns to exactly the screen they left (FR-PAYWALL-03);
// on failure they stay Free with calm copy and a retry CTA (FR-BILLING-03).
import Link from "next/link";
import { useState } from "react";
import { t, type Locale } from "@/shared/lib/i18n";
import type { PaymentsPlan } from "@/shared/lib/payments";
import { Button } from "@/shared/ui";
import { completeEmulatedCheckout, type CheckoutOutcome } from "../api/complete";

export interface CheckoutViewProps {
  readonly plan: PaymentsPlan;
  /** Verified site-relative return path (FR-PAYWALL-03). */
  readonly returnTo: string;
  /** Signed checkout-session token, passed back to the emulator endpoint. */
  readonly token: string;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /** Navigation seam — injectable in tests; defaults to a full page load so
   * server components re-read the fresh subscription state. */
  readonly navigate?: (path: string) => void;
}

type Phase = "idle" | "pending" | "redirecting" | "declined" | "error";

export function CheckoutView({
  plan,
  returnTo,
  token,
  locale = "ua",
  navigate = (path) => window.location.assign(path),
}: CheckoutViewProps) {
  const copy = t(locale).checkout;
  const [phase, setPhase] = useState<Phase>("idle");

  async function complete(outcome: CheckoutOutcome) {
    setPhase("pending");
    const result = await completeEmulatedCheckout(token, outcome);
    if (result === "completed") {
      setPhase("redirecting");
      navigate(returnTo);
      return;
    }
    setPhase(result === "declined" ? "declined" : "error");
  }

  const busy = phase === "pending" || phase === "redirecting";

  return (
    <section className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-hairline bg-surface-card p-6 shadow-card sm:p-8">
        <h1 className="font-display text-2xl text-ink">{copy.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{copy.emulatorNotice}</p>

        <dl className="mt-6 rounded-md border border-hairline bg-surface-canvas p-4">
          <dt className="text-sm text-ink-soft">{copy.planLabel}</dt>
          <dd className="mt-1 font-display text-lg text-ink">{copy.planName[plan]}</dd>
          <dd className="text-sm text-ink-soft">{copy.planPrice[plan]}</dd>
        </dl>

        <p className="mt-4 text-xs text-ink-muted">
          {copy.termsPrefix}{" "}
          <Link href="/oferta" className="underline hover:text-ink">
            {copy.termsLink}
          </Link>
        </p>

        {phase === "declined" || phase === "error" ? (
          <div className="mt-6" role="status">
            <p className="text-sm text-ink">
              {phase === "declined" ? copy.declined : copy.error}
            </p>
            <div className="mt-4">
              <Button label={copy.retryAction} variant="secondary" onClick={() => setPhase("idle")} />
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <Button
              label={copy.succeedAction}
              disabled={busy}
              onClick={() => void complete("succeeded")}
            />
            <Button
              label={copy.failAction}
              variant="secondary"
              disabled={busy}
              onClick={() => void complete("failed")}
            />
            {busy ? (
              <p className="text-sm text-ink-soft" role="status">
                {phase === "redirecting" ? copy.redirecting : copy.pending}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
