import Link from "next/link";
import { strings } from "@/lib/strings";

// The product wordmark: the ⚔ glyph in a terracotta→sage gradient square, the
// one permitted logo mark (BC-BRAND-03). Links home from any route (FR-SHELL-03).
export function Logo() {
  return (
    <Link
      href="/"
      aria-label={strings.a11y.homeLink}
      className="flex items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      <span
        className="grid size-9 place-items-center rounded-lg text-lg text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
        }}
        aria-hidden
      >
        ⚔
      </span>
      <span className="font-sans text-base font-medium tracking-tight">
        {strings.brand.name}
      </span>
    </Link>
  );
}
