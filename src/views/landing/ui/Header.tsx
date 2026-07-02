// Sticky landing header: brand lock, primary nav, sign-in / try-free CTAs.
// FR-SHELL-03. Server-rendered; links only, no client state.
import { Button } from "@/shared/ui";
import { navLinks } from "../lib/content";
import { Wrap } from "./primitives";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-surface-canvas/80 backdrop-blur-md backdrop-saturate-150">
      <Wrap className="flex h-16 items-center justify-between">
        <a href="#top" aria-label="Vouch home" className="flex items-center gap-[10px]">
          <span className="grid h-7 w-7 place-items-center rounded-sm bg-brand font-display text-[17px] font-bold text-white">
            V
          </span>
          <span className="text-md font-semibold tracking-normal text-ink">Vouch</span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-7 sm:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button href="/sign-in" variant="ghost" size="sm">
            Sign in
          </Button>
          <Button href="/tailor" variant="primary" size="sm">
            Try free
          </Button>
        </div>
      </Wrap>
    </header>
  );
}
