// packages/bot/src/pipeline.ts — GREEN half of tasks.md 5.4 (design.md
// Decision 3's three-step grammY pipeline: "immediate ack -> state machine ->
// agent only for free text"). The header comment below is the CONTRACT this
// implementation satisfies, pinned by `pipeline.test.ts`; kept largely as
// written for the red round, updated only to drop the "not implemented yet"
// framing.
//
// This module composes two already-green seams, never re-implementing them:
//   - `@kamerton/agent/src/loop.ts`'s `runIntakeTurn` (the tool-use loop,
//     tasks.md section 4) for the free-text path.
//   - `@kamerton/lib/src/intake/state-machine.ts`'s `transition()` (the pure
//     reducer, tasks.md section 2/3), called DIRECTLY by this module for the
//     button-callback path (design.md Decision 3: "resolve without an agent
//     call" — a callback never reaches `ModelPort.send()`, so it never goes
//     through `runIntakeTurn` either).
//
// PINNED PIPELINE CONTRACT (design.md Decisions 1, 3, 4, 5; ADR-0001 §6):
//
//   handleUpdate(update: InboundUpdate, deps: HandleUpdateDeps) -> Promise<void>
//
//   `deps`:
//     - `transport`: a `TelegramTransport` (telegram-transport.ts) —
//       `GrammyTelegramTransport` in production, `FakeTelegramTransport`
//       (testing/fake-telegram-transport.ts) in tests.
//     - `db`: a real `better-sqlite3` `Database` (TC-DATA-01) — ALWAYS a
//       real connection (`openDatabase(":memory:")` in tests). This module
//       is the ONLY place in `packages/bot` that touches `@kamerton/db`
//       directly; it maps `runIntakeTurn`'s `PersistencePort`/
//       `BookingStorePort` seams onto real `leads`/`requests`/`bookings` row
//       helpers, plus one raw `SELECT ... FROM bookings WHERE request_id = ?
//       AND status = 'pending'` this module owns (no `@kamerton/db` helper
//       for that lookup exists yet).
//     - `model`: a `ModelPort` (`@kamerton/agent/src/model-port.ts`) —
//       `AnthropicModelPort` in production, `FakeModelPort` in tests. Passed
//       straight through to `runIntakeTurn`'s `ports.model` — this module
//       never calls `.send()` itself.
//     - `calendar`: a `CalendarPort` (`@kamerton/lib/src/slots/calendar-port.ts`)
//       — `FakeCalendarPort` in tests. This module is where
//       `calendar.deleteEvent` gets pre-bound into the `ReleaseHoldFn` shape
//       `runIntakeTurn`'s `ports.releaseHold` expects.
//
//   ALGORITHM (every inbound update, in this exact order):
//
//     1. `await deps.transport.sendChatAction(update.telegramChatId, "typing")`
//        — ALWAYS the very first call this function makes, before touching
//        `deps.db` or `deps.model` at all (NFR-UX-01).
//
//     2. Resolve the CURRENT lead + request row:
//        a. `findLeadByTelegramUserId(db, update.telegramUserId)`.
//        b. If no lead exists: `insertLead(...)`, then `insertRequest(...)` —
//           a fresh row, `state` defaulting to `'greeting'`. Mark
//           `isBrandNewLead = true` for step 5.
//        c. If a lead exists: `findLatestRequestForLead(db, lead.id)`. If
//           there is none, OR its `state` is a TERMINAL conversation state
//           (`'done'` | `'soft_decline'`), `insertRequest(...)` a NEW row for
//           this lead (FR-INTAKE-08's returning-lead/sibling path).
//           Otherwise, resume the existing non-terminal row as-is.
//        `isBrandNewLead` is `false` whenever a lead already existed (even
//        if this turn creates a NEW sibling request row for them) — the
//        Anthropic-processing notice (step 5) fires ONCE per lead, ever.
//
//     3. If `update.type === "callback"`: resolve the tap DIRECTLY against
//        `transition()` — the wire-format-to-event mapping this module
//        chose is `"format:<value>"` -> `save_format`, `"goal:skip"` ->
//        `skip_goal`, `"goal:<tag>"` -> `save_goal`. A slot-chip tap
//        (`"slot:<n>"`, booking-hitl design.md Decision 2) resolves through
//        the shared `performHoldSlot` orchestration (bounds-checked against
//        the CURRENT `fields.offeredSlots` first — a stale/out-of-range
//        index is ignored deterministically, never reaching
//        `performHoldSlot`): held -> commits `pick_slot`, publishes
//        `CUSTOM`/`BOOKING_PENDING`, replies with `HOLD_CONFIRMATION_COPY`;
//        collision -> `requests.state` stays `proposing`, no `bookings` row,
//        replies with the kind `SLOT_COLLISION_NUDGE_COPY`; unavailable ->
//        the calendar apology, state unchanged. Any other/unrecognised
//        payload falls through to a deterministic acknowledgement with no
//        reducer call. **`deps.model.send()` is NEVER called for a callback
//        update.** Then skip to step 6.
//
//     4. If `update.type === "text"`: build the current turn's `IntakeState`
//        from the resolved request row, then call `runIntakeTurn({ state,
//        message: update.text, ports })` where `ports.persistence`/
//        `ports.bookingStore`/`ports.releaseHold` are this module's thin
//        adapters over `deps.db`/`deps.calendar`, scoped to the CURRENT
//        request row's id.
//
//     5. Compute the FINAL reply text — deterministic guardrail copy ALWAYS
//        wins over the model's own narration:
//          - if any tool-call's `error === "AGE_BELOW_MIN"`: `AGE_REFUSAL_COPY`.
//          - else if any tool-call's `detour === "scope_violation"`:
//            `SCOPE_EXPLANATION_COPY`.
//          - else if any tool-call's `detour === "format_unsure"`:
//            `FORMAT_UNSURE_COPY`.
//          - else: the model's own narration, falling back to a
//            deterministic kind acknowledgement when the model's response
//            carried no text at all (e.g. a bare tool-use response, notably
//            `cancel_request` — a lead must never receive an empty Telegram
//            message; this module's own green-half choice, not narrated in
//            the pinned header verbatim, but load-bearing for the cancel
//            scenario's "kind and Ukrainian, non-empty" assertion).
//        If `isBrandNewLead`, PREPEND `copy.ts`'s
//        `ANTHROPIC_PROCESSING_NOTICE` to the final text, once, on this turn
//        only (`@trace NFR-PRIV-02`).
//
//     6. `await deps.transport.sendMessage(update.telegramChatId, finalText)`.
//        If this THROWS (a Telegram-send failure, `@trace NFR-REL-01`): the
//        turn's DB writes already happened in step 4 BEFORE this call was
//        even attempted, so the lead's message is never lost — catch the
//        rejection and retry ONCE with `apology.ts`'s
//        `TELEGRAM_SEND_FAILURE_APOLOGY`. If that retry ALSO throws, let the
//        rejection propagate.
//
//   `compileFirstLessonBrief(row: RequestRow) -> string`
//     A pure, synchronous formatter (no I/O) — composes a plain-text
//     Ukrainian brief for the administrator from an already-`proposing`-or-
//     later `RequestRow`'s collected columns. `goal_tag`/`goal_text` and
//     `tastes`/`dream_song` DO have skip variants and so may be `null`: a
//     null goal or null tastes is rendered as an EXPLICIT "лід не назвав
//     мету занять" / "лід не назвав музичні смаки" marker line, never
//     silently omitted.
//
// Framework-free of grammY/the SDK itself (this module imports only
// `telegram-transport.ts`'s `TelegramTransport` interface, never grammY);
// the only I/O this module performs is through its three injected ports
// (`transport`, `db`, `model`) plus `calendar`.

