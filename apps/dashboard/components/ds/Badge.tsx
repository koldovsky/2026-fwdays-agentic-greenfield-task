// apps/dashboard/components/ds — Badge (dashboard tasks.md §6.3). A generic
// pill label; `StatusBadge` (§6.4) is the domain-specific one that maps a
// booking status to the right tone — this one takes an explicit tone so it
// can also be reused for non-status pills later without duplicating markup.

import type { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  bg?: string;
  fg?: string;
}

export function Badge({ bg, fg, className = "", style, children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium ${className}`}
      style={{ backgroundColor: bg, color: fg, ...style }}
      {...props}
    >
      {children}
    </span>
  );
}
