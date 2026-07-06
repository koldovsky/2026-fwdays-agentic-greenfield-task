// apps/dashboard/components/ds — Chip (dashboard tasks.md §6.3). A small,
// bordered pill for tags/filters — `SlotChip` (§6.5) is built on top of
// this for weekday+mono-time slot tickets.

import type { ButtonHTMLAttributes } from "react";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active = false, className = "", children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-sm
        transition-colors duration-[var(--duration-fast)]
        ${active ? "border-brand bg-brand-soft text-text" : "border-border bg-surface text-text-secondary hover:bg-surface-hover"}
        ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
