// account-profile view — route-level composition for /account/profile
// (FR-SHELL-01, FR-BILLING-01, NFR-GDPR-01/02). Server-renderable: the route
// resolves the session user + subscription snapshot and passes them down; the
// only interactive piece is the delete-profile feature. Identity + plan are
// read-only here; subscription management lives on /account/billing.
import Link from "next/link";
import { DeleteAccountButton } from "@/features/delete-profile";
import { ExportDataButton } from "@/features/export-data-button";
import type { Plan, SubscriptionAccess } from "@/entities/subscription";
import { t, type Locale } from "@/shared/lib/i18n";
import type { TopBarUser } from "@/widgets/top-bar";

export interface AccountProfileViewProps {
  /** Signed-in user, resolved by the route. */
  readonly user: TopBarUser;
  /** Server-resolved subscription snapshot; null = never paid (Free). */
  readonly subscription: SubscriptionAccess | null;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

const cardClass = "rounded-xl border border-hairline bg-white p-6 shadow-card";
const fieldLabelClass = "text-xs uppercase tracking-eyebrow text-ink-faint";

export function AccountProfileView({ user, subscription, locale = "ua" }: AccountProfileViewProps) {
  const copy = t(locale);
  const profile = copy.profile;
  const plan: Plan = subscription?.plan ?? "free";
  const planName = copy.billing.planName[plan];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl tracking-tight text-ink">{profile.title}</h1>
      <p className="mb-8 mt-2 font-body text-base text-ink-soft">{profile.lead}</p>

      <div className="flex flex-col gap-6">
        {/* Identity */}
        <section className={cardClass}>
          <dl className="flex flex-col gap-4">
            {user.name != null && user.name !== "" && (
              <div className="flex flex-col gap-1">
                <dt className={fieldLabelClass}>{profile.nameLabel}</dt>
                <dd className="text-base text-ink">{user.name}</dd>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <dt className={fieldLabelClass}>{profile.emailLabel}</dt>
              <dd className="text-base text-ink">{user.email}</dd>
            </div>
          </dl>
        </section>

        {/* Plan summary → subscription page */}
        <section className={cardClass}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className={fieldLabelClass}>{profile.planLabel}</span>
              <span className="text-base font-semibold text-ink">{planName}</span>
            </div>
            <Link
              href="/account/billing"
              className="whitespace-nowrap text-sm font-semibold text-brand transition-opacity hover:opacity-80"
            >
              {profile.viewSubscription}
              <span aria-hidden="true"> →</span>
            </Link>
          </div>
        </section>

        {/* Refer a friend — not built yet, honestly labeled */}
        <section className={cardClass}>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-display text-lg tracking-tight text-ink">{profile.referTitle}</h2>
            <span className="rounded-pill bg-surface-warm px-2 py-0.5 text-xs text-ink-faint">
              {copy.accountMenu.comingSoon}
            </span>
          </div>
          <p className="text-sm text-ink-soft">{profile.referLead}</p>
        </section>

        {/* GDPR self-serve (NFR-GDPR-01/02) */}
        <section className={cardClass}>
          <h2 className="font-display text-lg tracking-tight text-ink">{profile.dataTitle}</h2>
          <p className="mb-4 mt-1 text-sm text-ink-soft">{profile.dataLead}</p>
          <div className="flex flex-col gap-4">
            <ExportDataButton locale={locale} />
            <div className="border-t border-hairline pt-4">
              <DeleteAccountButton locale={locale} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