import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  insertLead,
  findLeadByTelegramUserId,
  insertRequest,
  insertBooking,
  insertQuestion,
  insertMessage,
  findRecentMessagesForRequest,
  updateRequestFields,
  updateRequestState,
  findLatestRequestForLead,
  updateBookingStatus,
  parseOfferedSlots,
  REQUEST_GOAL_TAGS,
  type RequestRow,
  type RequestState,
  type UpdateRequestFieldsInput,
} from "@kamerton/db";
import { runIntakeTurn, type LoopPorts } from "@kamerton/agent/src/loop.ts";
import type { ModelPort } from "@kamerton/agent/src/model-port.ts";
import { ANTHROPIC_UNAVAILABLE_APOLOGY } from "@kamerton/agent/src/apology.ts";
// kb-learning design.md Decision 1 (tasks.md C.11's own KB-read-wiring
// choice): this module is the ONE place that actually calls
// `readKnowledgeBaseText` — fresh, once per turn, against the repo-root
// `knowledge/school.md` path — and threads the result into `runIntakeTurn`'s
// OPTIONAL `kbText` input. `packages/agent`'s own unit tests never pass this
// field (stay hermetic, `""`); this is the one live call site that makes
// design.md Decision 1's "no bot restart" requirement actually true.
import { DEFAULT_KNOWLEDGE_BASE_PATH, readKnowledgeBaseText } from "@kamerton/agent/src/kb-context.ts";
import { transition } from "@kamerton/lib/src/intake/state-machine.ts";
import type {
  CandidateFormat,
  GoalTag,
  IntakeEvent,
  IntakeFields,
  IntakeState,
  OfferedSlot,
  TransitionResult,
} from "@kamerton/lib/src/intake/state-machine.ts";
import type { CalendarPort } from "@kamerton/lib/src/slots/calendar-port.ts";
import type { JsonPatchOp } from "@kamerton/lib/src/dashboard/json-patch.ts";
import {
  AGE_REFUSAL_COPY,
  SCOPE_EXPLANATION_COPY,
  FORMAT_UNSURE_COPY,
} from "@kamerton/lib/src/intake/copy.ts";
// booking-hitl design.md Decision 2: the "one implementation, two call
// sites" helpers below wrap S1's own `proposeSlots`/`holdWithRecovery`
// (never a second re-implementation of the calendar orchestration) — this
// is the ONLY place in `packages/bot` that imports the slots `CalendarPort`
// concrete algorithms; `packages/agent` never does (the guardrail this
// slice preserves byte-for-byte).
import {
  proposeSlots,
  holdWithRecovery,
  CALENDAR_UNAVAILABLE_APOLOGY,
} from "@kamerton/lib/src/slots/propose.ts";
import type { Preferences } from "@kamerton/lib/src/slots/rank.ts";
import { WEEKDAYS } from "@kamerton/lib/src/booking/validate-preferences.ts";
import { utcToKyivWallClock } from "@kamerton/lib/src/slots/timezone.ts";
import {
  ANTHROPIC_PROCESSING_NOTICE,
  EMPTY_NARRATION_FALLBACK_COPY,
  HOLD_CONFIRMATION_COPY,
  SLOT_COLLISION_NUDGE_COPY,
  SLOTS_OFFER_COPY,
} from "./copy.ts";
import { TELEGRAM_SEND_FAILURE_APOLOGY } from "./apology.ts";
import type { InboundUpdate, SendMessageOptions, TelegramTransport } from "./telegram-transport.ts";
import { noopAguiPublisher, type AguiEvent, type AguiPublisher } from "./agui-publisher.ts";
// dashboard tasks.md §5 "Relocation prerequisite": `compileFirstLessonBrief`
// now lives in `lib/` (framework-free, TC-PURE-01) so apps/dashboard's
// server-side glue can reuse it without importing this package. Re-exported
// below so this module's own callers/tests are unaffected by the move.
import { compileFirstLessonBrief as compileFirstLessonBriefFromLib } from "@kamerton/lib/src/intake/first-lesson-brief.ts";

