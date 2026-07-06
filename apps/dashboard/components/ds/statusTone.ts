// apps/dashboard/components/ds — statusTone (dashboard tasks.md §6.4,
// DESIGN.md "Icons — Lucide": "Booking statuses must go through
// `StatusBadge` — the single source of truth mapping
// `pending/confirmed/declined/cancelled` to icon + colour."). Pure, no JSX
// — `StatusBadge.tsx` is the only consumer, but keeping this mapping
// framework-free-in-spirit (plain data, testable without rendering) makes
// the four-case test in `StatusBadge.test.tsx` a simple data assertion
// rather than a DOM query for each case.
//
// TYPED THROWING STUB — red state for tasks.md §6.4's red half.

import type { BookingStatus } from "@kamerton/lib/src/dashboard/hall-status.ts";
import type { IconName } from "./Icon.tsx";

export interface StatusTone {
  status: BookingStatus;
  label: string;
  icon: IconName;
  bg: string;
  fg: string;
  solid: string;
}

const LABELS: Record<BookingStatus, string> = {
  pending: "Очікує",
  confirmed: "Підтверджено",
  declined: "Відхилено",
  cancelled: "Скасовано",
};

const ICONS: Record<BookingStatus, IconName> = {
  pending: "pending",
  confirmed: "confirmed",
  declined: "declined",
  cancelled: "cancelled",
};

export function statusTone(status: BookingStatus): StatusTone {
  return {
    status,
    label: LABELS[status],
    icon: ICONS[status],
    bg: `var(--status-${status}-bg)`,
    fg: `var(--status-${status}-fg)`,
    solid: `var(--status-${status}-solid)`,
  };
}
