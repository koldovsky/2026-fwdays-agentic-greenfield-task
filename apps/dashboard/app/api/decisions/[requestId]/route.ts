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
//      - `confirm`: a fresh `calendar.freeBusy` collision re-check over the
//        booking's OWN slot (excluding the booking's own tentative event
//        from that re-check — its own hold always appears in a fresh
//        `freeBusy` snapshot, so a naive full-list check would report a
//        `conflict` on every confirm, even the very first one) -> a real
//        collision -> `{status:"conflict"}`. Otherwise
//        `calendar.upgradeToConfirmed(eventId, compileFirstLessonBrief(...))`.
//        Any `CalendarError` from either call -> `{status:"unavailable"}`,
//        booking stays `pending` (NFR-REL-01).
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
};

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
 *  `validateAdminProposedSlots` expects. */
async function freshBusyForSlots(
  calendar: CalendarPort,
  slots: Slot[],
): Promise<{ start: string; end: string }[]> {
  const busyPerSlot = await Promise.all(
    slots.map((slot) =>
      calendar.freeBusy({ start: kyivWallClockToUtc(slot.start), end: kyivWallClockToUtc(slot.end) }),
    ),
  );
  return busyPerSlot
    .flat()
    .map((interval) => ({ start: utcToKyivWallClock(interval.start), end: utcToKyivWallClock(interval.end) }));
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

/** Confirm's fresh collision re-check (step 4): a real `freeBusy` snapshot
 *  ALWAYS includes the booking's own tentative event for its own slot (it
 *  is a live event in the calendar) — remove exactly ONE busy interval that
 *  exactly matches the booking's own range before checking for a real
 *  collision, so the booking's own hold is never mistaken for a conflict
 *  with itself while a genuine duplicate/overlapping external event still
 *  gets caught. */
function hasExternalCollision(
  busy: { start: string; end: string }[],
  ownRange: { start: string; end: string },
): boolean {
  let selfRemoved = false;
  const external = busy.filter((interval) => {
    if (!selfRemoved && interval.start === ownRange.start && interval.end === ownRange.end) {
      selfRemoved = true;
      return false;
    }
    return true;
  });
  return external.length > 0;
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
      const busy = await freshBusyForSlots(calendar, slots);
      const otherPendingSlots = findOtherPendingSlots(db, requestId);
      const validation = validateAdminProposedSlots({ slots, busy, otherPendingSlots });
      if (!validation.ok) {
        return Response.json(
          {
            status: "invalid",
            code: validation.code,
            message: INVALID_MESSAGE_BY_CODE[validation.code] ?? "Обраний час недоступний.",
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
      try {
        freshBusyUtc = await calendar.freeBusy(ownRange);
      } catch (error) {
        if (error instanceof CalendarError) {
          return Response.json({ status: "unavailable", message: UNAVAILABLE_MESSAGE }, { status: 200 });
        }
        throw error;
      }
      if (hasExternalCollision(freshBusyUtc, ownRange)) {
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

    // Step 6: DB commit.
    updateBookingStatus(db, booking.id, decisionResult.nextStatus);
    if (decisionAction === "propose_another_time") {
      updateRequestState(db, requestId, "proposing");
      updateRequestFields(db, requestId, { offeredSlots: slots });
    }

    // Step 7: notification outbox row.
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