/** Every external dependency `handleUpdate` needs for one turn — see this
 *  file's header comment for the exact role each plays.
 *
 *  `publisher` (dashboard tasks.md §4.3, design.md Decision 1): the AG-UI
 *  publisher seam this module will call at each run/text/state boundary of
 *  a turn — a TYPE/DEFAULT change only in this pass (§4.3's RED half); no
 *  `publish()` call is wired into `handleUpdate` yet (that is §4.3's GREEN
 *  half). Optional and defaulting to `noopAguiPublisher` so every existing
 *  S2 caller (and every existing S2 test, which never passes this field)
 *  keeps behaving byte-for-byte identically — the regression guard
 *  `pipeline.test.ts` pins this explicitly. */
export interface HandleUpdateDeps {
  transport: TelegramTransport;
  db: Database.Database;
  model: ModelPort;
  calendar: CalendarPort;
  publisher?: AguiPublisher;
}

/** `requests.state`/`IntakeState.conversationState` values from which a
 *  conversation can never be resumed — a new inbound message from the same
 *  lead starts a brand-new `requests` row instead (FR-INTAKE-08). */
const TERMINAL_CONVERSATION_STATES: ReadonlySet<RequestState> = new Set(["done", "soft_decline"]);

/** Maps an already-resolved `requests` row onto the reducer's own
 *  `IntakeState` shape — the exact inverse of `@kamerton/db/src/requests.ts`'s
 *  `FIELD_COLUMN_BY_KEY` map (snake_case columns -> camelCase fields), never
 *  copying a `null` column into `fields` (the reducer only ever holds
 *  validator-approved, PRESENT values). */
function rowToIntakeState(row: RequestRow): IntakeState {
  const fields: IntakeFields = {};
  if (row.student_name !== null) fields.studentName = row.student_name;
  if (row.student_age !== null) fields.studentAge = row.student_age;
  if (row.format !== null) fields.format = row.format;
  if (row.goal_tag !== null) fields.goalTag = row.goal_tag;
  if (row.goal_text !== null) fields.goalText = row.goal_text;
  if (row.tastes !== null) fields.tastes = row.tastes;
  if (row.dream_song !== null) fields.dreamSong = row.dream_song;
  if (row.experience !== null) fields.experience = row.experience;
  if (row.comfort !== null) fields.comfort = row.comfort;
  if (row.preferred_weekdays !== null) fields.preferredWeekdays = row.preferred_weekdays;
  if (row.preferred_time_range !== null) fields.preferredTimeRange = row.preferred_time_range;
  // booking-hitl design.md Decision 4 item 2: the one JSON-in-TEXT column —
  // always read through `parseOfferedSlots` (never raw `JSON.parse`), which
  // is defensively `null`-safe for a malformed/legacy value.
  const offeredSlots = parseOfferedSlots(row.offered_slots);
  if (offeredSlots !== null) fields.offeredSlots = offeredSlots;
  return { conversationState: row.state, fields };
}

interface ResolvedLeadRequest {
  request: RequestRow;
  /** `true` only on the very turn that creates a lead's FIRST-EVER `leads`
   *  row (step 2b) — never `true` again for that lead, even across sibling
   *  `requests` rows (NFR-PRIV-02's "once per lead, ever" rule). */
  isBrandNewLead: boolean;
}

/** Step 2 of the pinned algorithm: resolve (or create) the lead + the
 *  current `requests` row this turn operates against. */
function resolveLeadAndRequest(db: Database.Database, update: InboundUpdate): ResolvedLeadRequest {
  const lead = findLeadByTelegramUserId(db, update.telegramUserId);

  if (lead === undefined) {
    const newLead = insertLead(db, {
      telegramUserId: update.telegramUserId,
      telegramChatId: update.telegramChatId,
      telegramDisplayName: update.telegramDisplayName ?? null,
    });
    const request = insertRequest(db, { leadId: newLead.id, telegramChatId: update.telegramChatId });
    return { request, isBrandNewLead: true };
  }

  const latest = findLatestRequestForLead(db, lead.id);
  if (latest === undefined || TERMINAL_CONVERSATION_STATES.has(latest.state)) {
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: update.telegramChatId });
    return { request, isBrandNewLead: false };
  }

  return { request: latest, isBrandNewLead: false };
}

/** Deterministic-guardrail-copy-wins priority for a `runIntakeTurn` result's
 *  tool-call log (step 5's first three bullets) — `undefined` when no
 *  tool-call this turn produced a guardrail-worthy outcome. */
function guardrailOverrideFor(toolCalls: { error?: string; detour?: string | null }[]): string | undefined {
  if (toolCalls.some((call) => call.error === "AGE_BELOW_MIN")) return AGE_REFUSAL_COPY;
  if (toolCalls.some((call) => call.detour === "scope_violation")) return SCOPE_EXPLANATION_COPY;
  if (toolCalls.some((call) => call.detour === "format_unsure")) return FORMAT_UNSURE_COPY;
  return undefined;
}

/** `sendMessage` with the NFR-REL-01 single-retry-with-apology rule (step 6):
 *  the turn's DB writes already happened before this is ever called, so a
 *  Telegram outage never loses the lead's message — only the notification of
 *  it. A second consecutive failure is not recovered from further here; it
 *  propagates to the caller (grammY's own polling-loop error handler in
 *  production). */
async function sendWithRetry(
  transport: TelegramTransport,
  chatId: string,
  text: string,
  options?: SendMessageOptions,
): Promise<void> {
  try {
    await transport.sendMessage(chatId, text, options);
  } catch {
    // The retry apology is plain text — never re-attempts with a keyboard.
    await transport.sendMessage(chatId, TELEGRAM_SEND_FAILURE_APOLOGY);
  }
}

/** The lead-proposal horizon (S1 `slots/propose.ts`'s own documented
 *  convention: "production always passes 14"; there was no real production
 *  call site until this task — `HoldStorePort`/`SlotsPort`'s first live
 *  wiring). */
const PROPOSE_HORIZON_DAYS = 14;

/** Conversation-history slice: how many trailing transcript messages to
 *  replay to the model each turn. An intake conversation is short (a dozen-ish
 *  fields), so this bounds the replay generously while keeping token cost
 *  flat for any pathologically long chat. Counted in individual messages
 *  (user + assistant), not exchanges. */
const HISTORY_MESSAGE_LIMIT = 20;

