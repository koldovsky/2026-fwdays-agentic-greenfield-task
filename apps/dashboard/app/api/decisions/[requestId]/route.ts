// apps/dashboard — POST /api/decisions/:requestId (dashboard tasks.md §5.7,
// booking-hitl tasks.md §D, design.md Decision 5). Replaces the inert
// "not_connected" stub with the real nine-step admin-decision handler. This
// route is the ONLY place `bookings.status` may ever become `'confirmed'`
// (FR-GUARD-01) — the model has no tool that reaches this code path.
//
// RESPONSE SHAPE (keeps the stub's own `{status, message}` discriminant
// convention, design.md Decision 5): `status` widens to `"applied" |
// "stale" | "conflict" | "invalid" | "unavailable"` — every REQUEST that
// reaches the nine-step body is handled with HTTP 200; only a genuine
// wire-format problem (non-integer `requestId`, an `action` outside the
// three-value enum) gets a `400`, and only a thrown, non-`CalendarError`
// bug would ever reach a raw 500 (never expected in the tested paths).
//
// NINE-STEP ORCHESTRATION ORDER (design.md Decision 5, implemented
// verbatim — every abort path returns BEFORE step 5, so no partial DB
// commit is ever possible):
//   1. Parse/validate params + body shape -> 400 on a wire-format problem.
//   2. Resolve the current PENDING booking (`findBookingsByRequestId`,
//      filtered to `status === 'pending'`) -> `{status:"stale"}` on zero
//      matches, never 404.
//   3. `propose_another_time` ONLY: validate `slots` via
//      `validateAdminProposedSlots` against a FRESH `calendar.freeBusy`
//      fetch (plus other leads' pending holds, read from the DB — no
//      cross-lead source is wired yet) -> `{status:"invalid", code}` on any
//      violation, booking untouched.
//   4. Calendar operation, ALWAYS before the DB commit:
//      - `confirm`: a fresh, TWO-PART collision re-check over the booking's
//        OWN slot, run in parallel — anything found by EITHER part is a
//        real collision:
//          (a) value-based: `calendar.freeBusy` (busy TIME RANGES, no
//              identity), self-filtered by INSTANT equality
//              (`hasExternalCollision`/`removeOwnInterval`) — still needed
//              because a manually-added, identity-less busy interval (e.g.
//              a synced external/holiday calendar) is only visible via
//              `freeBusy`, not `busyEventsInRange`.
//          (b) identity-based (the live-found Confirm double-booking fix,
//              `CalendarPort.busyEventsInRange`'s own doc comment,
//              `docs/qa/booking-hitl-manual-smoke.md`'s "REAL BUG FOUND"):
//              `calendar.busyEventsInRange`, self-filtered by the booking's
//              OWN `calendar_event_id` BY IDENTITY. Real Google
//              `freebusy.query` MERGES overlapping busy periods from
//              DIFFERENT events into one interval — if a distinct external
//              event exactly overlaps the booking's own hold, (a)'s
//              instant-equality self-filter strips the single merged
//              interval and mistakes it for "just my own hold", silently
//              double-booking. `busyEventsInRange` never merges, so
//              excluding the booking's own event BY IDENTITY leaves any
//              OTHER event — including an exact-overlap one — as a real,
//              detected collision, immune to (a)'s blind spot.
//        Otherwise `calendar.upgradeToConfirmed(eventId,
//        compileFirstLessonBrief(...))`. Any `CalendarError` from any of
//        the three calendar calls -> `{status:"unavailable"}`, booking
//        stays `pending` (NFR-REL-01).
//      - `decline` / `propose_another_time`: `releaseHold(calendar,
//        eventId)` — the ONE shared delete path (design.md Decision 6 item
//        2) rather than a raw `calendar.deleteEvent`, so a 404/410
//        (already-gone tentative event) is treated as an already-satisfied
//        delete, not a failure (the F.3 regression pin). Any other
//        `CalendarError` -> `{status:"unavailable"}`, booking stays
//        `pending`, the slot is NOT marked released.
//   5. Pure transition: `applyBookingDecision('pending', action)` (always
//      succeeds here — step 2 already proved the booking is `pending`).
//   6. DB commit: `updateBookingStatus`. `propose_another_time` ALSO moves
//      `requests.state` to `'proposing'` and persists the admin's validated
//      slots into `requests.offered_slots` (the exact mechanism a
//      lead-initiated proposal would have used).
//   7. INSERT the notification row (`kind` matching the action, `payload` a
//      JSON `{text, buttons?}` composed via `lib/src/booking/copy.ts`;
//      `proposed_again` carries `buttons` so the bot's drain loop can
//      render real slot-chip taps).
//   8. Republish a fresh dashboard-scoped `STATE_SNAPSHOT` on the same
//      in-process AG-UI hub the SSE route reads from (design.md Decision 6
//      items 1 and 3).
//   9. Respond `{status:"applied"}`.
//
// Mirrors `apps/dashboard/app/api/leads/[id]/route.ts`'s idioms exactly:
// `resolveCalendarPort()`, `openDatabase(resolveDbPath())` +
// `try/finally { db.close() }`, `readDashboardSnapshot` +
// `publish({type:"STATE_SNAPSHOT", threadId:"dashboard", snapshot})`,
// async `params` Promise (Next.js 15+/16), `runtime = "nodejs"`.

