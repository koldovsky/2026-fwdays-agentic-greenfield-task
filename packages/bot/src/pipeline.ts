// TYPED THROWING STUB — red state for tasks.md section 5 (5.4's red half).
// The signatures and types below are the CONTRACT pinned by
// `pipeline.test.ts`; the bodies are implemented in tasks.md section 5's
// green half (NOT this pass — this pass is test-first RED only). No logic
// lives here yet — every exported function body is a single Not-implemented
// throw (same convention as every other red round in this codebase:
// age.ts, format.ts, state-machine.ts, loop.ts before their own green
// passes).
//
// This module composes design.md Decision 3's three-step grammY pipeline
// ("immediate ack -> state machine -> agent only for free text") on top of
// TWO already-green seams this pass reuses, never re-implements:
//   - `@kamerton/agent/src/loop.ts`'s `runIntakeTurn` (the tool-use loop,
//     tasks.md section 4 — already green) for the free-text path.
//   - `@kamerton/lib/src/intake/state-machine.ts`'s `transition()` (the
//     pure reducer, tasks.md section 2/3 — already green), called DIRECTLY
//     by this module for the button-callback path (design.md Decision 3:
//     "resolve without an agent call" — a callback never reaches
//     `ModelPort.send()`, so it never goes through `runIntakeTurn` either).
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
//       real connection (`openDatabase(":memory:")` in tests, per design.md
//       Decision 5's "real SQLite" testing-seam choice for this layer,
//       never a third fake port). This module is the ONLY place in
//       `packages/bot` that touches `@kamerton/db` directly; it maps
//       `runIntakeTurn`'s `PersistencePort`/`BookingStorePort` seams onto
//       real `leads`/`requests`/`bookings` row helpers (`@kamerton/db`'s
//       `insertLead`, `findLeadByTelegramUserId`, `insertRequest`,
//       `updateRequestFields`, `updateRequestState`, `findLatestRequestForLead`,
//       `updateBookingStatus`, plus one raw `SELECT ... FROM bookings WHERE
//       request_id = ? AND status = 'pending'` this module owns — no
//       `@kamerton/db` helper for that lookup exists yet, adding it is part
//       of this task's own green half, not a `packages/db` task).
//     - `model`: a `ModelPort` (`@kamerton/agent/src/model-port.ts`) —
//       `AnthropicModelPort` in production, `FakeModelPort`
//       (`@kamerton/agent/src/testing/fake-model-port.ts`) in tests. Passed
//       straight through to `runIntakeTurn`'s `ports.model` — this module
//       never calls `.send()` itself.
//     - `calendar`: a `CalendarPort` (`@kamerton/lib/src/slots/calendar-port.ts`)
//       — `FakeCalendarPort` (`@kamerton/lib/src/slots/fake-calendar.ts`) in
//       tests. This module is where `calendar.deleteEvent` gets pre-bound
//       into the `ReleaseHoldFn` shape `runIntakeTurn`'s `ports.releaseHold`
//       expects — `@kamerton/agent` itself never imports `CalendarPort`
//       directly (loop.ts's own header comment), so THIS is the boundary
//       where that binding happens, per design.md Decision 3.
//
//   ALGORITHM (every inbound update, in this exact order):
//
//     1. `await deps.transport.sendChatAction(update.telegramChatId, "typing")`
//        — ALWAYS the very first call this function makes, before touching
//        `deps.db` or `deps.model` at all (NFR-UX-01, design.md Decision 3
//        step 1: "the ack fires before step (2)/(3) even begins").
//
//     2. Resolve the CURRENT lead + request row:
//        a. `findLeadByTelegramUserId(db, update.telegramUserId)`.
//        b. If no lead exists: `insertLead(...)` (capturing
//           `telegramDisplayName` if the update carries one, FR-INTAKE-01's
//           "auto-captured, never asked"), then `insertRequest(...)` — a
//           fresh row, `state` defaulting to `'greeting'`. Mark
//           `isBrandNewLead = true` for step 5.
//        c. If a lead exists: `findLatestRequestForLead(db, lead.id)`. If
//           there is none, OR its `state` is a TERMINAL conversation state
//           (`'done'` | `'soft_decline'`), `insertRequest(...)` a NEW row
//           for this lead (FR-INTAKE-08's returning-lead/sibling path — a
//           brand-new profile, independent of any prior request's fields).
//           Otherwise, resume the existing non-terminal row as-is.
//        The row resolved by (b) or (c) is "the current request row" for
//        the rest of this turn. `isBrandNewLead` is `false` whenever a
//        lead already existed (even if this turn creates a NEW sibling
//        request row for them) — the Anthropic-processing notice (step 5)
//        fires ONCE per lead, ever, never once per request.
//
//     3. If `update.type === "callback"`: resolve the tap DIRECTLY against
//        `transition()` (a save/format/goal-option button maps to the
//        matching `save_*`/`amend` event; a slot-chip tap maps to a
//        `request_hold`-shaped orchestration against `deps.calendar` — the
//        exact `data` wire-format-to-event mapping table is this task's own
//        green-half design choice, not fixed here) and persist via the same
//        row helpers step 2 resolved. **`deps.model.send()` is NEVER called
//        for a callback update** (design.md Decision 3, tasks.md 5.4's
//        second bullet) — this is the one guarantee this contract pins
//        precisely for the callback path; the rest of its behaviour is a
//        green-half design choice. Then skip to step 6.
//
//     4. If `update.type === "text"`: build the current turn's `IntakeState`
//        from the resolved request row (`conversationState = row.state`;
//        `fields` = every non-null profile column, snake_case ->
//        `IntakeFields`'s camelCase keys — the exact inverse of
//        `@kamerton/db/src/requests.ts`'s `FIELD_COLUMN_BY_KEY` map), then
//        call `runIntakeTurn({ state, message: update.text, ports })` where
//        `ports.persistence`/`ports.bookingStore`/`ports.releaseHold` are
//        this module's thin adapters over `deps.db`/`deps.calendar`, scoped
//        to the CURRENT request row's id (`ports.persistence.saveFields`
//        calls `updateRequestFields(db, row.id, ...)`;
//        `ports.persistence.saveState` calls
//        `updateRequestState(db, row.id, ...)`;
//        `ports.bookingStore.findPendingBookingForCurrentRequest` looks up
//        the `pending` `bookings` row whose `request_id = row.id`, if any;
//        `ports.releaseHold` is `(eventId) => deps.calendar.deleteEvent(eventId)`).
//
//     5. Compute the FINAL reply text — deterministic guardrail copy
//        ALWAYS wins over the model's own narration (design.md Decision 1:
//        "guardrail copy is deterministic, never model-composed";
//        `runIntakeTurn` itself only returns the model's raw narration in
//        `result.reply`, so THIS is the layer that enforces that rule):
//          - if any `result.toolCalls[i].error === "AGE_BELOW_MIN"`:
//            `@kamerton/lib/src/intake/copy.ts`'s `AGE_REFUSAL_COPY`,
//            verbatim (`@trace FR-GUARD-04`).
//          - else if any `result.toolCalls[i].detour === "scope_violation"`:
//            `SCOPE_EXPLANATION_COPY`, verbatim (`@trace BC-SCOPE-01/02`).
//          - else if any `result.toolCalls[i].detour === "format_unsure"`:
//            `FORMAT_UNSURE_COPY`, verbatim (`@trace BC-FORMAT-01`).
//          - else: `result.reply` (the model's own narration, or
//            `ANTHROPIC_UNAVAILABLE_APOLOGY` verbatim when
//            `runIntakeTurn` itself already substituted it on a
//            `ModelPort.send()` rejection — no further override needed,
//            it already IS deterministic copy).
//        If `isBrandNewLead` (step 2b), PREPEND `copy.ts`'s (this package's
//        own `copy.ts`, not `@kamerton/lib`'s) `ANTHROPIC_PROCESSING_NOTICE`
//        to the final text, once, on this turn only (`@trace NFR-PRIV-02`).
//
//     6. `await deps.transport.sendMessage(update.telegramChatId, finalText)`.
//        If this THROWS (a Telegram-send failure, `@trace NFR-REL-01`): the
//        turn's DB writes already happened in step 4 BEFORE this call was
//        even attempted, so the lead's message is never lost regardless of
//        what happens next — catch the rejection and retry ONCE with
//        `apology.ts`'s `TELEGRAM_SEND_FAILURE_APOLOGY` (a SECOND
//        `sendMessage` call, not a repeat of `finalText`). If that retry
//        ALSO throws, let the rejection propagate — a second consecutive
//        Telegram outage is not a scenario this slice recovers from
//        further (the caller, grammY's own polling-loop error handler, is
//        the last resort).
//
//   `compileFirstLessonBrief(row: RequestRow) -> string`
//     A pure, synchronous formatter (no I/O) — composes a plain-text
//     Ukrainian brief for the administrator from an already-`proposing`-or-
//     later `RequestRow`'s collected columns (`@trace FR-INTAKE-01..06`):
//     `student_name`, `student_age`, `format`, `goal_tag`/`goal_text`,
//     `tastes`/`dream_song`, `experience`/`comfort`,
//     `preferred_weekdays`/`preferred_time_range`. Fields with NO skip
//     variant (name/age/format/experience/comfort/weekdays/time-range) are
//     validator-guaranteed non-null by the time a row reaches `proposing`
//     (the reducer's own completeness gate, `lib/src/intake/
//     state-machine.ts`'s `qualifyingComplete`/`collectingComplete`) — this
//     function does not re-validate that. `goal_tag`/`goal_text` and
//     `tastes`/`dream_song` DO have skip variants (`skip_goal`/
//     `skip_tastes`) and so may be `null`: a null goal or null tastes is
//     rendered as an EXPLICIT "лід не назвав мету занять" / "лід не назвав
//     музичні смаки" marker line, never silently omitted — so the
//     administrator can tell "asked and skipped" apart from a data gap.
//
// Framework-free of grammY/the SDK itself (this module imports only
// `telegram-transport.ts`'s `TelegramTransport` interface, never grammY);
// the only I/O this module performs is through its three injected ports
// (`transport`, `db`, `model`) plus `calendar` — never a concrete SDK
// client constructed inline (design.md Decision 5's testing-seam
// discipline, mirrored from `CalendarPort`/`ModelPort`).

