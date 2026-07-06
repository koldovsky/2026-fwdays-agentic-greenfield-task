## 1. Dependencies and database schema

- [x] 1.1 Confirm `@anthropic-ai/sdk` (`packages/agent`) and `grammy` +
      `dotenv` (`packages/bot`) are already dependencies (they are, per
      `package.json`) — no new package installs needed for this slice.
- [x] 1.2 Add `leads` and `requests` tables to `packages/db/src/schema.ts`
      per `design.md` Decision 4: `leads(id, telegram_user_id UNIQUE,
      telegram_chat_id, telegram_display_name, created_at)`;
      `requests(id, lead_id FK ON DELETE CASCADE, telegram_chat_id, state,
      student_name, student_age, format, goal_tag, goal_text, tastes,
      dream_song, experience, comfort, preferred_weekdays,
      preferred_time_range, created_at)` with the `state`/`format`/
      `goal_tag` CHECK constraints; add `idx_requests_lead_id`. Keep the
      `initSchema()` idempotency discipline (`CREATE TABLE IF NOT EXISTS`).
- [x] 1.3 Add `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS request_id
      INTEGER REFERENCES requests(id) ON DELETE SET NULL` to `initSchema()`
      — the column S1 deferred (`packages/db/src/schema.ts`'s own comment
      names this slice as owner). Confirm the bundled better-sqlite3/SQLite
      version supports `ADD COLUMN IF NOT EXISTS` (verified: 3.53.2).
      **Deviation:** empirically, SQLite's `ALTER TABLE` grammar has no
      `IF NOT EXISTS` clause for `ADD COLUMN` (verified against the bundled
      better-sqlite3@12.11.1 / SQLite 3.53.2 — it throws a syntax error, not
      a no-op); idempotency is instead achieved by checking
      `PRAGMA table_info(bookings)` before running a plain `ALTER TABLE ...
      ADD COLUMN request_id INTEGER REFERENCES requests(id) ON DELETE SET
      NULL` (see `ensureBookingsRequestIdColumn()` in `schema.ts`).
- [x] 1.4 Add `db.pragma("foreign_keys = ON")` to `openDatabase()`
      (`packages/db/src/index.ts`) so `ON DELETE CASCADE` actually fires
      (design.md Decision 4 / Risks).
- [x] 1.5 Write `packages/db/src/schema.test.ts` additions (or a new
      `leads-requests.test.ts`) confirming red first (tables/column don't
      exist yet): `leads`/`requests` tables are created, the CHECK
      constraints reject bogus `state`/`format`/`goal_tag` values, the
      `telegram_user_id` UNIQUE constraint rejects a duplicate, and deleting
      a `leads` row cascades to its `requests` and `bookings` rows
      (NFR-PRIV-02). Confirm red, then implement schema.ts to green.
- [x] 1.6 Write minimal row helpers in `packages/db/src/leads.ts` /
      `requests.ts` (mirroring `bookings.ts`'s `insertX`/`updateX` +
      `RETURNING *` style): `insertLead`, `findLeadByTelegramUserId`,
      `insertRequest`, `updateRequestFields`, `updateRequestState`,
      `findLatestRequestForLead`. Test-first (red → green), same file
      pairing convention as `bookings.ts`/`bookings.test.ts`.

## 2. Domain logic — write failing unit tests FIRST (red), from the baseline spec

- [x] 2.1 `lib/src/intake/age.test.ts`: `validateAge(9)` passes;
      `validateAge(3)` returns `{ ok: false, code: "AGE_BELOW_MIN" }`
      deterministically, no LLM involved (`@trace FR-GUARD-04`,
      `@trace FR-INTAKE-02`, BC-AGE-01). Confirm red.
- [x] 2.2 `lib/src/intake/format.test.ts`: `validateFormat("individual")`
      and `("group")` pass; `("unsure")` returns `FORMAT_UNSURE`;
      `("instrument")` returns `SCOPE_VIOLATION` (`@trace FR-INTAKE-02`,
      BC-SCOPE-01/02, BC-FORMAT-01). Confirm red.