import {
  openDatabase,
  findBookingsByRequestId,
  updateBookingStatus,
  updateRequestFields,
  updateRequestState,
  insertNotification,
  type BookingRow,
  type NotificationKind,
  type RequestRow,
} from "@kamerton/db";
import { applyBookingDecision, type BookingDecision } from "@kamerton/lib/src/booking/transitions.ts";
import { validateAdminProposedSlots } from "@kamerton/lib/src/booking/validate-admin-slots.ts";
import {
  DECLINE_COPY,
  composeConfirmationMessage,
  composeReProposalMessage,
} from "@kamerton/lib/src/booking/copy.ts";
import { releaseHold } from "@kamerton/lib/src/slots/hold.ts";
import { CalendarError, type CalendarPort } from "@kamerton/lib/src/slots/calendar-port.ts";
import { kyivWallClockToUtc, utcToKyivWallClock } from "@kamerton/lib/src/slots/timezone.ts";
import type { Slot } from "@kamerton/lib/src/slots/grid.ts";
import { compileFirstLessonBrief } from "@kamerton/lib/src/intake/first-lesson-brief.ts";
import { publish } from "../../../../lib/agui-hub.ts";
import { resolveCalendarPort } from "../../../../lib/calendar-port.ts";
import { currentWeekStartIso, readDashboardSnapshot, resolveDbPath } from "../../../../lib/dashboard-db.ts";
import type { AguiEvent } from "@kamerton/lib/src/agui/events.ts";

export const runtime = "nodejs";

const VALID_ACTIONS = ["confirm", "decline", "propose_another_time"] as const;

const UNAVAILABLE_MESSAGE =
  "Не вдалося зв'язатися з календарем. Спробуйте повторити рішення ще раз.";
const CONFLICT_MESSAGE =
  "Цей час більше не вільний у календарі — оновіть сторінку і оберіть інший варіант.";
const STALE_MESSAGE = "Ця заявка більше не очікує рішення — можливо, її вже опрацювали.";

const INVALID_MESSAGE_BY_CODE: Record<string, string> = {
  NO_SLOTS_SELECTED: "Оберіть хоча б один час, перш ніж надсилати пропозицію.",
  OFF_GRID: "Обраний час поза графіком занять (Пн–Пт, до 19:00).",
  SLOT_UNAVAILABLE: "Обраний час уже зайнятий або утримується іншим лідом.",
  TOO_MANY_SLOTS: "Забагато варіантів часу в одній пропозиції — оберіть не більше 10.",
};

// Review-gate finding #6 [MINOR]: reject an oversized `slots` array BEFORE
// the per-slot `calendar.freeBusy` fan-out (`freshBusyForSlots`) even runs —
// a malformed/oversized request should never trigger N calendar calls before
// validation gets a chance to reject it. 10 is comfortably above any
// realistic single re-proposal (design.md Risks: "a handful of decisions per
// day"), while still catching a pathological/oversized payload.
const MAX_PROPOSED_SLOTS = 10;

function isSlotShape(value: unknown): value is Slot {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).start === "string" &&
    typeof (value as Record<string, unknown>).end === "string"
  );
}

/** Renders `"DD.MM о HH:mm"` for a slot-chip button label — display copy
 *  only, never a guardrail (`copy.ts`'s composers own the guardrailed
 *  message text); mirrors `packages/bot/src/pipeline.ts`'s
 *  `formatSlotButtonLabel` convention without importing that package
 *  (which pulls in grammY). */
