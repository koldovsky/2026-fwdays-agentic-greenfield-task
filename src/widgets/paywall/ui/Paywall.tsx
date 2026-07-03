// paywall widget (add-payments-emulator task 2.1, FR-PAYWALL-01/02). A calm
// inline panel that appears where a gated action was attempted — the export
// step or a tailoring past the free limit — and offers the two purchasable
// plans via features/upgrade. It carries NO limit logic of its own: the
// tailoring limit is enforced server-side (/api/tailor emits `rate_limited`,
// NFR-COST-02) and export entitlement is resolved server-side; views open
// this panel in response. Dismissing it leaves the action blocked.
import { UpgradePlans } from "@/features/upgrade";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";

/** Which gated action surfaced the paywall (FR-PAYWALL-01). */
export type PaywallReason = "export" | "tailoring-limit";

export interface PaywallProps {
  readonly reason: PaywallReason;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /** Return path handed to checkout (FR-PAYWALL-03); defaults to the current screen. */
  readonly returnTo?: string;
  /** Close the panel — the gated action simply stays gated. */
  readonly onDismiss?: () => void;
  /** Navigation seam passed through to the plan chooser (tests). */
  readonly navigate?: (path: string) => void;
}

export function Paywall({ reason, locale = "ua", returnTo, onDismiss, navigate }: PaywallProps) {
  const copy = t(locale);
  return (
    <section
      role="region"
      aria-label={copy.paywall.regionLabel}
      className="rounded-xl border border-hairline bg-surface-card p-6 shadow-card"
    >
      <h2 className="font-display text-xl text-ink">{copy.paywall.title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        {reason === "export" ? copy.paywall.exportLead : copy.paywall.limitLead}
      </p>

      <div className="mt-5">
        <UpgradePlans locale={locale} returnTo={returnTo} navigate={navigate} />
      </div>

      {onDismiss !== undefined && (
        <div className="mt-4">
          <Button
            label={copy.paywall.dismissAction}
            variant="ghost"
            size="sm"
            onClick={onDismiss}
          />
        </div>
      )}
    </section>
  );
}
