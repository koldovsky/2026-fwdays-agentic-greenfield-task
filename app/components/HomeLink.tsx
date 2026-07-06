"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { strings } from "@/lib/strings";

// Explicit labeled way back to the landing page from any sub-route
// (shell: header home navigation control). Hidden on `/` to avoid a redundant
// self-link — the logo remains the home affordance there.
export function HomeLink() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <Link
      href="/"
      className="rounded-md border border-border px-3.5 py-2 font-sans text-small font-medium text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      {strings.nav.home}
    </Link>
  );
}