function formatSlotButtonLabel(slot: Slot): string {
  const [datePart, timePart] = slot.start.split("T");
  const [, month, day] = (datePart ?? "").split("-");
  return `${day ?? "?"}.${month ?? "?"} о ${timePart ?? "?"}`;
}

/** Fresh Kyiv-local free/busy for the admin's requested slots (step 3):
 *  fetches `calendar.freeBusy` per slot (RFC3339 UTC in/out) and converts
 *  the result back to Kyiv wall-clock local, the shape
 *  `validateAdminProposedSlots` expects.
 *
 *  Review-gate finding #7: when `excludeOwnRangeUtc` is given (the CURRENT
 *  pending booking's own tentative hold, about to be released in step 4), it
 *  is removed from the busy set at the UTC level, BEFORE the Kyiv-local
 *  conversion — a real `freeBusy` snapshot always includes the booking's own
 *  still-live tentative event for its own slot, so re-proposing that exact
 *  slot would otherwise always be reported as busy/unavailable. Same
 *  instant-comparison self-filter as `hasExternalCollision` (finding #1),
 *  reused via `removeOwnInterval`.
 *
 *  DELIBERATELY NOT switched to the identity-based `busyEventsInRange` fix
 *  (unlike Confirm's step-4 re-check, above): the live-found bug is
 *  `freeBusy`'s MERGING of overlapping busy periods from distinct events
 *  masking an exact-overlap external event as "just my own hold" — the same
 *  failure mode could in theory recur here if the admin re-proposes the
 *  booking's OWN slot while a distinct external event exactly overlaps it.
 *  Two things keep this a narrow, accepted residual risk rather than a
 *  second required fix: (1) `validateAdminProposedSlots` is a PURE function
 *  over `BusyInterval[]` (design.md Decision 1's port-boundary discipline;
 *  TC-PURE-01) — folding `busyEventsInRange`'s identity-based result in here
 *  would mean either widening that pure signature to carry `eventId`s it has
 *  no other use for, or silently dropping identity again to fit
 *  `BusyInterval[]`, which defeats the point; and (2) D.9's own
 *  `SLOT_UNAVAILABLE` regression pin seeds a MANUALLY-added, identity-less
 *  busy interval (`FakeCalendarPort.addManualBusy`) that `busyEventsInRange`
 *  never reports at all (by design — it only tracks its own
 *  tentative/confirmed events and `addExternalEvent`-seeded ones), so
 *  `freeBusy` cannot simply be replaced here without regressing that test.
 *  Confirm (the higher-stakes, teacher-facing "book it" action) is the one
 *  made identity-based by this fix; a coincident exact-overlap on a
 *  re-proposed slot would still surface at the NEXT Confirm attempt on that
 *  slot, so the double-booking itself is still caught before it can stick —
 *  just one step later than ideal for this specific, narrow scenario. */
async function freshBusyForSlots(
  calendar: CalendarPort,
  slots: Slot[],
  excludeOwnRangeUtc?: { start: string; end: string },
): Promise<{ start: string; end: string }[]> {
  const busyPerSlot = await Promise.all(
    slots.map((slot) =>
      calendar.freeBusy({ start: kyivWallClockToUtc(slot.start), end: kyivWallClockToUtc(slot.end) }),
    ),
  );
  let flatBusy = busyPerSlot.flat();
  if (excludeOwnRangeUtc !== undefined) {
    flatBusy = removeOwnInterval(flatBusy, excludeOwnRangeUtc);
  }
  return flatBusy.map((interval) => ({
    start: utcToKyivWallClock(interval.start),
    end: utcToKyivWallClock(interval.end),
  }));
}

interface OtherPendingSlotRow {
  slot_start: string;
  slot_end: string;
}

/** Other leads' pending holds, Kyiv-local (design.md Decision 3's
 *  `otherPendingSlots`) — no cross-lead source is wired yet, so this reads
 *  every OTHER `pending` booking straight from the DB (excluding the
 *  request currently being decided, which is about to be superseded
 *  anyway). */
function findOtherPendingSlots(db: import("better-sqlite3").Database, excludeRequestId: number): Slot[] {
  const rows = db
    .prepare(
      `SELECT slot_start, slot_end FROM bookings
       WHERE status = 'pending' AND (request_id IS NULL OR request_id != ?)`,
    )
    .all(excludeRequestId) as OtherPendingSlotRow[];
  return rows.map((row) => ({ start: row.slot_start, end: row.slot_end }));
}