- [x] 2.3 `lib/src/intake/audience.test.ts`: `addressesParent(7) === true`,
      `addressesParent(10) === false`, `addressesParent(14) === false`
      (`@trace FR-INTAKE-04`, BC-AGE-02). Confirm red.
- [x] 2.4 `lib/src/intake/copy.test.ts`: the age-refusal, scope-explanation,
      and format-unsure constants each contain no exclamation marks, no
      pressure vocabulary ("останнє місце"/"тільки сьогодні"/"поспішайте"),
      the age-refusal mentions "4", the scope-explanation never promises
      instrument lessons and offers a voice trial, the format-unsure
      explanation contains no digits (BC-PRICE-01 boundary)
      (`@trace FR-GUARD-04`, `@trace BC-BRAND-01`, `@trace BC-SCOPE-01`,
      `@trace BC-SCOPE-02`, `@trace BC-FORMAT-01`). Confirm red.
- [x] 2.5 `lib/src/intake/state-machine.test.ts` — happy path: `save_name`
      → `save_age(9)` → `save_format("individual")` advances `qualifying`
      → `profiling`; `save_goal`/`skip_goal`, `save_tastes`/`skip_tastes`,
      `save_experience_comfort` advance `profiling` → `collecting`;
      `save_weekdays` + `save_time_range` advance `collecting` →
      `proposing` (`@trace FR-INTAKE-01`, `@trace FR-INTAKE-02`,
      `@trace FR-INTAKE-03`, `@trace FR-INTAKE-04`, `@trace FR-INTAKE-05`,
      `@trace FR-INTAKE-06`). Confirm red.
- [x] 2.6 `state-machine.test.ts` — field-ownership gate: a `save_age` event
      while `conversationState === "profiling"` is rejected
      (`error: "FIELD_NOT_OWNED_BY_STATE"`), state/fields unchanged
      (`@trace FR-INTAKE-02`, ADR-0001 §6). Confirm red.
- [x] 2.7 `state-machine.test.ts` — minimum-age guardrail: `save_age(3)`
      transitions `conversationState` to `soft_decline` (terminal), no
      fields retained; a further `save_age`/`save_name` event while
      `soft_decline` is rejected with no state change (persuasion scenario)
      (`@trace FR-GUARD-04`, BC-AGE-01). Confirm red.
- [x] 2.8 `state-machine.test.ts` — no state at or after `proposing` is ever
      reachable with `studentAge < 4` (property-style: attempt every event
      sequence that tries to skip the age gate) (`@trace FR-INTAKE-02`).
      Confirm red.
- [x] 2.9 `state-machine.test.ts` — scope/format detours: `save_format
      ("instrument")` and `save_format("unsure")` each return `detour:
      "scope_violation"`/`"format_unsure"` with `conversationState`
      byte-identical before/after (still `qualifying`, `format` field
      unset) (`@trace FR-INTAKE-02`, BC-SCOPE-01/02, BC-FORMAT-01). Confirm
      red.
- [x] 2.10 `state-machine.test.ts` — amend mid-flow: an `amend` event on
      `studentAge` (6 → 7) from `profiling` re-validates and updates the
      field with `conversationState` unchanged; an amend that drops the age
      below 4 mid-`profiling` drives the same `soft_decline` transition a
      first-time violation would (`@trace FR-INTAKE-07`). Confirm red.
- [x] 2.11 `state-machine.test.ts` — amend changes addressing: combined with
      2.3's `addressesParent` helper, confirm the derived flag flips when
      age is amended 9 → 12 (computed live off `fields.studentAge`, never
      stored separately) (`@trace FR-INTAKE-07`, BC-AGE-02). Confirm red.
- [x] 2.12 `state-machine.test.ts` — cancel: a `cancel` event from
      `awaiting_admin` transitions `conversationState` to `done`
      (booking-status cancellation and hold release are proven at the
      agent-loop layer, section 4/5 — this test only proves the
      conversation-state half) (`@trace FR-INTAKE-07`). Confirm red.
