"use client";

// apps/dashboard/components/ds — Icon (dashboard tasks.md §6.3, DESIGN.md
// "Icons — Lucide"): a calm 1.75 stroke, `currentColor`-inheriting wrapper
// around `lucide-react`. Booking statuses never use this directly — they
// go through `StatusBadge`/`statusTone` (the single source of truth,
// DESIGN.md), which happens to render its icon via this same component.

import type { LucideIcon, LucideProps } from "lucide-react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageCircle,
  MinusCircle,
  Trash2,
  Users,
  WifiOff,
  X,
  XCircle,
} from "lucide-react";

/** The small, closed set of icon names this dashboard actually uses —
 *  deliberately not the whole Lucide catalog, so every call site stays a
 *  plain string literal (easy to grep, easy to keep DESIGN.md's "calm"
 *  vocabulary small). */
const ICONS: Record<string, LucideIcon> = {
  pending: Clock3,
  confirmed: CheckCircle2,
  declined: MinusCircle,
  cancelled: XCircle,
  chat: MessageCircle,
  calendar: CalendarClock,
  seats: Users,
  close: X,
  chevronRight: ChevronRight,
  delete: Trash2,
  offline: WifiOff,
};

export type IconName = keyof typeof ICONS;

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

export function Icon({ name, strokeWidth = 1.75, size = 18, ...props }: IconProps) {
  const LucideComponent = ICONS[name];
  return <LucideComponent strokeWidth={strokeWidth} size={size} aria-hidden="true" {...props} />;
}
