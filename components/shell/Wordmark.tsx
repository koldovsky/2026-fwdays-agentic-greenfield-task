import Link from "next/link";

/**
 * The Kolo360 wordmark (BC-BRAND-01). Inter 600, links to the cabinet home
 * (`/cycles`). Server-renderable; carries an accessible name and the shared
 * 2px accent focus ring.
 */
export function Wordmark() {
  return (
    <Link
      href="/cycles"
      aria-label="Kolo360"
      className="focus-ring inline-flex items-center rounded-[var(--radius-sm)] text-[var(--text-lg)] font-[var(--weight-semibold)] tracking-tight text-ink no-underline"
    >
      Kolo360
    </Link>
  );
}