/** Europe/Kyiv LOCAL "YYYY-MM-DD" for "today" — the one place this module
 *  touches a timezone, reusing `timezone.ts`'s own adapter-boundary
 *  conversion (design.md Decision 3: lib/ is the only module allowed to
 *  know about Europe/Kyiv; this just calls through it) rather than deriving
 *  a UTC calendar date, which could be off by a day near local midnight. */
function todayKyivDate(): string {
  return utcToKyivWallClock(new Date().toISOString()).slice(0, 10);
}

/** Europe/Kyiv LOCAL "YYYY-MM-DDTHH:mm" for "now" — the past-time cutoff
 *  `proposeSlots` uses so a lead is never offered a slot that has already
 *  started (today 10:00 once it is the afternoon). Same adapter-boundary
 *  conversion as `todayKyivDate`, just without the date-only slice. */
function nowKyivWallClock(): string {
  return utcToKyivWallClock(new Date().toISOString());
}

/** booking-hitl design.md Decision 2 (tasks.md C.5): the shared async
 *  orchestration function BOTH the free-text `LoopPorts.slots` binding (see
 *  this module's `applyToolUse`-facing `ports` construction, step 4) and a
 *  direct free-text call site would use — "one implementation, two call
 *  sites", so a lead who types a preference can never drift onto a
 *  differently-validated path than any other caller. `input`'s
 *  `weekdays`/`timeWindow` have ALREADY been validated by
 *  `validatePreferences` one layer up (`packages/agent/src/loop.ts`'s
 *  `applyToolUse`, defense in depth) — this function trusts its caller
 *  the same way `holdWithRecovery` trusts `createHold`'s own collision
 *  re-check. */
/** Zero-padded "YYYY-MM-DD" `days` after `dateStr` — calendar-date arithmetic
 *  only (UTC-midnight anchored, timezone-independent), same convention as
 *  `slots/propose.ts`'s own `addDays`. */
function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

const FULL_DAY_WINDOW = { start: "10:00", end: "20:00" };

async function performProposeSlots(
  deps: HandleUpdateDeps,
  request: RequestRow,
  input: { weekdays: string[]; timeWindow: { start: string; end: string }; date?: string },
): Promise<
  | { status: "ok"; slots: OfferedSlot[] }
  | { status: "no_free_times" }
  | { status: "unavailable"; apology: string }
> {
  void request; // the structured preference comes entirely from the model-supplied, code-validated `input` — no `requests` column this port needs.
  const today = todayKyivDate();

  // A concrete date the lead named (e.g. "завтра") — GUARDRAIL: the code, not
  // the model, decides whether to honour it. Accepted only if it is a
  // well-formed date within [today, today+horizon]; then slots are proposed for
  // THAT single day (weekday preference is irrelevant — the date IS the
  // choice), with the lead's time window if valid, else the full teaching day.
  // A weekend date yields no slots deterministically (the Mon–Fri grid has
  // none), so the lead gets the kind "no free times" path. Anything invalid or
  // out of range falls back to the weekday horizon below.
  const timeWindowIsValid =
    typeof input.timeWindow?.start === "string" &&
    typeof input.timeWindow?.end === "string" &&
    input.timeWindow.start !== "" &&
    input.timeWindow.start < input.timeWindow.end;

  let from = today;
  let days = PROPOSE_HORIZON_DAYS;
  let preferences: Preferences = { weekdays: input.weekdays, timeWindow: input.timeWindow };

  if (
    input.date !== undefined &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.date) &&
    input.date >= today &&
    input.date <= addDaysStr(today, PROPOSE_HORIZON_DAYS)
  ) {
    from = input.date;
    days = 1;
    preferences = {
      weekdays: [...WEEKDAYS],
      timeWindow: timeWindowIsValid ? input.timeWindow : FULL_DAY_WINDOW,
    };
  }

  const result = await proposeSlots(deps.calendar, {
    from,
    days,
    preferences,
    now: nowKyivWallClock(),
  });

  if (result.status === "calendar_unavailable") {
    return { status: "unavailable", apology: result.apology };
  }
  if (result.slots.length === 0) {
    return { status: "no_free_times" };
  }
  return { status: "ok", slots: result.slots };
}

/** booking-hitl design.md Decision 2 (tasks.md C.5): the shared async
 *  hold-orchestration function — S1's `holdWithRecovery` pre-bound to
 *  `deps.calendar`, PLUS the pending-booking DB insert (with `request_id`)
 *  as one atomic-from-the-caller's-view step (design.md Decision 4 item 3).
 *  `offeredSlots`/`slotIndex` are ALREADY bounds-checked by every caller
 *  (`loop.ts`'s own `request_hold` dispatch, this module's `"slot:<n>"`
 *  callback branch) — the `undefined` fallback below is defense in depth
 *  only, never expected to fire. */
async function performHoldSlot(
  deps: HandleUpdateDeps,
  request: RequestRow,
  slotIndex: number,
  offeredSlots: OfferedSlot[],
): Promise<
  | { status: "held"; bookingId: number }
  | { status: "collision" }
  | { status: "unavailable"; apology: string }
> {
  const slot = offeredSlots[slotIndex];
  if (slot === undefined) {
    return { status: "unavailable", apology: CALENDAR_UNAVAILABLE_APOLOGY };
  }

  const result = await holdWithRecovery(deps.calendar, {
    slot,
    summary: `Пробне заняття — ${request.student_name ?? "лід"}`,
    description: compileFirstLessonBriefFromLib(request),
  });

  if (result.status === "failed") {
    return { status: "unavailable", apology: result.apology };
  }
  if (result.status === "collision") {
    return { status: "collision" };
  }

  // {status: "held"} — booking-hitl design.md Decision 6 item 4: slot_start/
  // slot_end are written VERBATIM from the offered slot's own Kyiv
  // wall-clock strings, never converted to UTC.
  const booking = insertBooking(deps.db, {
    slotStart: slot.start,
    slotEnd: slot.end,
    status: "pending",
    calendarEventId: result.eventId,
    requestId: request.id,
  });
  return { status: "held", bookingId: booking.id };
}