- [x] 2.13 `state-machine.test.ts` — amend/save rejected after a terminal
      state: any `save_*`/`amend` event on a `conversationState: "done"`
      instance is rejected with `error: "TERMINAL_STATE"`, fields unchanged
      (`@trace FR-INTAKE-08`). Confirm red.
- [x] 2.14 `state-machine.test.ts` — returning lead / sibling: two
      independently-constructed `IntakeState` values (simulating two
      `requests` rows for the same lead) never share fields — asserted by
      construction (a fresh `initialIntakeState()` call has empty fields
      regardless of any other instance's history) (`@trace FR-INTAKE-08`).
      Confirm red.
- [x] 2.15 Run `npm run test:run` and confirm every test added in
      2.1–2.14 fails (red) before writing any implementation.
      **Confirmed:** 28 failed | 78 passed (106) — all 28 behavior tests
      (2.1–2.3, 2.5–2.14) fail on their stubs' Not-implemented throws;
      2.4's `copy.test.ts` content assertions are legitimately green
      because copy constants are plain literals with no behavior to stub
      (S1 precedent: `slots/propose.ts`'s apology constant shipped real
      text in its own red round); the 78 green are S1 `slots` + section-1
      db suites, untouched.

## 3. Domain logic — implement to green

- [x] 3.1 Implement `lib/src/intake/age.ts` (`validateAge`) to pass 2.1.
- [x] 3.2 Implement `lib/src/intake/format.ts` (`validateFormat`) to pass
      2.2.
- [x] 3.3 Implement `lib/src/intake/audience.ts` (`addressesParent`) to
      pass 2.3.
- [x] 3.4 Implement `lib/src/intake/copy.ts` (age-refusal,
      scope-explanation, format-unsure Ukrainian constants — design.md
      Decision 1's "guardrail copy is deterministic, never model-composed"
      rule) to pass 2.4.
      **Note:** already shipped real (non-stub) content in the 2.15 red
      round per that task's own precedent (S1 `propose.ts`'s apology
      constant); left byte-identical, untouched this pass — 2.4 was already
      green.
- [x] 3.5 Implement `lib/src/intake/state-machine.ts` (`transition()`, the
      `IntakeState`/`IntakeEvent`/`TransitionResult` types, field-ownership
      gates, the `detour` side-channel per design.md Decision 1) to pass
      2.5–2.14.
- [x] 3.6 Export the new `intake/` modules from `lib/src/index.ts`.
- [x] 3.7 Run `npm run test:run` and confirm 2.1–2.14 are now green with no
      regressions in the S1 `slots` suites.
      **Confirmed:** 106/106 passed (17 test files), zero regressions.

## 4. Services — agent tool-loop (red → green against a fake model port)

- [x] 4.1 Write `packages/agent/src/model-port.ts`: the `ModelPort`
      interface (`send(messages, tools) -> Promise<ModelResponse>`) and the
      fixed `MODEL_CONFIG` constant (`claude-sonnet-5`, thinking disabled —
      design.md Decision 2). No implementation yet.
- [x] 4.2 Write `packages/agent/src/testing/fake-model-port.ts`: a scripted
      `FakeModelPort` (queue of canned `ModelResponse`s) for deterministic
      loop tests.
- [x] 4.3 Write `packages/agent/src/tools.ts` tests FIRST
      (`tools.test.ts`): the tool set is exactly the closed list from
      design.md Decision 2 (`save_name`, `save_age`, `save_format`,
      `save_goal`, `skip_goal`, `save_tastes`, `skip_tastes`,
      `save_experience_comfort`, `save_weekdays`, `save_time_range`,
      `amend_field`, `cancel_request`, `explain_scope`, `explain_format`,
      `propose_slots`, `request_hold`) — a static assertion that no
      `confirm*`/`*kb*write*` tool name ever appears (`@trace FR-GUARD-01`,
      `@trace FR-GUARD-06`); `save_format`'s JSON schema enum is exactly
      `["individual","group","unsure","instrument"]`. Confirm red, then
      implement `tools.ts` to green.
      **Confirmed:** both `tools.ts` and `tools.test.ts` already existed,
      pre-shipped with real content per the file's own header comment (the
      same "plain data literal, no behaviour to fake" precedent as 2.4's
      `copy.test.ts`/S1 `propose.ts`) — green-by-nature, not a red round
      this pass owed. Verified all 6 assertions pass against the existing
      `TOOLS` array; left byte-identical, untouched.
