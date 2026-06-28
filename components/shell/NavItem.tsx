"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { isActiveNavItem } from "@/lib/nav/cabinet-nav";

/**
 * A sidebar navigation row (FR-SHELL-01, NFR-A11Y-01/02). Client component
 * because it reads the live pathname to mark the active item.
 *
 * The active state is conveyed three ways so it never relies on colour alone:
 * `aria-current="page"` (assistive tech), a left accent indicator bar, and a
 * medium font weight. A Lucide outline icon inherits `currentColor`. The shared
 * 2px accent focus ring applies on keyboard focus.
 */
export function NavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
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
      <Icon aria-hidden="true" size={16} strokeWidth={1.8} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