/** booking-hitl design.md Decision 2 (tasks.md C.5): renders each offered
 *  slot as its own tappable inline-keyboard row, `data` the exact
 *  `"slot:<n>"` wire format `parseCallbackEvent` recognises — one button per
 *  row keeps every label fully readable on a phone-width Telegram client. */
function formatSlotButtonLabel(slot: OfferedSlot): string {
  const [datePart, timePart] = slot.start.split("T");
  const [, month, day] = (datePart ?? "").split("-");
  return `${day ?? "?"}.${month ?? "?"} о ${timePart ?? "?"}`;
}

function buildSlotButtons(slots: OfferedSlot[]): NonNullable<SendMessageOptions["buttons"]> {
  return slots.map((slot, index) => [{ text: formatSlotButtonLabel(slot), data: `slot:${index}` }]);
}

/** The wire-format-to-event mapping this module chose for button-callback
 *  updates (step 3) — a save/format/goal-option button maps to the matching
 *  `save_*`/`skip_*` reducer event. A slot-chip tap (`"slot:<n>"`,
 *  booking-hitl design.md Decision 2, tasks.md C.5) maps onto the SAME
 *  `pick_slot` `IntakeEvent` the `request_hold` tool dispatch uses
 *  (`@kamerton/lib/src/intake/state-machine.ts`) — one reducer event, two
 *  call sites, mirroring `performProposeSlots`/`performHoldSlot`'s own
 *  sharing. A non-integer/negative index is a malformed payload and is
 *  ignored here (`null`, never built into an event); an in-range-vs-stale
 *  check against the CURRENT `fields.offeredSlots` is `applyCallbackEvent`'s
 *  job (mirroring `request_hold`'s own "reject in code, never trust the
 *  caller" discipline), not this parser's. Anything else this mapping does
 *  not recognise returns `null`: no reducer call is made for it. */
function parseCallbackEvent(data: string): IntakeEvent | null {
  if (data.startsWith("format:")) {
    return { type: "save_format", format: data.slice("format:".length) as CandidateFormat };
  }
  if (data === "goal:skip") {
    return { type: "skip_goal" };
  }
  if (data.startsWith("goal:")) {
    const tag = data.slice("goal:".length);
    // Review-gate finding #3 (CRITICAL): a button callback never reaches
    // `ModelPort.send()` (design.md Decision 3), so it never benefits from
    // the model's own tool-schema enum guarding `goalTag` — this allow-list
    // check is the ONLY gate a callback payload passes through before
    // `applyCallbackEvent` would otherwise write it straight to the
    // `requests` row. Anything outside the closed enum is ignored (`null`),
    // never built into an event.
    if (!(REQUEST_GOAL_TAGS as readonly string[]).includes(tag)) {
      return null;
    }
    return { type: "save_goal", goalTag: tag as GoalTag, goalText: "" };
  }
  if (data === "tastes:skip") {
    return { type: "skip_tastes" };
  }
  if (data.startsWith("slot:")) {
    const parsed = Number(data.slice("slot:".length));
    if (!Number.isInteger(parsed) || parsed < 0) {
      return null;
    }
    return { type: "pick_slot", slotIndex: parsed };
  }
  return null;
}

/** Converts a `Partial<IntakeFields>` patch (the exact shape both
 *  `ports.persistence.saveFields` and the callback path's
 *  `fieldPatchForCallbackEvent` already deal in) into the RFC-6902 op list a
 *  `STATE_DELTA` event carries (dashboard tasks.md §4.3, design.md's AG-UI
 *  contract). `op` choice (`add` vs `replace`) is not asserted by any test —
 *  `"replace"` is used uniformly since every field this pipeline patches
 *  already exists on the dashboard's known-paths state model. */
function patchToJsonPatchOps(patch: Partial<IntakeFields>): JsonPatchOp[] {
  return Object.entries(patch).map(([key, value]) => ({
    op: "replace" as const,
    path: `/${key}`,
    value,
  }));
}

/** The validator-approved field patch to persist for a successfully applied
 *  callback event — mirrors `@kamerton/agent/src/loop.ts`'s own private
 *  `fieldPatchForEvent` for the subset of events this module's callback path
 *  handles directly (never trusting anything but the reducer's own resulting
 *  `fields`). */
function fieldPatchForCallbackEvent(event: IntakeEvent, fields: IntakeFields): Partial<IntakeFields> | null {
  switch (event.type) {
    case "save_format":
      return { format: fields.format };
    case "save_goal":
      return { goalTag: fields.goalTag, goalText: fields.goalText };
    default:
      return null;
  }
}

/** Runs one callback-mapped event straight through `transition()` and
 *  persists any validator-approved change on the given `requests` row — the
 *  callback-path equivalent of `runIntakeTurn`'s own tool dispatch, minus
 *  the model round trip (design.md Decision 3: "resolve without an agent
 *  call"). NEVER called with a `pick_slot` event — a slot-chip tap needs the
 *  `performHoldSlot` calendar/DB orchestration (and its own
 *  held/collision/unavailable reply-shaping) BEFORE any transition is
 *  committed, so `handleUpdate`'s own callback branch (below) resolves
 *  `pick_slot` directly rather than through this generic, synchronous-result
 *  helper (design.md Decision 2: "one implementation, two call sites" for
 *  the hold orchestration itself, not for this reducer-only helper). */
function applyCallbackEvent(
  deps: HandleUpdateDeps,
  request: RequestRow,
  state: IntakeState,
  event: Exclude<IntakeEvent, { type: "pick_slot" }>,
): TransitionResult {
  const result = transition(state, event);

  if (result.error !== undefined) {
    return result;
  }

  if (result.state.conversationState !== state.conversationState) {
    updateRequestState(deps.db, request.id, result.state.conversationState);
  }
  if (result.detour === null) {
    const patch = fieldPatchForCallbackEvent(event, result.state.fields);
    if (patch !== null) {
      updateRequestFields(deps.db, request.id, patch);
    }
  }

  return result;
}

