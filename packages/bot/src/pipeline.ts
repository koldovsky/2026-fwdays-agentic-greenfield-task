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
//        `skip_goal`, `"goal:<tag>"` -> `save_goal`. Slot-chip taps
//        (`"slot:<n>"`) and any other/unrecognised payload fall through to a
//        deterministic acknowledgement with no reducer call — a full
//        `request_hold` orchestration through this callback path is a named
//        gap left for the `dashboard`/`booking-hitl` slices, which are the
//        ones that actually render slot chips (this slice's own tests never
//        exercise a slot-chip tap). **`deps.model.send()` is NEVER called
//        for a callback update.** Then skip to step 6.
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

import type Database from "better-sqlite3";
import {
  insertLead,
  findLeadByTelegramUserId,
  insertRequest,
  updateRequestFields,
  updateRequestState,
  findLatestRequestForLead,
  updateBookingStatus,
  REQUEST_GOAL_TAGS,
  type RequestRow,
  type RequestState,
  type UpdateRequestFieldsInput,
} from "@kamerton/db";
import { runIntakeTurn, type LoopPorts } from "@kamerton/agent/src/loop.ts";
import type { ModelPort } from "@kamerton/agent/src/model-port.ts";
import { transition } from "@kamerton/lib/src/intake/state-machine.ts";
import type {
  CandidateFormat,
  GoalTag,
  IntakeEvent,
  IntakeFields,
  IntakeState,
  TransitionResult,
} from "@kamerton/lib/src/intake/state-machine.ts";
import type { CalendarPort } from "@kamerton/lib/src/slots/calendar-port.ts";
import {
  AGE_REFUSAL_COPY,
  SCOPE_EXPLANATION_COPY,
  FORMAT_UNSURE_COPY,
} from "@kamerton/lib/src/intake/copy.ts";
import { ANTHROPIC_PROCESSING_NOTICE, EMPTY_NARRATION_FALLBACK_COPY } from "./copy.ts";
import { TELEGRAM_SEND_FAILURE_APOLOGY } from "./apology.ts";
import type { InboundUpdate, TelegramTransport } from "./telegram-transport.ts";

/** Every external dependency `handleUpdate` needs for one turn — see this
 *  file's header comment for the exact role each plays. */