- [x] 4.4 Write `packages/agent/src/loop.test.ts` FIRST (red), against
      `FakeModelPort`:
      - a scripted `save_name` tool-use response advances state and is
        deterministically logged regardless of the model's accompanying
        text (`@trace FR-INTAKE-01`, ADR-0001 §5 analog).
      - a scripted `save_format` tool-use response carrying `"instrument"`
        (simulating a model that ignores its own schema) is still rejected
        by `validateFormat` before any state mutation — defense in depth
        (`@trace FR-INTAKE-02`, BC-SCOPE-01/02).
      - a scripted plain-text (no tool-use) off-topic-shaped response is
        passed straight through to the reply with `transition()` never
        invoked — `IntakeState` before/after is reference-or-deep-equal
        (`@trace FR-GUARD-05`).
      - a scripted `cancel_request` tool-use response drives both the
        conversation-state `cancel` event AND the booking-release
        orchestration (fake booking store + fake `holdWithRecovery`
        release) (`@trace FR-INTAKE-07`).
      - a scripted `amend_field` (age 6 → 7) tool-use response
        re-validates and updates the persisted request row (fake
        persistence port) (`@trace FR-INTAKE-07`).
      - the `ModelPort.send()` call the loop makes always carries
        `MODEL_CONFIG` (thinking disabled, `claude-sonnet-5`) — a config
        assertion (`@trace TC-STACK-02`, `@trace NFR-UX-01`).
      Confirm every case red, then implement `loop.ts` to green.
      **Confirmed:** all 7 tests in `loop.test.ts` were red against the
      `Not implemented` throwing stub (verified before implementing);
      implemented `runIntakeTurn` (message → `ports.model.send(messages,
      TOOLS, MODEL_CONFIG)` → dispatch each `tool_use` block through
      `transition()`, defense-in-depth per the reducer's own
      `validateAge`/`validateFormat` calls, never trusting the model's
      accompanying text; persist only the reducer's own validated
      `fields`/`conversationState` via `ports.persistence`; orchestrate
      `cancel_request`'s booking-release via `ports.bookingStore`/
      `ports.releaseHold`; a plain-text response short-circuits before ever
      calling `transition()`, returning the SAME `state` reference). All 7
      tests now green; no test file touched.
- [x] 4.5 Write `packages/agent/src/apology.ts` (Anthropic-call-failure
      Ukrainian apology constant, design.md Decision 3) and a test
      confirming the loop returns this constant (no crash, state preserved)
      when `ModelPort.send()` rejects (`@trace NFR-REL-01`). Red then green.
      **Confirmed:** `apology.ts` already existed with real content (same
      "no behaviour to fake" precedent noted in its own header); its
      content assertions were already green. The genuinely red half —
      `apology.test.ts`'s "`runIntakeTurn` returns
      `ANTHROPIC_UNAVAILABLE_APOLOGY`, state preserved, no crash, when
      `ModelPort.send()` rejects" — is now green: `runIntakeTurn` wraps only
      the `ports.model.send()` call in try/catch (validation
      errors/rejections from the reducer are never thrown, only returned as
      `TransitionResult.error` — no over-broad catch). Left `apology.ts`
      untouched.
- [x] 4.6 Run `npm run test:run`; confirm 4.3–4.5 green with no regressions.
      **Confirmed:** 122/122 passed (20 test files), zero regressions in S1
      `slots` or S2 `lib/intake`/db suites. `tsc --noEmit` and `npm run
      lint` both clean.

## 5. Bot wiring and integration tests