/**
 * The grammY pipeline's update handler (design.md Decision 3): immediate
 * typing ack, then either a direct reducer call (button callback) or a full
 * agent-loop turn (free text), then a deterministic-guardrail-copy-aware
 * reply with Telegram-send-failure retry. See this file's header comment for
 * the full pinned algorithm.
 */
export async function handleUpdate(update: InboundUpdate, deps: HandleUpdateDeps): Promise<void> {
  // dashboard tasks.md §4.3 (GREEN half): the injected publisher seam,
  // defaulting to `noopAguiPublisher` so every existing S2 caller/test keeps
  // behaving byte-for-byte identically (the regression guard in
  // `pipeline.test.ts` pins this). Every `publish()` call below goes through
  // `safePublish`, which is FIRE-AND-FORGET (review-gate FIX 1 [CRITICAL]):
  // it invokes `publisher.publish(event)` and attaches `.catch(() => {})`
  // WITHOUT ever `await`ing it. A publisher failure (the real HTTP one can
  // reject) or a publisher that simply never settles (a dashboard process
  // that accepted the connection but hangs) must NEVER slow down or block a
  // lead's turn — the dashboard is a best-effort side channel, never
  // load-bearing for NFR-REL-01/NFR-UX-01.
  const publisher = deps.publisher ?? noopAguiPublisher;
  const threadId = update.telegramChatId;
  const runId = randomUUID();

  function safePublish(event: AguiEvent): void {
    publisher.publish(event).catch(() => {
      // Intentionally swallowed: the publisher is a one-way, best-effort
      // side channel — a dashboard-ingest hiccup must never surface to the
      // lead or interrupt the turn. NEVER awaited above, for the same
      // reason (see this function's header comment).
    });
  }

  try {
    // Step 1: ALWAYS the very first outbound call this function makes —
    // strictly before touching db/model, and strictly before the very first
    // AG-UI publish (review-gate FIX 1: the typing ack must win the race
    // against the dashboard side channel, NFR-UX-01).
    await deps.transport.sendChatAction(update.telegramChatId, "typing");

    safePublish({ type: "RUN_STARTED", threadId, runId });

    // Step 2: resolve the current lead + request row.
    const { request, isBrandNewLead } = resolveLeadAndRequest(deps.db, update);

    let replyText: string;
    /** The field(s) persisted THIS turn — the source for the turn's
     *  `STATE_DELTA` (unused when the turn instead publishes a
     *  `STATE_SNAPSHOT`, i.e. a brand-new lead's first-ever request). */
    let statePatch: Partial<IntakeFields> = {};
    /** The FULL resulting `fields` object after this turn — every reducer
     *  result (`TransitionResult`/`LoopResult`'s `state.fields`) already
     *  carries this, per `state-machine.ts`'s own "always the full resulting
     *  IntakeState" contract — the source for a brand-new lead's
     *  `STATE_SNAPSHOT`. */
    let finalFields: IntakeFields = rowToIntakeState(request).fields;
    let modelErrored = false;
    /** booking-hitl design.md Decision 2 (tasks.md C.5): real, tappable
     *  slot-chip buttons for a turn that just offered (or re-offered) slots
     *  — `undefined` for every other turn, so `sendWithRetry` renders no
     *  keyboard at all by default (unchanged S2 behaviour). */
    let replyOptions: SendMessageOptions | undefined;
    /** Conversation-history slice: the conversational reply to persist as this
     *  turn's `assistant` transcript message — captured from a free-text turn
     *  BEFORE the one-time brand-new-lead privacy notice is prepended (that
     *  notice is not conversational content the model needs replayed).
     *  `undefined` for a callback turn (button taps are resolved
     *  deterministically and are not part of the model's replayed transcript). */
    let assistantReplyForHistory: string | undefined;

    if (update.type === "callback") {
      // Step 3: callback updates NEVER reach ModelPort.send().
      const event = parseCallbackEvent(update.data);
      if (event === null) {
        replyText = EMPTY_NARRATION_FALLBACK_COPY;
      } else if (event.type === "pick_slot") {
        // booking-hitl design.md Decision 2 (tasks.md C.5): a slot-chip tap
        // resolves through the SHARED `performHoldSlot` orchestration
        // WITHOUT ever reaching `runIntakeTurn`/`ModelPort.send()` — mirrors
        // `packages/agent/src/loop.ts`'s own `request_hold` bounds-check
        // discipline: a stale/out-of-range index never even reaches
        // `performHoldSlot`, let alone `ports.calendar`.
        const currentState = rowToIntakeState(request);
        const offeredSlots = currentState.fields.offeredSlots;
        if (offeredSlots === undefined || event.slotIndex < 0 || event.slotIndex >= offeredSlots.length) {
          // Stale/replayed tap (e.g. after a fresh `offer_slots` narrowed
          // the list) — ignored deterministically: no reducer call, no DB
          // write, no calendar call.
          replyText = EMPTY_NARRATION_FALLBACK_COPY;
          finalFields = currentState.fields;
        } else {
          const holdResult = await performHoldSlot(deps, request, event.slotIndex, offeredSlots);
          if (holdResult.status === "unavailable") {
            replyText = holdResult.apology;
            finalFields = currentState.fields;
          } else if (holdResult.status === "collision") {
            // Baseline `slots` spec's own hold-race scenario: `transition()`
            // is never called at all — `requests.state` stays "proposing",
            // no `bookings` row is ever created.
            replyText = SLOT_COLLISION_NUDGE_COPY;
            replyOptions = { buttons: buildSlotButtons(offeredSlots) };
            finalFields = currentState.fields;
          } else {
            // {status: "held"} — commit pick_slot (proposing -> awaiting_admin).
            const result = transition(currentState, event);
            if (result.state.conversationState !== currentState.conversationState) {
              updateRequestState(deps.db, request.id, result.state.conversationState);
            }
            finalFields = result.state.fields;
            replyText = HOLD_CONFIRMATION_COPY;
            // design.md Decision 6 item 1's trigger: publish the instant a
            // hold succeeds so a connected dashboard tab renders the new
            // pending request without a reload. The payload carries the FULL
            // queue-entry shape (studentName, slot times, brief) — not just
            // {requestId, bookingId} — so the live card shows who/when
            // immediately (the dashboard's `BookingPendingPayload`), and no
            // consumer ever dereferences an absent `slotStart`.
            const pickedSlot = offeredSlots[event.slotIndex]!;
            safePublish({
              type: "CUSTOM",
              name: "BOOKING_PENDING",
              value: {
                requestId: request.id,
                leadId: request.lead_id,
                telegramChatId: update.telegramChatId,
                studentName: request.student_name,
                studentAge: request.student_age,
                brief: compileFirstLessonBriefFromLib(request),
                bookingId: holdResult.bookingId,
                calendarEventId: null,
                slotStart: pickedSlot.start,
                slotEnd: pickedSlot.end,
              },
            });
          }
        }
      } else {
        const result = applyCallbackEvent(deps, request, rowToIntakeState(request), event);
        replyText = guardrailOverrideFor([result]) ?? EMPTY_NARRATION_FALLBACK_COPY;
        finalFields = result.state.fields;
        if (result.error === undefined && result.detour === null) {
          statePatch = fieldPatchForCallbackEvent(event, result.state.fields) ?? {};
        }
      }
    } else {
      // Step 4: free text always goes through the agent tool-use loop.
      const capturedPatch: Partial<IntakeFields> = {};
      const ports: LoopPorts = {
        model: deps.model,
        persistence: {
          async saveFields(patch: Partial<IntakeFields>): Promise<void> {
            Object.assign(capturedPatch, patch);
            updateRequestFields(deps.db, request.id, patch as UpdateRequestFieldsInput);
          },
          async saveState(state): Promise<void> {
            updateRequestState(deps.db, request.id, state);
          },
        },
        bookingStore: {
          async findPendingBookingForCurrentRequest() {
            const row = deps.db
              .prepare(`SELECT id, calendar_event_id FROM bookings WHERE request_id = ? AND status = 'pending'`)
              .get(request.id) as { id: number; calendar_event_id: string | null } | undefined;
            if (row === undefined) {
              return undefined;
            }
            return { id: row.id, calendarEventId: row.calendar_event_id };
          },
          async markBookingCancelled(bookingId: number): Promise<void> {
            updateBookingStatus(deps.db, bookingId, "cancelled");
          },
        },
        releaseHold: (eventId: string) => deps.calendar.deleteEvent(eventId),
        // booking-hitl design.md Decision 2 (tasks.md C.5) — pre-bound to the
        // SAME shared `performProposeSlots`/`performHoldSlot` orchestration
        // functions the `"slot:<n>"` callback branch (above) calls: "one
        // implementation, two call sites" — a lead who types a preference or
        // taps a slot chip can never drift onto two differently-validated
        // hold paths.
        slots: { proposeSlots: (input) => performProposeSlots(deps, request, input) },
        holdStore: {
          holdSlot: (slotIndex, offeredSlots) => performHoldSlot(deps, request, slotIndex, offeredSlots),
        },
        // kb-learning design.md Decision 4 (tasks.md C.11): pre-applies the
        // CURRENT turn's lead_id/request_id/telegram_chat_id — mirrors
        // `ports.slots`/`ports.holdStore`'s own "pre-bind the request's own
        // context, expose only the narrow method the loop needs" shape.
        // `requestId` is passed through (never omitted) even though the
        // column itself is nullable at the schema level (`ON DELETE SET
        // NULL`) — a question asked THIS turn always has a live request row
        // to attribute it to.
        questions: {
          async logAnsweredFromKb(question: string): Promise<void> {
            insertQuestion(deps.db, {
              leadId: request.lead_id,
              requestId: request.id,
              telegramChatId: update.telegramChatId,
              text: question,
              answerSource: "kb",
            });
          },
          async logUnanswered(question: string): Promise<void> {
            insertQuestion(deps.db, {
              leadId: request.lead_id,
              requestId: request.id,
              telegramChatId: update.telegramChatId,
              text: question,
              answerSource: "unanswered",
            });
          },
        },
      };

      // kb-learning design.md Decision 1: read fresh, every turn — the
      // dashboard's answer-handler writes `knowledge/school.md` directly, so
      // the very next bot-process read (this line) sees it, with zero extra
      // plumbing (no cache, no cross-process invalidation signal). A
      // missing/unreadable file degrades to `""` (`readKnowledgeBaseText`
      // never throws), which `buildSystemPrompt` renders as an explicitly
      // empty KB block — every question then safely falls onto the
      // `log_question` promise path. `KAMERTON_KB_PATH` mirrors the dashboard
      // answer-route's own `resolveKbPath` idiom so BOTH the read side (here)
      // and the write side (the route) key off the same override — one env,
      // one file, in dev/tests alike.
      const kbText = readKnowledgeBaseText(
        process.env.KAMERTON_KB_PATH ?? DEFAULT_KNOWLEDGE_BASE_PATH,
      );

      // Conversation-history slice: replay the recent transcript tail for THIS
      // request so the model can accumulate facts a lead gives across several
      // terse turns (experience + comfort) and never re-asks a field it
      // already asked. Loaded BEFORE this turn's own messages are persisted
      // (below), so it never contains the current message. Oldest-first,
      // already the order `runIntakeTurn` replays them in.
      const history = findRecentMessagesForRequest(deps.db, request.id, HISTORY_MESSAGE_LIMIT).map(
        (row) => ({ role: row.role, content: row.content }),
      );

      const preConversationState = request.state;
      let result = await runIntakeTurn({
        state: rowToIntakeState(request),
        message: update.text,
        ports,
        kbText,
        history,
        today: todayKyivDate(),
      });

      // Auto-propose on profile completion (flow fix). The turn that collects
      // the LAST field advances the conversation to `proposing`, but the model
      // only called the save tool — it did NOT call `propose_slots`, which the
      // state machine only instructs from a turn that STARTS in `proposing`.
      // Without this, the conversation dead-ends on the "we'll come back with a
      // proposal" closing copy and no slots ever arrive (the live-bot deadlock:
      // "and what do I do next?"). So the instant a turn enters `proposing`
      // with no slots yet, run ONE more agent turn: the model, now seeing
      // `proposing` + the replayed transcript, calls `propose_slots` and the
      // ranked free slots are offered in this same inbound message. An empty
      // message needs no synthetic lead line (verified: the proposing-state
      // system prompt + transcript is enough). Guarded to the ENTERING turn
      // only, so it can never loop; if the propose turn yields no slots (e.g.
      // calendar down), `result` is left as-is and the lead simply gets the
      // closing copy, exactly as before.
      if (
        preConversationState !== "proposing" &&
        result.state.conversationState === "proposing" &&
        result.state.fields.offeredSlots === undefined
      ) {
        await deps.transport.sendChatAction(update.telegramChatId, "typing");
        const proposeResult = await runIntakeTurn({
          state: result.state,
          message: "",
          ports,
          kbText,
          today: todayKyivDate(),
          history: [
            ...history,
            { role: "user", content: update.text },
            { role: "assistant", content: result.reply },
          ],
        });
        if (proposeResult.state.fields.offeredSlots !== undefined) {
          result = proposeResult;
        }
      }

      finalFields = result.state.fields;
      statePatch = capturedPatch;

      // `runIntakeTurn` swallows a `ModelPort.send()` rejection into this
      // exact sentinel reply (loop.ts's own "model unavailable" branch) — the
      // only pipeline-layer signal available, since the rejection itself
      // never propagates here.
      if (result.reply === ANTHROPIC_UNAVAILABLE_APOLOGY) {
        modelErrored = true;
      }

      // Step 5: deterministic guardrail copy always wins over the model's own
      // narration; an empty narration (a bare tool-use response, e.g.
      // cancel_request) never becomes an empty Telegram message.
      replyText = guardrailOverrideFor(result.toolCalls) ?? (result.reply.length > 0 ? result.reply : EMPTY_NARRATION_FALLBACK_COPY);

      // booking-hitl design.md Decision 2 (tasks.md C.5): a turn whose
      // `propose_slots` tool call actually applied carries real, tappable
      // slot-chip buttons AND the slot-offer copy — never the
      // PROFILE_COMPLETE_CLOSING_COPY "we'll come back" text, which would
      // contradict the very buttons shown beneath it.
      const proposedSlotsThisTurn = result.toolCalls.some(
        (call) => call.tool === "propose_slots" && call.outcome === "applied",
      );
      if (proposedSlotsThisTurn && result.state.fields.offeredSlots !== undefined) {
        replyText = SLOTS_OFFER_COPY;
        replyOptions = { buttons: buildSlotButtons(result.state.fields.offeredSlots) };
      }

      // Capture the conversational reply for the transcript AFTER any
      // slot-offer override (conversation-history slice) — persist what the
      // lead actually saw.
      assistantReplyForHistory = replyText;
    }

    if (isBrandNewLead) {
      replyText = `${ANTHROPIC_PROCESSING_NOTICE}\n\n${replyText}`;
    }

    // Conversation-history slice: append THIS free-text turn to the transcript
    // so the NEXT turn replays it (loaded above, before this write, so it
    // never sees the current message). The lead's message is always recorded —
    // even on a model error — so a transient Anthropic failure never erases
    // what the lead just said. The assistant reply is recorded only when the
    // turn actually produced one (not the deterministic unavailable-apology),
    // so a retry does not learn the bot "said" an apology. Callback turns are
    // never recorded (they resolve deterministically, outside the model's
    // replayed context — `assistantReplyForHistory` stays `undefined`).
    if (update.type === "text") {
      insertMessage(deps.db, { requestId: request.id, role: "user", content: update.text });
      if (!modelErrored && assistantReplyForHistory !== undefined) {
        insertMessage(deps.db, {
          requestId: request.id,
          role: "assistant",
          content: assistantReplyForHistory,
        });
      }
    }

    if (modelErrored) {
      // The run failed before any reply text was assembled for the lead —
      // no TEXT_MESSAGE_*/state event, just the run-boundary + the error
      // signal. The apology is still sent to the lead exactly as today.
      safePublish({
        type: "RUN_ERROR",
        threadId,
        message: "Anthropic model request failed for this turn.",
      });
    } else {
      const messageId = randomUUID();
      safePublish({ type: "TEXT_MESSAGE_START", messageId, threadId });
      safePublish({ type: "TEXT_MESSAGE_CONTENT", messageId, delta: replyText });
      safePublish({ type: "TEXT_MESSAGE_END", messageId });

      if (isBrandNewLead) {
        safePublish({ type: "STATE_SNAPSHOT", threadId, snapshot: finalFields });
      } else {
        safePublish({ type: "STATE_DELTA", threadId, delta: patchToJsonPatchOps(statePatch) });
      }
    }

    // Step 6: send, with the single-retry-with-apology rule on failure.
    await sendWithRetry(deps.transport, update.telegramChatId, replyText, replyOptions);
  } finally {
    // The run boundary always closes, even on the model-error path — never a
    // silent gap for the dashboard to hang on.
    safePublish({ type: "RUN_FINISHED", threadId, runId });
  }
}

/**
 * Composes the administrator-facing first-lesson brief from an
 * already-collected `RequestRow` (`@trace FR-INTAKE-01..06`). Pure,
 * synchronous, no I/O — see this file's header comment for the full pinned
 * contract, including the explicit skipped-field marker rule.
 *
 * Relocated to `@kamerton/lib/src/intake/first-lesson-brief.ts` (dashboard
 * tasks.md §5 "Relocation prerequisite") so `apps/dashboard`'s server-side
 * glue can reuse it without importing this package. `RequestRow` satisfies
 * the relocated function's structural `FirstLessonBriefInput` parameter type
 * (it has every field that type requires, plus more — TypeScript's
 * excess-property check does not apply to a variable passed through), so no
 * adapter is needed here; this is a plain re-export, not a wrapper.
 */
export const compileFirstLessonBrief = compileFirstLessonBriefFromLib;