import type Database from "better-sqlite3";
import type { RequestRow } from "@kamerton/db";
import type { ModelPort } from "@kamerton/agent/src/model-port.ts";
import type { CalendarPort } from "@kamerton/lib/src/slots/calendar-port.ts";
import type { InboundUpdate, TelegramTransport } from "./telegram-transport.ts";

/** Every external dependency `handleUpdate` needs for one turn — see this
 *  file's header comment for the exact role each plays. */
export interface HandleUpdateDeps {
  transport: TelegramTransport;
  db: Database.Database;
  model: ModelPort;
  calendar: CalendarPort;
}

/**
 * The grammY pipeline's update handler (design.md Decision 3): immediate
 * typing ack, then either a direct reducer call (button callback) or a full
 * agent-loop turn (free text), then a deterministic-guardrail-copy-aware
 * reply with Telegram-send-failure retry. See this file's header comment
 * for the full pinned algorithm (tasks.md 5.4's eleven behavioural
 * bullets, implemented in this task's green half).
 */
export async function handleUpdate(update: InboundUpdate, deps: HandleUpdateDeps): Promise<void> {
  void update;
  void deps;
  throw new Error("Not implemented — packages/bot/src/pipeline.ts handleUpdate (tasks.md 5.4 green half)");
}

/**
 * Composes the administrator-facing first-lesson brief from an
 * already-collected `RequestRow` (`@trace FR-INTAKE-01..06`). See this
 * file's header comment for the full pinned contract, including the
 * explicit skipped-field marker rule.
 */
export function compileFirstLessonBrief(row: RequestRow): string {
  void row;
  throw new Error(
    "Not implemented — packages/bot/src/pipeline.ts compileFirstLessonBrief (tasks.md 5.4 green half)",
  );
}
