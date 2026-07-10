"use client";

// apps/dashboard/components/ds — HallMap (dashboard tasks.md §6.7,
// DESIGN.md's "signature view": the week's schedule as a concert hall —
// weekday rows, hourly-start seats, each seat coloured by the precedence-
// resolved `hallSeatStatus` verdict (`lib/src/dashboard/hall-status.ts`,
// already computed upstream into each `HallMapSeat.status` by
// `dashboard-state.ts`'s `buildStateSnapshot` — this component never
// re-derives status itself, TC-PURE-01's "no ad hoc re-implementation").
//
// Clicking a `pending` seat opens that request's card with the
// `DecisionBar` (baseline spec's HallMap requirement); clicking any other
// seat (free/confirmed/cancelled) opens nothing — administrator-side seat
// booking is not supported in MVP.

import { useState } from "react";
import { EMPTY_REQUEST_CARD_FIELDS } from "../../lib/agui-client.ts";
import type { HallMapSeat, PendingQueueEntry } from "../../lib/dashboard-state.ts";
import { RequestCard } from "./RequestCard.tsx";

export interface HallMapProps {
  seats: HallMapSeat[];
  pendingQueue: PendingQueueEntry[];
}

const WEEKDAY_LABELS: Record<number, string> = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт" };
const WEEKDAYS = [1, 2, 3, 4, 5];

// Status is never carried by hue alone (WCAG 1.4.1 "use of color"): each
// non-free seat also gets its own border STYLE/weight (solid/double/dashed)
// and its own text treatment (bold/line-through), on top of the `-bg` tint,
// so pending/confirmed/cancelled stay told apart for color-vision-deficient
// and low-vision users too, not just by amber/green/slate hue. Free seats
// keep the quiet neutral `--border` outline. Border color reads `-fg` (not
// `-solid`) — `-fg` is the higher-contrast token against its own `-bg` tint
// in both themes, so the border stays clearly visible, not just tinted.
const SEAT_STATUS_CLASSES: Record<HallMapSeat["status"], string> = {
  free: "border border-border bg-surface hover:bg-surface-hover",
  pending:
    "border-2 border-solid border-[color:var(--status-pending-fg)] bg-status-pending text-[color:var(--status-pending-fg)] font-semibold",
  confirmed:
    "border-4 border-double border-[color:var(--status-confirmed-fg)] bg-status-confirmed text-[color:var(--status-confirmed-fg)] font-semibold",
  cancelled:
    "border border-dashed border-[color:var(--status-cancelled-fg)] bg-status-cancelled text-[color:var(--status-cancelled-fg)] line-through decoration-2",
};

const STATUS_LABELS: Record<HallMapSeat["status"], string> = {
  free: "вільно",
  pending: "очікує рішення",
  confirmed: "підтверджено",
  cancelled: "скасовано",
};

/** A `PendingQueueEntry`'s slot start ("...T10:00:00+03:00") always begins
 *  with the seat's own fixed-width local slot start ("...T10:00") — see
 *  `dashboard-state.ts`'s own header comment on why string-prefix matching
 *  is the timezone-safe way to bucket bookings onto seats. */
function entryForSeat(pendingQueue: PendingQueueEntry[], seat: HallMapSeat): PendingQueueEntry | undefined {
  return pendingQueue.find((entry) => entry.slotStart.startsWith(seat.slotStartIso));
}

export function HallMap({ seats, pendingQueue }: HallMapProps) {
  const [openSeatKey, setOpenSeatKey] = useState<string | null>(null);

  function handleSeatClick(seat: HallMapSeat) {
    if (seat.status !== "pending") return; // free/confirmed/cancelled: nothing opens in MVP
    const entry = entryForSeat(pendingQueue, seat);
    if (entry === undefined) return; // no known pending entry for this seat — nothing to show
    setOpenSeatKey(`${seat.weekday}-${seat.hour}`);
  }

  const openSeat = openSeatKey !== null ? seats.find((s) => `${s.weekday}-${s.hour}` === openSeatKey) : undefined;
  const openEntry = openSeat !== undefined ? entryForSeat(pendingQueue, openSeat) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div role="grid" aria-label="Розклад залу на тиждень" className="flex flex-col gap-1.5">
        {WEEKDAYS.map((weekday) => {
          const rowSeats = seats.filter((seat) => seat.weekday === weekday);
          return (
            <div role="row" key={weekday} className="flex items-center gap-1.5">
              <span role="rowheader" className="w-7 shrink-0 font-mono text-xs text-text-secondary">
                {WEEKDAY_LABELS[weekday]}
              </span>
              {rowSeats.map((seat) => {
                // Who is booked on this seat — carried on the seat itself
                // (`occupantName`, the precedence-winning booking's student) so
                // the hover tooltip names them for confirmed seats too, not only
                // the pending ones reachable via `pendingQueue`.
                const label = `${WEEKDAY_LABELS[weekday]} ${String(seat.hour).padStart(2, "0")}:00 — ${STATUS_LABELS[seat.status]}${seat.occupantName ? `, ${seat.occupantName}` : ""}`;
                return (
                  <button
                    key={`${seat.weekday}-${seat.hour}`}
                    type="button"
                    role="gridcell"
                    data-testid="hall-seat"
                    data-status={seat.status}
                    data-seat-key={`${seat.weekday}-${seat.hour}`}
                    aria-label={label}
                    title={label}
                    onClick={() => handleSeatClick(seat)}
                    className={`h-7 w-7 shrink-0 rounded-[var(--radius-sm)] text-[10px] font-mono transition-colors duration-[var(--duration-fast)]
                      ${SEAT_STATUS_CLASSES[seat.status]}
                      ${seat.status === "pending" ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {seat.hour}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {openEntry !== undefined ? (
        <RequestCard
          fields={{ ...EMPTY_REQUEST_CARD_FIELDS, studentName: openEntry.studentName, studentAge: openEntry.studentAge }}
          brief={openEntry.brief}
          requestId={openEntry.requestId}
          status="pending"
          showDecisionBar
        />
      ) : null}
    </div>
  );
}
