// apps/dashboard/components/ds — StatusBadge (dashboard tasks.md §6.4,
// DESIGN.md). The single rendering point for a booking's status pill —
// every other component (RequestCard, HallMap's seat tooltip, the pending
// queue) renders a status through THIS component, never by hand-rolling
// its own color lookup.
//
// TYPED THROWING STUB — red state for tasks.md §6.4's red half.

import type { BookingStatus } from "@kamerton/lib/src/dashboard/hall-status.ts";
import { Badge } from "./Badge.tsx";
import { Icon } from "./Icon.tsx";
import { statusTone } from "./statusTone.ts";

export interface StatusBadgeProps {
  status: BookingStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = statusTone(status);
  return (
    <Badge bg={tone.bg} fg={tone.fg}>
      <Icon name={tone.icon} size={14} />
      {tone.label}
    </Badge>
  );
}
