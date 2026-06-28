import Link from "next/link";
import { uk } from "@/lib/i18n/uk";
import { TopClock } from "./top-clock/TopClock";
import { ThemeToggle } from "./ThemeToggle";

// Логотип Надворі — sun-over-horizon mark built from semantic brand tokens so
// it adapts to light/dark, paired with the wordmark + system subtitle.
function Logo() {
  return (
    <Link
      href="/"
      className="flex cursor-pointer items-center gap-3 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ring] rounded-md"
      aria-label={uk.app.name}
    >
      <span
        aria-hidden
        className="relative block size-9 flex-none overflow-hidden rounded-[11px] shadow-xs"
      >
        <span className="absolute inset-0 bg-brand" />
        <span className="absolute left-1/2 top-[8px] size-4 -translate-x-1/2 rounded-full bg-accent" />
        <span className="absolute inset-x-0 bottom-0 h-3 bg-brand-active" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-md font-bold leading-none tracking-[-0.01em] text-text">
          {uk.app.name}
        </span>
        <span className="text-[9.5px] font-semibold leading-none uppercase tracking-[0.08em] text-text-faint">
          {uk.app.tagline}
        </span>
      </span>
    </Link>
  );
}

// Top bar / banner (FR-SHELL-01): logo + wordmark on the left, header clock
// slot and theme toggle on the right. Sticky, blurred, calm.
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border-subtle bg-surface/80 px-[22px] py-3.5 backdrop-blur-md">
      <Logo />
      <div className="flex items-center gap-3.5">
        <div aria-label={uk.regions.clock} data-slot="header-clock" className="min-w-[64px]">
          <TopClock />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
