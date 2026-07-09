// TYPED THROWING STUB — red state for tasks.md section 5 (5.1/5.2's red
// half). The signatures, discriminated result types, and the
// CALENDAR_UNAVAILABLE_APOLOGY constant below are the contract pinned by
// propose.test.ts; the bodies are implemented in tasks.md section 5's green
// half. No logic lives here yet — every function body is a single
// Not-implemented throw (same convention as the section-2/3/4 red rounds).
//
// Framework-free pure core (TC-PURE-01): the only I/O either function
// performs is through the injected `CalendarPort` — never a concrete SDK/MCP
// client, never SQLite, never an LLM client. This module owns spec.md's
// "Calendar API failure degrades deterministically" requirement
// (NFR-REL-01): every `CalendarError` thrown by the port, from EITHER a
// free/busy fetch (5.1) or a tentative-event creation (5.2), is caught here
// and turned into the SAME deterministic Ukrainian apology-and-retry
// constant — composed with a plain string literal, no LLM call, no
// branching on error subclass/status (NFR-REL-01, design.md Decision 1's
// "apology copy only ever branches on error class" rule taken to its
// logical end: it doesn't even do that — one apology, always).
//
// CONTRACT:
//   CALENDAR_UNAVAILABLE_APOLOGY: string
//     The exact, deterministic Ukrainian apology-and-retry copy (BC-LANG-01,
//     BC-BRAND-01, DESIGN.md Voice & content rules): kind, no tech jargon
//     (never "API"/"сервер"/"помилка з'єднання"), no pressure vocabulary
//     (never "останнє місце"/"тільки сьогодні"/"поспішайте" — DESIGN.md
//     "No pressure vocabulary"), invites retrying shortly. A plain string
//     literal — computed with zero I/O and zero LLM involvement, so it is
//     available even when the calendar (or any other upstream) is down.
//
//   proposeSlots(port, request) -> Promise<ProposeResult>
//     1. Converts the horizon [request.from 00:00, request.from + request.days
//        00:00) to an RFC3339 UTC range via timezone.ts's
//        `kyivWallClockToUtc` (same adapter-boundary conversion convention
//        as hold.ts).
//     2. Calls `port.freeBusy(range)`. If this rejects with a `CalendarError`
//        (any of the three taxonomy classes — auth/timeout/api, per
//        calendar-port.ts), the function does NOT let the rejection
//        propagate: it returns
//        `{ status: "calendar_unavailable", apology:
//        CALENDAR_UNAVAILABLE_APOLOGY, retainedRequest: request }` — the
//        SAME `request` object the caller passed in, unmodified, so the
//        lead's original preferences/horizon survive for resumption
//        (spec.md "preserves the conversation state ... resumes slot
//        proposal"). A non-`CalendarError` throw is NOT caught here (an
//        unexpected bug should surface, not be silently swallowed as a
//        calendar apology).
//     3. On success, converts the busy list back to Kyiv-local
//        `BusyInterval[]` via `utcToKyivWallClock` and delegates to
//        `widenAndRank({ from, days, busy, preferences })` (widen.ts),
//        returning `{ status: "ok", slots, widened, noFreeTimes }` — this
//        function decides nothing about ranking/widening itself, it only
//        composes the free/busy fetch with the existing pure algorithm
//        (design.md Decision 5: widen.ts owns pool selection).
//
//   holdWithRecovery(port, request) -> Promise<HoldRecoveryResult>
//     Wraps `hold.ts`'s `createHold(port, request)` UNCHANGED (hold.ts and
//     hold.test.ts's existing 5 tests are not touched by this module) and
//     adds exactly one behaviour: if `createHold` rejects with a
//     `CalendarError` — whether thrown by the port's `freeBusy` re-check or
//     its `createTentative` call (spec.md "Tentative-event creation fails
//     during a hold" scenario; NFR-REL-01 covers "free/busy fetch or
//     tentative-event creation" as one failure class) — the rejection is
//     caught and converted to
//     `{ status: "failed", apology: CALENDAR_UNAVAILABLE_APOLOGY,
//     retainedRequest: request }` instead of propagating. Critically: if
//     `createTentative` is the call that fails, `createHold`'s collision
//     re-check already ran and found no collision, but no tentative event
//     was ever created and no booking transitions to `pending` — the caller
//     (owner of the `pending` transition, per hold.ts's own contract
//     comment) simply never receives a `"held"` status, so there is no
//     orphan hold to unwind (spec.md "no hold exists without its tentative
//     event"). On success, `createHold`'s own `"held"`/`"collision"` result
//     passes through unchanged.
import type { CalendarPort } from "./calendar-port.ts";
import { CalendarError } from "./calendar-port.ts";
import type { Preferences, RankedSlot } from "./rank.ts";
import { widenAndRank, type WidenedStep } from "./widen.ts";
import { createHold, type HoldRequest, type HoldResult } from "./hold.ts";
import { kyivWallClockToUtc, utcToKyivWallClock } from "./timezone.ts";