/** Review-gate finding #1 [MAJOR]: two RFC3339 timestamps can denote the
 *  SAME instant while being textually different strings (missing
 *  milliseconds, `+00:00` vs `Z`, etc.) — a real Google Calendar freeBusy
 *  echo is not guaranteed to preserve the exact string this route generated.
 *  Compare by INSTANT (`Date#getTime()`), never by raw string equality. */
function isSameInstantRange(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  return new Date(a.start).getTime() === new Date(b.start).getTime() && new Date(a.end).getTime() === new Date(b.end).getTime();
}

/** Shared self-filter (Confirm's own collision re-check, step 4, AND
 *  propose_another_time's own fresh-busy validation, finding #7): a real
 *  `freeBusy` snapshot ALWAYS includes the booking's own tentative event for
 *  its own slot (it is a live event in the calendar) — remove exactly ONE
 *  busy interval whose INSTANT exactly matches the booking's own range
 *  before checking for a real collision, so the booking's own hold is never
 *  mistaken for a conflict with itself while a genuine duplicate/overlapping
 *  external event still gets caught. */
function removeOwnInterval<T extends { start: string; end: string }>(
  intervals: T[],
  ownRange: { start: string; end: string },
): T[] {
  let selfRemoved = false;
  return intervals.filter((interval) => {
    if (!selfRemoved && isSameInstantRange(interval, ownRange)) {
      selfRemoved = true;
      return false;
    }
    return true;
  });
}

/** Confirm's fresh collision re-check (step 4), VALUE-based half: see
 *  `removeOwnInterval`'s own comment — anything left after removing the
 *  booking's own interval is a genuine external collision. Kept alongside
 *  `hasIdentityBasedCollision` below (see this file's Confirm step-4 header
 *  comment): a manually-added, identity-less busy interval is only visible
 *  via `freeBusy`, never via `busyEventsInRange`. */
function hasExternalCollision(
  busy: { start: string; end: string }[],
  ownRange: { start: string; end: string },
): boolean {
  return removeOwnInterval(busy, ownRange).length > 0;
}

/** Second live-found Confirm bug (see this describe's own test-file header
 *  comment above `hasIdentityBasedCollision`'s call site): `overlaps()`
 *  (`lib/src/slots/subtract.ts`) compares RFC3339 timestamps with a plain
 *  STRING `<`, which is only a valid chronological ordering when both
 *  operands share the exact same offset/format. `busyEventsInRange` is a
 *  distinct adapter boundary (real Google `events.list` echoes
 *  `dateTime` in the CALENDAR'S LOCAL OFFSET, e.g. `+03:00`) — its results
 *  cannot be assumed to share `kyivWallClockToUtc`'s always-"Z" format, so
 *  the identity-based half of Confirm's re-check must compare by PARSED
 *  INSTANT, never by raw string ordering. Deliberately NOT reusing the
 *  shared `overlaps()` (its raw-string contract is relied on by its other,
 *  fixed-width-Kyiv-local-string callers) — mirrors the existing
 *  `isSameInstantRange` instant-based approach the value-based self-filter
 *  above already uses, just for a half-open overlap test instead of exact
 *  equality. */
function rangesOverlapByInstant(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  return new Date(a.start).getTime() < new Date(b.end).getTime() && new Date(b.start).getTime() < new Date(a.end).getTime();
}

/** Confirm's fresh collision re-check (step 4), IDENTITY-based half — the
 *  fix for the live-found Confirm double-booking bug (see this file's
 *  Confirm step-4 header comment and `CalendarPort.busyEventsInRange`'s own
 *  doc comment). Excludes the booking's own tentative/confirmed event BY
 *  `eventId`, never by value-matching a range that a merge-prone `freeBusy`
 *  snapshot could make ambiguous — any OTHER event overlapping `ownRange`
 *  is a genuine external collision, no matter how many events share the
 *  exact same time range. Overlap is checked by PARSED INSTANT
 *  (`rangesOverlapByInstant`), never `overlaps()`'s raw string compare —
 *  `busyEventsInRange` results may echo any RFC3339 offset format, not
 *  only `kyivWallClockToUtc`'s "Z"-UTC. */
