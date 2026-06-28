"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveNavItem, type CabinetNavKey } from "@/lib/nav/cabinet-nav";
import { navIcon } from "@/components/shell/nav-icons";

/**
 * A sidebar navigation row (FR-SHELL-01, NFR-A11Y-01/02). Client component
 * because it reads the live pathname to mark the active item.
 *
 * The active state is conveyed three ways so it never relies on colour alone:
 * `aria-current="page"` (assistive tech), a left accent indicator bar, and a
 * medium font weight. A Lucide outline icon inherits `currentColor`. The shared
 * 2px accent focus ring applies on keyboard focus.
 *
 * The icon is resolved here from the pure `navKey` (a string) rather than passed
 * in as a component: a server parent cannot serialise a React component function
 * across the server -> client boundary, so only the key crosses it.
 */
export function NavItem({
  href,
  label,
  navKey,
}: {
  href: string;
  label: string;
  navKey: CabinetNavKey;
}) {
  const pathname = usePathname();
  const active = isActiveNavItem(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "focus-ring relative flex items-center gap-[var(--space-4)] rounded-[var(--radius-sm)] " +
        "py-[var(--space-4)] pr-[var(--space-6)] pl-[var(--space-7)] no-underline " +
        "transition-colors duration-[var(--motion-fast)] " +
        (active
          ? "bg-[var(--green-tint-3)] font-[var(--weight-medium)] text-accent"
          : "font-[var(--weight-regular)] text-ink-muted hover:bg-[var(--line-faint)]")
      }
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute top-[var(--space-3)] bottom-[var(--space-3)] left-0 w-[3px] rounded-r-[var(--radius-pill)] bg-accent"
        />
      ) : null}
      {navIcon(navKey)}
      <span className="truncate">{label}</span>
    </Link>
  );
}
