// TYPED THROWING STUB — red state for tasks.md section 4 (4.2's red half).
// The signatures and types below are the contract pinned by hold.test.ts;
// the bodies are implemented in tasks.md section 4 (4.2's green half). No
// logic lives here yet — every function body is a single Not-implemented
// throw (same convention as the section-2/3 red round).
//
// Framework-free pure core (TC-PURE-01): the only I/O this module performs
// is through the injected `CalendarPort` — never a concrete SDK/MCP client,
// never SQLite directly (bookings persistence is a caller concern, owned by
// its own module per AGENTS.md).
//
// CONTRACT:
//   createHold(port, request) -> Promise<HoldResult>
//     1. Converts `request.slot` (Europe/Kyiv wall-clock local, half-open
//        [start, end)) to RFC3339 UTC via timezone.ts's
//        `kyivWallClockToUtc` — this module is where that conversion
//        happens, never inside a `CalendarPort` implementation (design.md
//        Decision 1/3).
//     2. Re-checks `port.freeBusy()` for exactly that interval and converts
//        the result back to Kyiv-local via `utcToKyivWallClock`.
//     3. Reuses `overlaps()` from subtract.ts (design.md Decision 4 — one
//        shared predicate, never re-derived) to detect a collision against
//        the freshly-fetched busy list (a manually-created event, or
//        another lead's now-existing tentative event — same code path for
//        both per spec.md's hold-race scenario).
//     4. On collision: returns `{ status: "collision" }`. No
//        `createTentative` call is made; no booking transitions to
//        `pending` (the caller owns that transition).
//     5. On no collision: calls `port.createTentative(...)` and returns
//        `{ status: "held", eventId }`.
//   releaseHold(port, eventId) -> Promise<void>
//     Deletes the tentative event via `port.deleteEvent(eventId)` — used on
//     hold-cancel/decline (FR-SLOT-02); no automatic expiry ever calls this
//     on its own (spec.md "Holds never expire automatically").

import type { Slot } from "./grid.ts";
import { CalendarApiError, type CalendarPort } from "./calendar-port.ts";
import { overlaps } from "./subtract.ts";
import { kyivWallClockToUtc, utcToKyivWallClock } from "./timezone.ts";

/** A hold request in Europe/Kyiv wall-clock local time, same `Slot` shape
 *  used across grid/subtract/rank/widen — this module is the boundary that
 *  converts to/from the `CalendarPort`'s RFC3339 UTC strings. */
export interface HoldRequest {
  slot: Slot;
  summary: string;
  description?: string;
}

/** Discriminated result — `"collision"` carries no `eventId` because none
 *  was created (spec.md: "no tentative event is created and the booking
 *  does not move to pending" on both the manual-event and hold-race
 *  variants of this scenario). */
export type HoldResult = { status: "held"; eventId: string } | { status: "collision" };

export async function createHold(
  port: CalendarPort,
  request: HoldRequest,
): Promise<HoldResult> {
  const range = {
    start: kyivWallClockToUtc(request.slot.start),
    end: kyivWallClockToUtc(request.slot.end),
  };

  const busyUtc = await port.freeBusy(range);
  const busyKyiv = busyUtc.map((interval) => ({
    start: utcToKyivWallClock(interval.start),
    end: utcToKyivWallClock(interval.end),
  }));

  const collides = busyKyiv.some((busy) => overlaps(request.slot, busy));
  if (collides) {
    return { status: "collision" };
  }

  const { eventId } = await port.createTentative(range, request.summary, request.description);
  return { status: "held", eventId };
}

export async function releaseHold(port: CalendarPort, eventId: string): Promise<void> {
  try {
    await port.deleteEvent(eventId);
  } catch (error) {
    // booking-hitl design.md Decision 6, item 2: a 404/410 means the event
    // is already gone — treat as an already-satisfied delete, not a
    // failure. Every other CalendarError still propagates unchanged.
    if (error instanceof CalendarApiError && (error.status === 404 || error.status === 410)) {
      return;
    }
    throw error;
  }
}