export interface HandleUpdateDeps {
  transport: TelegramTransport;
  db: Database.Database;
  model: ModelPort;
  calendar: CalendarPort;
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
async function sendWithRetry(transport: TelegramTransport, chatId: string, text: string): Promise<void> {
  try {
    await transport.sendMessage(chatId, text);
  } catch {
    await transport.sendMessage(chatId, TELEGRAM_SEND_FAILURE_APOLOGY);
  }
}

/** The wire-format-to-event mapping this module chose for button-callback
 *  updates (step 3) — a save/format/goal-option button maps to the matching
 *  `save_*`/`skip_*` reducer event. Anything this mapping does not recognise
 *  (including slot-chip taps, `"slot:<n>"` — a named gap, see this file's
 *  header comment) returns `null`: no reducer call is made for it. */
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
  return null;
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
 *  call"). */
function applyCallbackEvent(
  db: Database.Database,
  requestId: number,
  state: IntakeState,
  event: IntakeEvent,
): TransitionResult {
  const result = transition(state, event);

  if (result.error !== undefined) {
    return result;
  }

  if (result.state.conversationState !== state.conversationState) {
    updateRequestState(db, requestId, result.state.conversationState);
  }
  if (result.detour === null) {
    const patch = fieldPatchForCallbackEvent(event, result.state.fields);
    if (patch !== null) {
      updateRequestFields(db, requestId, patch);
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
  // Step 1: ALWAYS the very first call, before touching db/model at all.
  await deps.transport.sendChatAction(update.telegramChatId, "typing");

  // Step 2: resolve the current lead + request row.
  const { request, isBrandNewLead } = resolveLeadAndRequest(deps.db, update);

  let replyText: string;

  if (update.type === "callback") {
    // Step 3: callback updates NEVER reach ModelPort.send().
    const event = parseCallbackEvent(update.data);
    if (event === null) {
      replyText = EMPTY_NARRATION_FALLBACK_COPY;
    } else {
      const result = applyCallbackEvent(deps.db, request.id, rowToIntakeState(request), event);
      replyText = guardrailOverrideFor([result]) ?? EMPTY_NARRATION_FALLBACK_COPY;
    }
  } else {
    // Step 4: free text always goes through the agent tool-use loop.
    const ports: LoopPorts = {
      model: deps.model,
      persistence: {
        async saveFields(patch: Partial<IntakeFields>): Promise<void> {
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
    };

    const result = await runIntakeTurn({
      state: rowToIntakeState(request),
      message: update.text,
      ports,
    });

    // Step 5: deterministic guardrail copy always wins over the model's own
    // narration; an empty narration (a bare tool-use response, e.g.
    // cancel_request) never becomes an empty Telegram message.
    replyText = guardrailOverrideFor(result.toolCalls) ?? (result.reply.length > 0 ? result.reply : EMPTY_NARRATION_FALLBACK_COPY);
  }

  if (isBrandNewLead) {
    replyText = `${ANTHROPIC_PROCESSING_NOTICE}\n\n${replyText}`;
  }

  // Step 6: send, with the single-retry-with-apology rule on failure.
  await sendWithRetry(deps.transport, update.telegramChatId, replyText);
}

/** Ukrainian label for a `RequestFormat` column value — administrator-facing
 *  only, never sent to a lead (that copy lives in `@kamerton/lib`'s
 *  guardrail constants). */
function formatLabel(format: RequestRow["format"]): string {
  if (format === "individual") return "індивідуальні";
  if (format === "group") return "групові";
  return "—";
}

const GOAL_TAG_LABELS: Record<string, string> = {
  karaoke: "караоке",
  performance: "виступи",
  confidence: "впевненість у собі",
  hobby: "для задоволення",
  other: "інше",
};

function goalTagLabel(goalTag: RequestRow["goal_tag"]): string {
  if (goalTag === null) return "";
  return GOAL_TAG_LABELS[goalTag] ?? goalTag;
}

/**
 * Composes the administrator-facing first-lesson brief from an
 * already-collected `RequestRow` (`@trace FR-INTAKE-01..06`). Pure,
 * synchronous, no I/O. See this file's header comment for the full pinned
 * contract, including the explicit skipped-field marker rule.
 */
export function compileFirstLessonBrief(row: RequestRow): string {
  const lines: string[] = [];

  lines.push(`Учень/учениця: ${row.student_name ?? "—"}`);
  lines.push(`Вік: ${row.student_age ?? "—"}`);
  lines.push(`Формат: ${formatLabel(row.format)}`);

  if (row.goal_tag !== null || row.goal_text !== null) {
    const tagLabel = goalTagLabel(row.goal_tag);
    const detail = [tagLabel, row.goal_text ?? undefined].filter((part) => part !== undefined && part !== "");
    lines.push(`Мета занять: ${detail.length > 0 ? detail.join(" — ") : "—"}`);
  } else {
    lines.push("Мета занять: лід не назвав мету занять");
  }

  if (row.tastes !== null || row.dream_song !== null) {
    const parts: string[] = [];
    if (row.tastes !== null) parts.push(row.tastes);
    if (row.dream_song !== null) parts.push(`мрія-пісня: ${row.dream_song}`);
    lines.push(`Музичні смаки: ${parts.join("; ")}`);
  } else {
    lines.push("Музичні смаки: лід не назвав музичні смаки");
  }

  lines.push(`Досвід: ${row.experience ?? "—"}`);
  lines.push(`Комфорт зі співом: ${row.comfort ?? "—"}`);
  lines.push(`Бажані дні: ${row.preferred_weekdays ?? "—"}`);
  lines.push(`Бажаний час: ${row.preferred_time_range ?? "—"}`);

  return lines.join("\n");
}
