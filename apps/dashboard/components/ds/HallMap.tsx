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
import type { ConfirmedBooking, HallMapSeat, PendingQueueEntry } from "../../lib/dashboard-state.ts";
import { RequestCard } from "./RequestCard.tsx";

export interface HallMapProps {
  seats: HallMapSeat[];
  pendingQueue: PendingQueueEntry[];
  /** Confirmed bookings for the week's seats — lets a CONFIRMED seat open a
   *  read-only detail card on click (a pending seat opens its DecisionBar
   *  card; a free/cancelled seat opens nothing). */
  confirmedBookings?: ConfirmedBooking[];
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
// A live BOOKING_PENDING event carries only {requestId, bookingId} (no
// slotStart), so a merged pending entry's slotStart can be undefined — guard
// the prefix match so it is skipped, never dereferenced (admin-crash
// regression: "Cannot read properties of undefined (reading 'startsWith')").
function entryForSeat(pendingQueue: PendingQueueEntry[], seat: HallMapSeat): PendingQueueEntry | undefined {
  return pendingQueue.find((entry) => typeof entry.slotStart === "string" && entry.slotStart.startsWith(seat.slotStartIso));
}

/** The confirmed booking on a seat, matched the same timezone-safe way as
 *  `entryForSeat` (string-prefix on the seat's fixed-width local slot start). */
function confirmedForSeat(confirmedBookings: ConfirmedBooking[], seat: HallMapSeat): ConfirmedBooking | undefined {
  return confirmedBookings.find(
    (booking) => typeof booking.slotStart === "string" && booking.slotStart.startsWith(seat.slotStartIso),
  );
}

export function HallMap({ seats, pendingQueue, confirmedBookings = [] }: HallMapProps) {
  const [openSeatKey, setOpenSeatKey] = useState<string | null>(null);

  function handleSeatClick(seat: HallMapSeat) {
    // A pending seat opens its DecisionBar card; a confirmed seat opens a
    // read-only detail card; free/cancelled seats open nothing.
    if (seat.status === "pending" && entryForSeat(pendingQueue, seat) === undefined) return;
    if (seat.status === "confirmed" && confirmedForSeat(confirmedBookings, seat) === undefined) return;
    if (seat.status !== "pending" && seat.status !== "confirmed") return;
    setOpenSeatKey(`${seat.weekday}-${seat.hour}`);
  }

  const openSeat = openSeatKey !== null ? seats.find((s) => `${s.weekday}-${s.hour}` === openSeatKey) : undefined;
  const openEntry = openSeat !== undefined ? entryForSeat(pendingQueue, openSeat) : undefined;
  const openConfirmed =
    openSeat !== undefined && openSeat.status === "confirmed" ? confirmedForSeat(confirmedBookings, openSeat) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div role="grid" aria-label="Розклад залу на тиждень" className="flex flex-col gap-1.5">
        {WEEKDAYS.map((weekday) => {
          const rowSeats = seats.filter((seat) => seat.weekday === weekday);
          // The row's calendar date (DD.MM) — every seat in the row shares it;
          // shown under the weekday so a seat's real date is never ambiguous
          // (a booking is "Ср 15:00" AND "08.07", not just "some Wednesday").
          const rowIso = rowSeats[0]?.slotStartIso ?? "";
          const rowDate = rowIso.length >= 10 ? `${rowIso.slice(8, 10)}.${rowIso.slice(5, 7)}` : "";
          return (
            <div role="row" key={weekday} className="flex items-center gap-1.5">
              <span role="rowheader" className="flex w-12 shrink-0 flex-col font-mono text-xs leading-tight text-text-secondary">
                <span>{WEEKDAY_LABELS[weekday]}</span>
                {rowDate ? <span className="text-[10px] text-text-muted">{rowDate}</span> : null}
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
      ) : openConfirmed !== undefined ? (
        <RequestCard
          fields={{ ...EMPTY_REQUEST_CARD_FIELDS, studentName: openConfirmed.studentName, studentAge: openConfirmed.studentAge }}
          requestId={openConfirmed.requestId}
          status="confirmed"
          bookedSlotStart={openConfirmed.slotStart}
        />
      ) : null}
    </div>
  );
}