function hasIdentityBasedCollision(
  distinctEvents: { eventId: string; start: string; end: string }[],
  ownEventId: string,
  ownRange: { start: string; end: string },
): boolean {
  return distinctEvents.some(
    (event) => event.eventId !== ownEventId && rangesOverlapByInstant(ownRange, event),
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
): Promise<Response> {
  const { requestId: rawRequestId } = await context.params;
  const requestId = Number(rawRequestId);

  // Step 1a: a non-integer/non-positive `requestId` is a wire-format
  // problem, never the pinned decision shapes — same discipline as
  // `leads/[id]/route.ts`'s own `[id]` guard.
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return Response.json({ error: "Некоректний ідентифікатор заявки." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некоректний формат запиту." }, { status: 400 });
  }

  const action = (body as { action?: unknown } | null)?.action;
  // Step 1b: an `action` outside the three-value enum is a wire-format
  // problem too, never a decision outcome.
  if (typeof action !== "string" || !VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number])) {
    return Response.json({ error: "Некоректна дія." }, { status: 400 });
  }
  const decisionAction = action as BookingDecision;

  const rawSlots = (body as { slots?: unknown } | null)?.slots;
  const slots: Slot[] = Array.isArray(rawSlots) ? rawSlots.filter(isSlotShape) : [];

  const db = openDatabase(resolveDbPath());
  try {
    // Step 2: resolve the current pending booking. Zero matches -> stale,
    // never 404.
    const pendingBookings: BookingRow[] = findBookingsByRequestId(db, requestId).filter(
      (b) => b.status === "pending",
    );
    if (pendingBookings.length === 0) {
      return Response.json({ status: "stale", message: STALE_MESSAGE }, { status: 200 });
    }
    const booking = pendingBookings[0]!;

    const requestRow = db.prepare(`SELECT * FROM requests WHERE id = ?`).get(requestId) as
      | RequestRow
      | undefined;
    if (requestRow === undefined) {
      // A pending booking with no owning request row would be a data
      // inconsistency, not a normal outcome — treated as stale (never a
      // partial commit, never a raw crash).
      return Response.json({ status: "stale", message: STALE_MESSAGE }, { status: 200 });
    }

    const calendar = resolveCalendarPort();

    // Step 3: propose_another_time ONLY — validate the admin's slots
    // against a fresh free/busy fetch BEFORE any calendar write, DB write,
    // or lead message.
    if (decisionAction === "propose_another_time") {
      // Review-gate finding #6: reject an oversized array BEFORE the
      // per-slot freeBusy fan-out even runs.
      if (slots.length > MAX_PROPOSED_SLOTS) {
        return Response.json(
          {
            status: "invalid",
            code: "TOO_MANY_SLOTS",
            message: INVALID_MESSAGE_BY_CODE.TOO_MANY_SLOTS,
          },
          { status: 200 },
        );
      }

      // Review-gate finding #7: exclude the booking's OWN currently-held
      // slot from the fresh busy snapshot — its tentative hold is still a
      // live event until step 4 releases it, so re-proposing that exact
      // slot must not be reported as unavailable.
      const ownRangeUtc = {
        start: kyivWallClockToUtc(booking.slot_start),
        end: kyivWallClockToUtc(booking.slot_end),
      };
      const busy = await freshBusyForSlots(calendar, slots, ownRangeUtc);
      const otherPendingSlots = findOtherPendingSlots(db, requestId);
      const validation = validateAdminProposedSlots({ slots, busy, otherPendingSlots });
      if (!validation.ok) {
        // Review-gate finding #5: name the offending slot, both in the
        // machine-readable `body.slot` and in the human-readable message.
        const offendingSlot = "slot" in validation ? validation.slot : undefined;
        const message =
          validation.code === "SLOT_UNAVAILABLE" && offendingSlot !== undefined
            ? `Час ${formatSlotButtonLabel(offendingSlot)} уже зайнятий або утримується іншим лідом. Оберіть інший варіант.`
            : (INVALID_MESSAGE_BY_CODE[validation.code] ?? "Обраний час недоступний.");
        return Response.json(
          {
            status: "invalid",
            code: validation.code,
            message,
            ...(offendingSlot !== undefined ? { slot: offendingSlot } : {}),
          },
          { status: 200 },
        );
      }
    }

    const eventId = booking.calendar_event_id;
    if (eventId === null) {
      // No tentative event to operate on — a data inconsistency, never a
      // silent success (NFR-REL-01).
      return Response.json({ status: "unavailable", message: UNAVAILABLE_MESSAGE }, { status: 200 });
    }

    // Step 4: calendar operation, ALWAYS before the DB commit.
    if (decisionAction === "confirm") {
      const ownRange = {
        start: kyivWallClockToUtc(booking.slot_start),
        end: kyivWallClockToUtc(booking.slot_end),
      };
      let freshBusyUtc: { start: string; end: string }[];
      let distinctEvents: { eventId: string; start: string; end: string }[];
      try {
        [freshBusyUtc, distinctEvents] = await Promise.all([
          calendar.freeBusy(ownRange),
          calendar.busyEventsInRange(ownRange),
        ]);
      } catch (error) {
        if (error instanceof CalendarError) {
          return Response.json({ status: "unavailable", message: UNAVAILABLE_MESSAGE }, { status: 200 });
        }
        throw error;
      }
      if (
        hasExternalCollision(freshBusyUtc, ownRange) ||
        hasIdentityBasedCollision(distinctEvents, eventId, ownRange)
      ) {
        return Response.json({ status: "conflict", message: CONFLICT_MESSAGE }, { status: 200 });
      }
      try {
        await calendar.upgradeToConfirmed(eventId, compileFirstLessonBrief(requestRow));
      } catch (error) {
        if (error instanceof CalendarError) {
          return Response.json({ status: "unavailable", message: UNAVAILABLE_MESSAGE }, { status: 200 });
        }
        throw error;
      }
    } else {
      // decline / propose_another_time: release the tentative hold through
      // the ONE shared delete path (design.md Decision 6 item 2) — a
      // 404/410 (already-gone event) is not a failure.
      try {
        await releaseHold(calendar, eventId);
      } catch (error) {
        if (error instanceof CalendarError) {
          return Response.json({ status: "unavailable", message: UNAVAILABLE_MESSAGE }, { status: 200 });
        }
        throw error;
      }
    }

    // Step 5: pure transition — always succeeds here (the booking was just
    // proven `pending` in step 2).
    const decisionResult = applyBookingDecision(booking.status, decisionAction);
    if (!decisionResult.ok) {
      return Response.json({ status: "stale", message: STALE_MESSAGE }, { status: 200 });
    }

    // Steps 6-7: DB commit + notification outbox row, ALL-OR-NOTHING.
    //
    // Review-gate finding #3 [MAJOR]: these were separate autocommit SQLite
    // statements — a thrown failure between the booking-cancel write and the
    // notification insert (e.g. `insertNotification` itself throwing) used
    // to leave a PARTIALLY committed state: the booking already
    // cancelled/confirmed/declined and (for propose_another_time) the
    // request already `proposing` with `offered_slots` persisted, but no
    // notification ever queued — the lead's hold silently dropped with no
    // message ever sent. Wrapped in one `db.transaction(...)` (the same
    // better-sqlite3 pattern `packages/db/src/leads.ts`'s
    // `deleteLeadCascade` uses): any throw inside rolls back every write
    // above and rethrows, so the caller sees either the full commit or none
    // of it.
    const commitDecision = db.transaction((): void => {
      updateBookingStatus(db, booking.id, decisionResult.nextStatus);
      if (decisionAction === "propose_another_time") {
        updateRequestState(db, requestId, "proposing");
        updateRequestFields(db, requestId, { offeredSlots: slots });
      }

      let kind: NotificationKind;
      let payload: { text: string; buttons?: Array<Array<{ text: string; data: string }>> };
      if (decisionAction === "confirm") {
        kind = "confirmed";
        payload = { text: composeConfirmationMessage({ start: booking.slot_start }) };
      } else if (decisionAction === "decline") {
        kind = "declined";
        payload = { text: DECLINE_COPY };
      } else {
        kind = "proposed_again";
        payload = {
          text: composeReProposalMessage(slots),
          buttons: slots.map((slot, index) => [
            { text: formatSlotButtonLabel(slot), data: `slot:${index}` },
          ]),
        };
      }
      insertNotification(db, {
        bookingId: booking.id,
        telegramChatId: requestRow.telegram_chat_id,
        kind,
        payload: JSON.stringify(payload),
      });
    });
    commitDecision();

    // Step 8: republish a fresh dashboard-scoped STATE_SNAPSHOT.
    const snapshot = readDashboardSnapshot(db, currentWeekStartIso());
    const snapshotEvent: AguiEvent = { type: "STATE_SNAPSHOT", threadId: "dashboard", snapshot };
    publish(snapshotEvent);

    // Step 9: respond.
    return Response.json({ status: "applied" }, { status: 200 });
  } finally {
    db.close();
  }
}
