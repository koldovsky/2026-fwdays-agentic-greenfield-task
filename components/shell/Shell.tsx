// Shared app shell (server component, design.md D1) — FR-SHELL-01,
// NFR-USA-01, NFR-COMPAT-01, NFR-A11Y-04.
// One navigational/visual frame for the whole app: a header with the app title,
// a nav with a <Link> to the plant list (`/`), the theme toggle (client
// island), and the active view rendered as children. No client JS for the nav
// itself — only the toggle is a client boundary. Responsive ≥ 360 px.

import Link from "next/link";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { uk } from "@/lib/i18n/uk";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <nav
          aria-label={uk.appTitle}
          className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <Link
            href="/"
            className="rounded-sm text-lg font-semibold text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:text-zinc-50"
          >
            {uk.appTitle}
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-sm text-sm font-medium text-zinc-700 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              {uk.nav.plants}
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