/**
 * The deterministic Ukrainian apology-and-retry message (NFR-REL-01,
 * BC-LANG-01, BC-BRAND-01). Produced with zero I/O and zero LLM
 * involvement — a plain string literal, always available. Kind, no tech
 * jargon, no pressure vocabulary, invites the lead to try again shortly
 * while making clear nothing was lost.
 */
export const CALENDAR_UNAVAILABLE_APOLOGY: string =
  "Вибачте, зараз не вдається перевірити розклад занять. Спробуйте, будь ласка, написати ще раз за кілька хвилин — ваші дані нікуди не зникли, ми продовжимо з того самого місця.";

/**
 * The lead's slot-proposal request, Europe/Kyiv wall-clock local (same
 * convention as `WidenParams` minus `busy`, which this function fetches
 * itself via the port rather than accepting as an argument).
 */
export interface ProposeRequest {
  /** First day of the horizon, Europe/Kyiv LOCAL "YYYY-MM-DD". */
  from: string;
  /** Horizon length in calendar days (production always passes 14). */
  days: number;
  preferences: Preferences;
  /** "Now" as Europe/Kyiv LOCAL "YYYY-MM-DDTHH:mm" — every slot that has
   *  already STARTED (start <= now) is excluded, so a lead is never offered a
   *  time in the past (e.g. today 10:00 when it is already the afternoon).
   *  OPTIONAL and injected by the caller (the pure core takes no clock,
   *  TC-PURE-01); omitted in tests that don't exercise the cutoff, in which
   *  case no past-time filtering is applied. */
  now?: string;
}

export type ProposeResult =
  | { status: "ok"; slots: RankedSlot[]; widened: WidenedStep; noFreeTimes: boolean }
  | { status: "calendar_unavailable"; apology: string; retainedRequest: ProposeRequest };

/** Zero-padded "YYYY-MM-DD" for a UTC-midnight-anchored calendar date —
 * calendar-date arithmetic only, same convention as grid.ts (a calendar
 * date's weekday/date arithmetic does not depend on a timezone). */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(y, m - 1, d) + days * 24 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function proposeSlots(
  port: CalendarPort,
  request: ProposeRequest,
): Promise<ProposeResult> {
  const horizonEnd = addDays(request.from, request.days);
  const range = {
    start: kyivWallClockToUtc(`${request.from}T00:00`),
    end: kyivWallClockToUtc(`${horizonEnd}T00:00`),
  };

  let busyUtc;
  try {
    busyUtc = await port.freeBusy(range);
  } catch (error) {
    if (error instanceof CalendarError) {
      return {
        status: "calendar_unavailable",
        apology: CALENDAR_UNAVAILABLE_APOLOGY,
        retainedRequest: request,
      };
    }
    throw error;
  }

  const busyKyiv = busyUtc.map((interval) => ({
    start: utcToKyivWallClock(interval.start),
    end: utcToKyivWallClock(interval.end),
  }));

  // Past-time cutoff (FR-SLOT-01): treat everything from the horizon's start
  // up to `now` as a synthetic busy interval, so `subtract` (via widenAndRank)
  // removes any grid slot that has already started — a lead is never offered
  // today's 10:00 once it is the afternoon. Kyiv wall clock throughout, same
  // units as `busyKyiv`; a no-op when `now` is omitted (tests that don't
  // exercise the clock) or falls before the horizon start.
  if (request.now !== undefined) {
    busyKyiv.push({ start: `${request.from}T00:00`, end: request.now });
  }

  const { slots, widened, noFreeTimes } = widenAndRank({
    from: request.from,
    days: request.days,
    busy: busyKyiv,
    preferences: request.preferences,
  });

  return { status: "ok", slots, widened, noFreeTimes };
}

/**
 * `createHold`'s own `"held"`/`"collision"` outcomes, plus the one new
 * NFR-REL-01 recovery outcome this module adds on a `CalendarError`.
 */
export type HoldRecoveryResult =
  | HoldResult
  | { status: "failed"; apology: string; retainedRequest: HoldRequest };

export async function holdWithRecovery(
  port: CalendarPort,
  request: HoldRequest,
): Promise<HoldRecoveryResult> {
  try {
    const result: HoldResult = await createHold(port, request);
    return result;
  } catch (error) {
    if (error instanceof CalendarError) {
      return {
        status: "failed",
        apology: CALENDAR_UNAVAILABLE_APOLOGY,
        retainedRequest: request,
      };
    }
    throw error;
  }
}

// Re-exported so call sites (and tests) can `instanceof`-check a caught
// error without importing calendar-port.ts directly — not part of the
// red/green contract under test, just a convenience alias.
export { CalendarError };
