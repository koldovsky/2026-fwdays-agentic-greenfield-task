// Application top bar (FR-SHELL-01): logo, primary nav, session area. The
// session user arrives as a prop resolved by the route (app layer) so this
// widget stays server-renderable and below the app boundary; sign-out is the
// client control from features/sign-in.
import Link from "next/link";
import { SignOutButton } from "@/features/sign-in";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";

export interface TopBarUser {
  readonly name?: string | null;
  readonly email?: string | null;
}

export interface TopBarProps {
  /** Signed-in user, or null when anonymous. */
  readonly user?: TopBarUser | null;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function TopBar({ user = null, locale = "uk" }: TopBarProps) {
  const copy = t(locale);
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

        {user !== null ? (
          <div
            role="group"
            aria-label={copy.topBar.accountLabel}
            className="flex items-center gap-3"
          >
            <span className="max-w-[200px] truncate text-sm text-ink-soft">
              {user.name ?? user.email}
            </span>
            <SignOutButton locale={locale} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
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
