// auth view — route-level composition for /sign-in (FR-AUTH-01). The form
// carries the page heading (it switches between sign-in and sign-up modes);
// this view provides the layout and the anonymous-access reassurance line
// (FR-ONBOARD-01).
import { SignInForm } from "@/features/sign-in";
import { t, type Locale } from "@/shared/lib/i18n";

export interface SignInViewProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function SignInView({ locale = "ua" }: SignInViewProps) {
  const copy = t(locale);
  return (
    <section className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-hairline bg-surface-card p-6 shadow-card sm:p-8">
        <SignInForm locale={locale} />
      </div>
      <p className="mt-4 text-center text-sm text-ink-soft">{copy.auth.lead}</p>
    </section>
  );
}
