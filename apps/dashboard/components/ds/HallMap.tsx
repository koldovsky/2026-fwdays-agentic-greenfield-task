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

const SEAT_STATUS_CLASSES: Record<HallMapSeat["status"], string> = {
  free: "border border-border bg-surface hover:bg-surface-hover",
  pending: "border border-transparent bg-status-pending text-[color:var(--status-pending-fg)]",
  confirmed: "border border-transparent bg-status-confirmed text-[color:var(--status-confirmed-fg)]",
  cancelled: "border border-transparent bg-status-cancelled text-[color:var(--status-cancelled-fg)]",
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
      <div role="table" aria-label="Розклад залу на тиждень" className="flex flex-col gap-1.5">
        {WEEKDAYS.map((weekday) => {
          const rowSeats = seats.filter((seat) => seat.weekday === weekday);
          return (
            <div role="row" key={weekday} className="flex items-center gap-1.5">
              <span className="w-7 shrink-0 font-mono text-xs text-text-secondary">{WEEKDAY_LABELS[weekday]}</span>
              {rowSeats.map((seat) => {
                const entry = entryForSeat(pendingQueue, seat);
                const label = `${WEEKDAY_LABELS[weekday]} ${String(seat.hour).padStart(2, "0")}:00 — ${STATUS_LABELS[seat.status]}${entry?.studentName ? `, ${entry.studentName}` : ""}`;
                return (
                  <button
                    key={`${seat.weekday}-${seat.hour}`}
                    type="button"
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