- [x] 5.1 Write `packages/bot/src/telegram-transport.ts`: the
      `TelegramTransport` interface (`sendChatAction`, `sendMessage`,
      `onMessage`) and a thin grammY-backed production implementation.
      **Confirmed:** interface + `InboundUpdate`/`InboundTextUpdate`/
      `InboundCallbackUpdate`/`SendMessageOptions` types +
      `GrammyTelegramTransport` all shipped with real content (verified
      against the installed grammy@1.44.0 via ctx7 `/websites/grammy_dev`:
      `new Bot(token)`, `bot.on("message:text"/"callback_query:data", ...)`,
      `bot.api.sendChatAction`/`sendMessage`, `ctx.answerCallbackQuery()`) —
      the same "no behaviour to stub, only wiring" precedent as
      `model-port.ts`. `GrammyTelegramTransport` is deliberately NOT
      test-covered this pass (untestable without a live
      `TELEGRAM_BOT_TOKEN`/network, per this task's own "may be a typed
      throwing stub" caveat — shipped as thin real wiring instead, since it
      has nothing a red test could meaningfully assert on); it is exercised
      entirely through `FakeTelegramTransport` in `pipeline.test.ts`, and
      wired into a running process only in tasks.md 5.6 (out of this
      pass's scope).
- [x] 5.2 Write `packages/bot/src/testing/fake-telegram-transport.ts`: a
      `FakeTelegramTransport` recording every call and letting a test
      simulate an inbound update.
      **Confirmed:** shipped, real content — records `sendChatAction`/
      `sendMessage` calls on one shared, order-preserving timeline
      (`calls`/`callKinds`/`sentTexts`), supports a scripted
      `sendMessageFailures` count (NFR-REL-01's Telegram-outage scenario),
      and exposes `simulateUpdate()` for a later grammY-wiring test
      (tasks.md 5.6). Used directly by `pipeline.test.ts`.
- [x] 5.3 Write `packages/bot/src/apology.ts` (Telegram-send-failure
      Ukrainian apology constant, design.md Decision 3).
      **Confirmed:** shipped with real content in this red round — same S1
      `slots/propose.ts`/`packages/agent/src/apology.ts` "no behaviour to
      stub" precedent. Also added `packages/bot/src/copy.ts`
      (`ANTHROPIC_PROCESSING_NOTICE`, NFR-PRIV-02's one-line greeting
      disclosure — bot-owned copy that is not an apology-for-a-failure, per
      design.md Decision 3's colocation rule; `@kamerton/lib/src/intake/
      copy.ts` stays byte-identical/untouched). `copy.test.ts`/
      `apology.test.ts` content-shape assertions (voice rules, no tech
      jargon, mentions "Anthropic"/preserves the lead's message) are
      legitimately green immediately — the same 2.4/4.5 precedent this
      task's own brief names; the genuinely red half (that `pipeline.ts`
      actually SENDS these constants) is proven in `pipeline.test.ts`.
- [x] 5.4 Write `packages/bot/src/pipeline.test.ts` FIRST (red), against
      `FakeTelegramTransport` + `FakeModelPort` + a real in-memory SQLite
      (`openDatabase(":memory:")`):
      - `sendChatAction` is always the first call recorded on any inbound
        update, strictly before `sendMessage` (`@trace NFR-UX-01`).
      - a button-callback update (slot chip / goal option) resolves without
        any `ModelPort.send()` call (design.md Decision 3).
      - first message from a new `telegram_user_id` creates a `leads` row
        and a `requests` row in `greeting`→`qualifying`, and the greeting
        reply contains the Anthropic-processing notice sentence
        (`@trace NFR-PRIV-02`).
      - full happy-path transcript (name → age → format → goal → tastes →
        experience/comfort → weekdays → time range → `proposing`) persists
        matching column values on the real `requests` row, and the
        first-lesson brief is compilable from them with skipped fields
        explicitly marked (`@trace FR-INTAKE-01`..`06`).
      - age-3 path: `requests.state` ends at `soft_decline`, no `bookings`
        row is ever created, the Ukrainian refusal constant is sent
        verbatim (`@trace FR-GUARD-04`).
      - piano-format path: `explain_scope` fires, `requests.state` is
        unchanged (still `qualifying`), a follow-up "so a voice trial then"
        message resumes qualifying normally (`@trace FR-INTAKE-02`,
        BC-SCOPE-01/02).
      - off-topic-mid-profiling path: two turns — off-topic reply then the
        pending goal question is re-asked — `requests` row unchanged
        between turns except the untouched goal field remaining null
        (`@trace FR-GUARD-05`).
      - amend path: age corrected 6 → 7 mid-`profiling` updates the real
        `requests.student_age` column, conversation resumes
        (`@trace FR-INTAKE-07`).
      - cancel path: a `pending` `bookings` row (seeded via S1's fixture
        `CalendarPort`) moves to `cancelled` and its tentative event is
        deleted; the bot's confirmation reply is kind and Ukrainian
        (`@trace FR-INTAKE-07`).
      - returning-lead/sibling path: after a `requests` row reaches `done`,
        a new inbound message from the same `telegram_user_id` creates a
        **new** `requests` row starting at `qualifying`; the sibling
        variant asserts the new row's `student_name`/`student_age` differ
        from the first row's, and the first row is untouched
        (`@trace FR-INTAKE-08`).
      - Telegram-send-failure path: `FakeTelegramTransport.sendMessage`
        configured to throw once — the pipeline sends the deterministic
        Telegram apology on retry, the inbound message is not lost
        (`@trace NFR-REL-01`).
      Confirm every case red, then implement `pipeline.ts` (the update
      handler composing steps 1–3 of design.md Decision 3) to green.
- [x] 5.5 Write `tests/integration/agent/smoke.test.ts`: one tiny real
      round trip against the real `AnthropicModelPort`
      (`claude-sonnet-5`, local user-token auth) — a single scripted lead
      message ("Мене звати Оксана") asserts a `save_name` tool call
      happens. Guard with `describe.skipIf(...)` on missing
      `ANTHROPIC_AUTH_TOKEN`/local auth profile so it never blocks a
      machine without auth (design.md Decision 5).
- [x] 5.6 Wire `packages/bot/src/index.ts` to start the real grammY `Bot`
      with the production `TelegramTransport` + `AnthropicModelPort` +
      `openDatabase()`, reading `TELEGRAM_BOT_TOKEN`/`ANTHROPIC_AUTH_TOKEN`
      from `.env`/the local user-token profile (NFR-SEC-01) — no code path
      that could accept an Anthropic API key.
- [x] 5.7 Run `npm run test:run` and `npm run test:integration`; confirm
      5.4–5.5 green with no regressions in S1 `slots` suites.

## 6. Validation, review gate, and archive prep

- [x] 6.1 Run `npm run lint`.
- [x] 6.2 Run `npm run test:run` (all unit tests green, TC-TEST-01).
- [x] 6.3 Run `npm run test:integration` (5.4–5.5 green against real
      SQLite; the real-Anthropic smoke green or cleanly skipped).
- [x] 6.4 Run `npm run build`.
- [x] 6.5 Run `npx openspec validate intake --strict`.
- [x] 6.6 Run `npx openspec validate --all --strict` (baseline specs stay
      green, this change validates).
- [x] 6.7 Run `node scripts/check-traceability.mjs` (FR-INTAKE-01..08,
      FR-GUARD-04/05 show implemented coverage, 0 failures).
- [x] 6.8 **Review gate — run BEFORE archive** (S1 process-deviation
      lesson, `docs/current-state.md`: "review-gate ran post-archive —
      run it BEFORE archive next time"): a fresh reviewer pass (maker ≠
      checker) over the full diff against `openspec/specs/intake/spec.md`,
      `design.md`'s five decisions, and AGENTS.md's guardrail rules; record
      findings (confirmed/contested/fixed) in
      `openspec/changes/intake/review-findings.json`, same shape as the
      archived `slots` change's file. Fix or explicitly disposition every
      confirmed finding before proceeding to 6.9.
- [x] 6.9 Manual real-DB smoke test — SCRIPTED + PASSED (rerunnable
      `scripts/qa/manual-smoke-intake.mjs`, transcript
      `docs/qa/intake-manual-smoke.md`; `=== 6.9 SMOKE PASSED (all checks)
      ===`, 29 real ClaudeAgentModelPort round trips, exit 0). Drives the
      real `handleUpdate` pipeline through the real `claude` CLI + real
      on-disk SQLite; `FakeTelegramTransport` records outbound order for the
      NFR-UX-01 typing-before-reply check. Covered the orchestrator-selected
      subset: 1 (schema/migration + `bookings.request_id`), 3 (full happy
      path), 4 (age-3 → `soft_decline`, no booking), 5+6 (piano scope
      explanation then resume; off-topic folded in), 7 (amend age 6→7), 9
      (returning lead → fresh sibling `requests` row, first untouched).
      DEFERRED with reason (script header): step 8 (real DEMO-calendar
      hold→awaiting_admin→cancel) → S4 booking-hitl (propose_slots/
      request_hold not yet wired to a CalendarPort from the loop); step 10
      (break auth → apology) → already unit-tested deterministically in
      loop.test.ts, not repeated against the live token mid-run.
      **Live model surfaced 3 real bugs this scripted pass could catch that
      fakes could not** — fixed test-first before this PASS (see
      review-findings.json + commits 6b3dc35, d991a67, 5fd6c42):
      age re-ask; text-less-tool-call stall (code now owns the next
      question); amend-age-string wrongful soft_decline; explain_scope
      missing SCOPE_EXPLANATION_COPY.
      1. From a clean SQLite file, run the updated schema/migration; confirm
         `leads`, `requests` exist and `bookings.request_id` is present via
         `PRAGMA table_info(bookings)`.
      2. Start the real bot (`TELEGRAM_BOT_TOKEN` set) against a real
         Telegram test chat; send a first message and confirm the typing
         indicator appears before the greeting reply, and the greeting
         contains the Anthropic-processing notice.
      3. Walk the full happy path as a real lead (name, age 9, format
         individual, goal, tastes, experience/comfort, weekdays, time
         range) and confirm the resulting `requests` row in the SQLite file
         matches every answer given, and the compiled first-lesson brief is
         complete.
      4. Send an age-3 message from a second chat; confirm the Ukrainian
         refusal reply, `requests.state = 'soft_decline'`, and no
         `bookings` row created for that lead.
      5. Mid-flow, ask about piano lessons; confirm the voice-only
         explanation, then resume the flow normally after agreeing to a
         voice trial.
      6. Mid-flow, send an off-topic (e.g. political) message; confirm the
         redirect-and-resume behavior and that no fields were lost.
      7. Amend an already-answered field ("насправді їй 7, не 6"); confirm
         the SQLite row updates and the conversation resumes.
      8. Reach `awaiting_admin` (via S1's real DEMO-calendar hold path) and
         cancel; confirm the `bookings` row becomes `cancelled` and the
         tentative calendar event is deleted (visually confirm in the
         Google Calendar UI).
      9. From the same Telegram handle, message again after reaching a
         terminal state; confirm a new `requests` row is created and the
         previous one is untouched.
      10. Temporarily break `ANTHROPIC_AUTH_TOKEN`; send a message; confirm
          the deterministic Ukrainian apology fires with no crash; restore
          auth afterward.
- [x] 6.10 Updated `docs/current-state.md` (2026-07-06 ~17:05 Europe/Kyiv;
      S2 COMPLETE+ARCHIVED summary; next slice = S3 `dashboard`). README has
      no slice-status references (Ukrainian assignment only), so no change.
- [x] 6.11 Only after 6.1–6.10 all pass: `npx openspec archive intake
      --yes`. Gates before archive: 221 unit green, lint + build clean,
      openspec 6/6 strict, traceability 0 failures, trajectory 0 failures
      (review-findings clean).
