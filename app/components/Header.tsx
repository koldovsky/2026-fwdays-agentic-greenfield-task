import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { HomeLink } from "./HomeLink";

// Quiet, sticky top bar on the surface color (FR-SHELL-03). The explicit Home
// control sits before the theme toggle and hides itself on the landing page.
export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
        <Logo />
        <div className="flex items-center gap-3">
          <HomeLink />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
