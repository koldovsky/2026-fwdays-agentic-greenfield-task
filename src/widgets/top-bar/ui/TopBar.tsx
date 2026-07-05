// Application top bar (FR-SHELL-01): logo, primary nav, session area. The
// session user arrives as a prop resolved by the route (app layer) so this
// widget stays server-renderable and below the app boundary; sign-out is the
// client control from features/sign-in.
import Link from "next/link";
import { LanguageSwitch } from "@/features/language-switch";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";
import { AccountMenu } from "./AccountMenu";

export interface TopBarUser {
  readonly name?: string | null;
  readonly email?: string | null;
}

export interface TopBarProps {
  /** Signed-in user, or null when anonymous. */
  readonly user?: TopBarUser | null;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /**
   * Show the marketing nav (Features / Pricing) anchors. Landing-only — those
   * anchors point at landing sections, so off the landing page they would jump
   * the user out of the app shell. Defaults false so app routes never leak them.
   */
  readonly showMarketingNav?: boolean;
}

export function TopBar({ user = null, locale = "ua", showMarketingNav = false }: TopBarProps) {
  const copy = t(locale);
  // First name only — compact, and long Ukrainian names would overflow the row.
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? null;
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-surface-canvas/80 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between px-6">
        <Link
          href="/"
          aria-label={copy.topBar.homeLabel}
          className="flex items-center gap-[10px]"
        >
          <span className="grid h-7 w-7 place-items-center rounded-sm bg-brand font-display text-[17px] font-bold text-white">
            V
          </span>
          <span className="text-md font-semibold tracking-normal text-ink">Vouch</span>
        </Link>

        {showMarketingNav && (
          <nav aria-label="Primary" className="hidden items-center gap-7 sm:flex">
            <Link href="/#how" className="text-sm text-ink-soft transition-colors hover:text-ink">
              {copy.topBar.navFeatures}
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {copy.topBar.navPricing}
            </Link>
          </nav>
        )}

        {user !== null ? (
          <div className="flex items-center gap-3">
            {firstName !== null && (
              <span
                title={user.name ?? undefined}
                className="hidden max-w-[9rem] truncate text-sm text-ink-soft sm:inline"
              >
                {firstName}
              </span>
            )}
            <LanguageSwitch locale={locale} />
            <AccountMenu user={user} locale={locale} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <LanguageSwitch locale={locale} />
            <Button href="/sign-in" variant="ghost" size="sm">
              {copy.topBar.signIn}
            </Button>
            <Button href="/tailor" variant="primary" size="sm">
              {copy.topBar.tryFree}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
