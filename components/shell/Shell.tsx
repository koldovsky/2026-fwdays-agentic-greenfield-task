// Shared app shell (server component) — FR-SHELL-01, FR-SHELL-02a, FR-DS-05,
// NFR-USA-01, NFR-COMPAT-01, NFR-A11Y-04.
// One navigational/visual frame for the whole app on the «Поливайко» tokens: a
// header with the brand wordmark, a nav with a <Link> to the plant list (`/`),
// and the active view rendered as children. Single paper theme — NO theme
// toggle, NO ThemeProvider (FR-SHELL-02a). Responsive ≥ 360 px.

import Link from "next/link";

import { WaterDropIcon } from "@/components/icons";
import { uk } from "@/lib/i18n/uk";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-paper text-ink">
      <header className="border-b border-border bg-cloud">
        <nav
          aria-label={uk.brand}
          className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-sm font-display text-xl font-bold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          >
            <span className="text-forest" aria-hidden="true">
              <WaterDropIcon size={22} />
            </span>
            {uk.brand}
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-sm font-body text-sm font-semibold text-stone transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              {uk.nav.plants}
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
