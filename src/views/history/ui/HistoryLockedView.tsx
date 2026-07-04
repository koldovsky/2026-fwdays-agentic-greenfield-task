// History paid-gate view (add-tailoring-history, FR-TAILOR-04). History is a
// paid feature; a signed-in free user reaching /history sees this upgrade
// surface instead of a broken link or an empty list. Presentational; the route
// decides when to render it. Design-system tokens only (DESIGN.md).
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";

export interface HistoryLockedViewProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function HistoryLockedView({ locale = "ua" }: HistoryLockedViewProps) {
  const copy = t(locale).history;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="rounded-xl border border-hairline bg-white p-8 shadow-card">
        <h1 className="font-display text-2xl tracking-tight text-ink">{copy.lockedTitle}</h1>
        <p className="mt-3 font-body text-base text-ink-soft leading-normal">{copy.lockedLead}</p>
        <div className="mt-6">
          <Button href="/account/billing" variant="primary" size="md">
            {copy.lockedCta}
          </Button>
        </div>
      </div>
    </main>
  );
}
