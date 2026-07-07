> Every implementation commit for this change carries `Refs: <FR ids from
> that task's own @trace tags>` and `Slice: kb-learning` trailers, per
> AGENTS.md's commit-msg hook — one commit per RED round and one per GREEN
> round, same discipline S1–S4 already followed. `@trace` tags below cite the
> FR/NFR/BC ids each task proves; design.md's own Decision numbers are cited
> where a task's shape comes from a specific decision, not the baseline spec
> directly.

## A. Database — `questions` table + query helpers

Write every test in this section FIRST and confirm it FAILS (red) against a
typed throwing stub before implementing (green) — same discipline as
S1–S4.

- [x] A.1 `packages/db/src/schema.test.ts` additions FIRST (red): a
      `questions` table exists after `initSchema()`; `answer_source` rejects
      a value outside `kb|unanswered`; `status` rejects a value outside
      `open|answered`; `delivery_status` rejects a value outside
      `pending|delivered|failed`; a row with a non-existent `lead_id` is
      rejected (FK enforced); deleting a `leads` row cascades to its
      `questions` rows; deleting a `requests` row sets the surviving
      `questions.request_id` to `NULL`, never deleting the row (`@trace
      FR-KB-01`, design.md Decision 4). Confirm red.
- [x] A.2 Implement `CREATE_QUESTIONS_TABLE` + `idx_questions_inbox` +
      `initSchema()` wiring (created after `leads`/`requests` exist) in
      `schema.ts` to pass A.1.
- [x] A.3 `packages/db/src/questions.test.ts` FIRST (red, real in-memory
      SQLite):
      - `insertQuestion` persists and round-trips every column;
        `status`/`delivery_status` default to `open`/`pending` when omitted
        (never insert-time parameters, mirroring `notifications.ts`'s own
        convention).
      - `findOpenInboxQuestions` returns an `open` row, an `answered`+
        `delivery_status='failed'` row, and an `answered`+
        `delivery_status='pending'` row (design.md Decision 2's closing
        note); it EXCLUDES an `answer_source='kb'` row and an `answered`+
        `delivery_status='delivered'` row; ordering is `created_at DESC`
        (newest first, `@trace FR-KB-02`).
      - `markQuestionAnswered(db, id, adminAnswer)` succeeds only when
        `status='open'` (sets `status='answered'`, `admin_answer`,
        `answered_at`, leaves `delivery_status='pending'`); calling it again
        on the now-`answered` row is a no-op (returns 0 changed, values
        unchanged) — the DB-level half of the baseline's stale-submit
        guarantee (`@trace FR-KB-03`).
      - `retryQuestionDelivery` succeeds only when `status='answered' AND
        delivery_status='failed'` (flips to `'pending'`); a no-op against a
        `'pending'`/`'delivered'` row or an `open` question (`@trace
        FR-KB-04`, design.md Decision 2's named fork).
      - `markQuestionDeliveryStatus(db, id, 'delivered'|'failed')` flips
        exactly one row, guarded `WHERE status='answered'`.
      - `findDeliverableQuestions` returns ONLY `status='answered' AND
        delivery_status='pending'` rows, ordered `id ASC` (oldest-first,
        FIFO) — a `delivery_status='failed'` row is NEVER returned (the
        explicit regression pin for design.md Decision 2's S4 divergence).
      Confirm every case red.
- [x] A.4 Implement `packages/db/src/questions.ts` (design.md Decision 4) to
      pass A.3.
- [x] A.5 Export `insertQuestion`, `findOpenInboxQuestions`,
      `findQuestionById`, `markQuestionAnswered`, `retryQuestionDelivery`,
      `markQuestionDeliveryStatus`, `findDeliverableQuestions`, and their
      row/input types from `packages/db/src/index.ts`.
- [x] A.6 Run `npm run test:run`; confirm A.1–A.5 green, zero regressions in
      the S1–S4 suites.

## B. Pure `lib/src/kb/` — answer validation + entry serialization

- [x] B.1 `lib/src/kb/validate-answer.test.ts` FIRST (red): an empty string
      and a whitespace-only string are both rejected `EMPTY`; a 3,501-
      character string is rejected `TOO_LONG` (naming the 3,500 bound); a
      string of exactly 3,500 characters passes; a normal short answer
      passes (`@trace FR-KB-03`). Confirm red.
- [x] B.2 Implement `lib/src/kb/validate-answer.ts` to pass B.1.
- [x] B.3 `lib/src/kb/serialize-entry.test.ts` FIRST (red): a plain
      question+answer serializes into one well-formed block containing both
      texts verbatim; an answer whose text includes a line starting with `#`
      (or `##`, `### `, etc.) has that line escaped/indented in the output so
      it is not a Markdown heading marker at line-start; multiple
      heading-like lines are all escaped; a normal (non-heading) line is
      untouched; appending the produced block to a fixture multi-entry KB
      string leaves every OTHER existing entry's boundaries unchanged — one
      call yields exactly one well-formed entry, never a split or duplicated
      one (`@trace FR-KB-03`). Confirm red.
- [x] B.4 Implement `lib/src/kb/serialize-entry.ts` (including a private
      `escapeHeadingLines` helper) to pass B.3.
- [x] B.5 Run `npm run test:run`; confirm B.1–B.4 green.

## C. Agent — tools, KB-in-context, loop wiring, guardrail assertion

- [x] C.1 `packages/agent/src/tools.test.ts` additions FIRST (red): `TOOLS`
      now includes `answer_faq` and `log_question`, each with a required
      `question: string` input and no other property (no answer/content
      payload — the model narrates the reply itself, it never hands the
      answer text to the tool); the closed `TOOL_NAMES` set-equality
      assertion is updated to the new full list; the existing "no
      `confirm*`/`*kb*write*` name" guardrail assertion explicitly checks
      both new names too (`@trace FR-GUARD-01`, `@trace FR-GUARD-06`).
      Confirm red.
- [x] C.2 Add the two tool definitions to `tools.ts` to pass C.1.
- [x] C.3 `packages/agent/src/kb-context.test.ts` FIRST (red):
      `readKnowledgeBaseText(path)` returns a fixture file's exact content
      when given its path; returns `""` (never throws) when the path does
      not exist (design.md Decision 1's "fails soft" contrast with the write
      side). Confirm red.
- [x] C.4 Implement `packages/agent/src/kb-context.ts` (repo-root resolution
      mirroring `packages/bot/src/index.ts`'s own convention) to pass C.3.
- [x] C.5 `packages/agent/src/system-prompt.test.ts` additions FIRST (red):
      `buildSystemPrompt` folds a supplied non-empty KB text VERBATIM into
      its output; the static block's rewritten FR-FAQ-02 instruction names
      `answer_faq`/`log_question` by name and enumerates the four
      BC-PRICE-01 categories (price, lesson duration, group
      composition/size, discounts); the OLD "that is a later capability, not
      this one" sentence is gone; an EMPTY KB string still produces a valid,
      non-crashing prompt (`@trace FR-FAQ-01`, `@trace FR-FAQ-02`, `@trace
      FR-GUARD-02`, design.md Decision 1). Confirm red.
- [x] C.6 Implement `buildKnowledgeBaseBlock` + wire it into
      `buildDynamicBlock`, thread the KB text through `buildSystemPrompt`'s
      signature (pin the exact parameter shape `system-prompt.test.ts`
      asserts), and rewrite the static FR-FAQ-02 sentence, to pass C.5.
- [x] C.7 `loop.ts` contract additions (design.md Decision 4, type-only, no
      behavior change yet — mirrors booking-hitl's own "contract-then-test"
      C.2 precedent): add `QuestionsPort`, the `questions` field on
      `LoopPorts`, and the `"logged"` `ToolCallOutcome` member.
- [x] C.8 `packages/agent/src/loop.test.ts` additions FIRST (red), against a
      fake `QuestionsPort`:
      - an `answer_faq` tool-use call invokes
        `ports.questions.logAnsweredFromKb` with the question text and logs
        outcome `"logged"`, WITHOUT ever calling `transition()` — `state` is
        the SAME reference as the input (`@trace FR-KB-01`).
      - a `log_question` tool-use call invokes `logUnanswered` and logs
        `"logged"`, same same-reference invariant (`@trace FR-KB-01`, `@trace
        FR-FAQ-02`).
      - a PURE FAQ turn (only `answer_faq`/`log_question` called, no other
        tool) returns the model's own narrated text VERBATIM as `reply` —
        NOT the deterministic ack+next-question composer (`@trace FR-FAQ-01`,
        design.md Decision 4's "logged ≠ applied" rule).
      - a MIXED turn (`save_tastes` applied AND `log_question` logged in the
        same response) still produces the deterministic ack+next-question
        reply, with the model's own narration as the ack prefix — a
        regression pin proving combined turns are unchanged.
      - a `QuestionsPort` method rejecting is caught by the EXISTING
        `applyToolUse` try/catch and returns the shared apology with `state`
        preserved (`@trace NFR-REL-01`) — note for the implementer: confirm
        with the review-gate stage (I.1) whether this reuses
        `CALENDAR_UNAVAILABLE_APOLOGY` as-is or a renamed/new constant per
        design.md Decision 4's flag, and pin whichever is chosen.
      Confirm every case red.
- [x] C.9 Implement `applyToolUse`'s `answer_faq`/`log_question` branches and
      the reply-assembly `"logged"` exclusion in `loop.ts` to pass C.8.
- [x] C.10 Run `npm run test:run`; confirm C.1–C.9 green, zero regressions in
      the existing `loop.test.ts`/`tools.test.ts`/`system-prompt.test.ts`
      suites (S2/S4's own cases untouched).
- [x] C.11 `packages/bot/src/pipeline.test.ts` additions FIRST (red), against
      real in-memory SQLite: binds a real `QuestionsPort` (pre-applying the
      current turn's `lead_id`/`request_id`/`telegram_chat_id`) to
      `packages/db/src/questions.ts`'s `insertQuestion` — a lead's
      KB-answerable message drives a real `questions` row with
      `answer_source='kb'`; an unanswerable message drives a row with
      `answer_source='unanswered'`, `status='open'` (`@trace FR-KB-01`).
      Confirm red, implement the `pipeline.ts` wiring to green.
- [x] C.12 Run `npm run test:run` and `npm run test:integration`; confirm
      C.11 green, zero regressions in S2/S4's own `pipeline.test.ts` suites.

## D. Bot — question-answer delivery drain (manual-retry-only)

- [x] D.1 `packages/bot/src/question-drain.test.ts` FIRST (red), against
      `FakeTelegramTransport` + real in-memory SQLite: `drainQuestionDeliveries`
      sends the admin's answer for every `status='answered' AND
      delivery_status='pending'` row and marks it `delivered` on success; a
      `FakeTelegramTransport` configured to throw marks the row `failed`
      WITHOUT throwing out of `drainQuestionDeliveries`; a `delivered` row is
      never resent on a later call; **a `delivery_status='failed'` row is
      NEVER selected by a subsequent call** — the explicit regression pin
      for design.md Decision 2's fork from the S4 auto-retry precedent; a
      `status='open'` row is never touched (`@trace FR-KB-04`, `@trace
      NFR-REL-01`). Confirm red.
- [x] D.2 Implement `packages/bot/src/question-drain.ts` to pass D.1.
- [x] D.3 Wire `packages/bot/src/index.ts`: a second `setInterval` calling
      `drainQuestionDeliveries`, alongside the existing notification-drain
      timer — its own in-flight guard, its own try/catch (one bad tick on
      either drain never stops the other or crashes the process). Deliberately
      NOT unit-tested here, same "live wiring, no behavior to fake"
      precedent as the S4 drain wiring; fully covered by D.1.
- [x] D.4 Run `npm run test:run`; confirm D.1–D.2 green.

## E. Dashboard — Question-inbox panel + routes

- [x] E.1 `apps/dashboard/lib/kb-write.test.ts` FIRST (red, a real tmp-dir
      fixture file): `appendKbEntry(path, entry)` appends the exact entry
      text to an existing file, preserving prior content; throws when the
      target path's directory does not exist (simulating "not writable" —
      `@trace FR-KB-03`). Confirm red, implement `apps/dashboard/lib/kb-write.ts`
      to green.
- [x] E.2 `apps/dashboard/app/api/questions/route.test.ts` FIRST (red, real
      SQLite): `GET` returns the open-inbox list (design.md Decision 2/4's
      visibility rule) as JSON, newest-first; returns `[]` (never an error)
      when there are none (`@trace FR-KB-02`). Confirm red, implement the
      route to green.
- [x] E.3 `apps/dashboard/app/api/questions/[id]/route.test.ts` FIRST (red,
      real SQLite + a fixture `knowledge/school.md` path):
      - happy path: the fixture file is appended with the escaped entry; the
        row is marked `answered` (`admin_answer`/`answered_at` set,
        `delivery_status` stays `'pending'`) (`@trace FR-KB-03`).
      - empty answer → inline `{status:"invalid", code:"EMPTY", ...}`-shaped
        `200` (or `400`, pin whichever the leads/decisions route precedent
        uses — never a raw `500`), nothing written to the file or the row
        (`@trace FR-KB-03`).
      - a 3,501-character answer → inline error naming the 3,500-character
        limit, nothing written (`@trace FR-KB-03`).
      - an answer containing a heading-like line → the appended file content
        (asserted directly against the fixture file) contains that line
        escaped, still exactly one new entry (`@trace FR-KB-03`).
      - stale submit (question already `answered`) → no-op: file
        byte-identical before/after, row's `status`/`admin_answer`/
        `answered_at` unchanged, no Telegram-delivery row state touched
        (`@trace FR-KB-03`).
      - simulated append failure (point the route at an unwritable/missing
        directory) → the question stays `open`, an inline error naming the
        failure, never a raw `500` (`@trace FR-KB-03`, `@trace NFR-REL-01`).
      Confirm every case red, implement the route to green.
- [x] E.4 `apps/dashboard/app/api/questions/[id]/retry/route.test.ts` FIRST
      (red): a `status='answered' AND delivery_status='failed'` row flips to
      `'pending'`; a `'pending'`/`'delivered'` row is an untouched no-op
      (stale click); a `status='open'` question is rejected/no-op (`@trace
      FR-KB-04`). Confirm red, implement to green.
- [x] E.5 Run `npm run test:run` and `npm run test:integration`; confirm
      E.1–E.4 green.
- [x] E.6 `apps/dashboard/components/ds/QuestionInbox.test.tsx` FIRST (red,
      React Testing Library, mirroring `DecisionBar.test.tsx`'s own shape):
      an empty inbox renders an explicit `EmptyState` (never a blank area,
      `@trace FR-KB-02`); a populated list renders each open question,
      newest first; an `answered`+`delivery_status='failed'` row renders
      visually distinct from an open row, with a retry action and no answer
      form (`@trace FR-KB-04`); submitting an answer POSTs to
      `/api/questions/[id]`, shows an inline error on an `invalid`-shaped
      response (never crashes), and removes the row from local state on a
      successful response (design.md Decision 2's client-optimistic removal,
      `@trace FR-KB-03`); clicking retry POSTs to the retry route and shows
      the outcome message (`@trace FR-KB-04`). Confirm red.
- [x] E.7 Implement `QuestionInbox.tsx` to pass E.6.
- [x] E.8 Wire `QuestionInbox` into `apps/dashboard/app/DashboardApp.tsx` as a
      new `<section aria-label="Питання лідів">`, self-fetching on mount (not
      threaded through the server-rendered `initialSnapshot` — design.md
      Decision 2's own "not folded into `STATE_SNAPSHOT`" call).
- [x] E.9 Seed `knowledge/school.md` at the repo root with real placeholder
      content (lesson format, duration, prices, group composition/size) —
      enough for stage H's evals and stage J's manual smoke to have real
      facts to probe (`@trace FR-FAQ-01`).
- [x] E.10 Run `npm run lint`, `npm run test:run`, `npm run test:integration`;
      confirm E.1–E.9 green, zero regressions in S3/S4's own
      `DashboardApp`/route suites.

## F. Integration — the full unanswered→admin-answers→lead-receives-answer loop

- [x] F.1 `tests/integration/kb-learning/full-flow.test.ts` (real SQLite,
      `FakeTelegramTransport`, a real tmp `knowledge/school.md` fixture):
      - a lead asks a KB-covered question → an `answer_faq` row
        (`answer_source='kb'`), the reply is grounded, no inbox entry
        appears.
      - a lead asks an uncovered question → a `log_question` row
        (`unanswered`, `open`), visible via `findOpenInboxQuestions`.
      - the admin answers via the route → the fixture file is appended, the
        row is `answered` + `delivery_status='pending'`.
      - a drain tick delivers it → `delivered`, the row leaves the inbox
        query's result.
      - a delivery failure (transport configured to throw once) → `failed`,
        stays in the inbox query's result with retry eligibility.
      - the retry route flips it to `'pending'` → the next drain tick
        delivers it.
      - a NEW lead asks the SAME previously-uncovered question in a fresh
        conversation → answered from the KB this time (`answer_source='kb'`,
        no restart — `@trace FR-KB-03`).
      (`@trace FR-FAQ-01`, `@trace FR-FAQ-02`, `@trace FR-KB-01..04`).
- [x] F.2 Run `npm run test:integration`; confirm F.1 green.

## G. Rendered-UI gate — axe + vision-verify on the Question-inbox panel

- [x] G.1 Seed a dashboard fixture DB with: one open unanswered question, one
      `answered`+`delivery_status='failed'` question, one `answer_source='kb'`
      question (must never render), and an otherwise-empty-inbox variant.
- [x] G.2 chrome-devtools MCP (or Playwright, per `docs/current-state.md`'s
      documented fallback) — `@trace TC-TEST-03`: capture stills for the
      empty inbox, the populated inbox (open + failed rows visually
      distinct), the answer form's inline validation error, and the
      retry/outcome message.
- [x] G.3 Run `node scripts/check-a11y.mjs` (light + dark) against the
      populated route; fix any serious/critical violation (answer-form focus
      order, `aria-live` on the outcome message) before proceeding.
- [x] G.4 Launch a fresh `vision-judge` pass (maker ≠ checker) on the settled
      stills: does it visibly demonstrate FR-KB-02 (newest-first list) and
      FR-KB-04's failed/retry state as distinct from an open question?
      Record `met`/`readable`/`notes` in
      `docs/qa/kb-learning/manifest.json`; a `not met`/`not readable` verdict
      blocks this task until fixed and re-recorded.
- [x] G.5 Run `node scripts/check-recordings.mjs`; confirm the manifest's
      claims are backed by real files on disk.

## H. Evals — FR-GUARD-02, FR-FAQ-01/02

- [x] H.1 Write `evals/cases/fr-guard-02.eval.ts`: cases spanning the four
      BC-PRICE-01 categories (price, lesson duration, group
      composition/size, discounts) × {present-in-KB, absent-from-KB}, plus
      a "pressured for a number" variant (mirroring the baseline spec's own
      "ну приблизно, скільки дітей у групі — 5? 10?" scenario) and a
      locale-formatted-number variant ("1200 грн" in the KB vs. "1 200 грн"
      in the reply, graded as a MATCH, not a violation) — driving real turns
      via `runIntakeTurn`/`ClaudeAgentModelPort` with a real fixture
      `knowledge/school.md` text supplied through the KB block.
      `dimension: guardrail-integrity` (joins `fr-guard-01`'s own
      dimension). Rubric performs the normalized-number comparison as a
      reading-comprehension judgment (design.md Decision 3), never a
      runtime computation.
- [x] H.2 Write `evals/cases/fr-faq-01.eval.ts`: a KB-covered question asked
      in Ukrainian and the SAME question asked in another language, grading
      "every factual claim is traceable to the KB text" and "the reply is
      Ukrainian regardless of the question's language." `dimension:
      faq-grounding` (new).
- [x] H.3 Write `evals/cases/fr-faq-02.eval.ts`: an uncovered question,
      grading "no substantive answer is given," "the administrator-will-
      clarify promise is present," and "a `log_question` tool call occurred"
      (structural, read off `toolCalls`). `dimension: faq-grounding`.
- [x] H.4 Run the `eval-suite` workflow (fresh `eval-judge` agent, maker ≠
      checker) for `fr-guard-02`/`fr-faq-01`/`fr-faq-02`; record verdicts in
      `docs/qa/eval-report.md`; run `node scripts/check-eval-ratchet.mjs`
      (`guardrail-integrity` now averages `fr-guard-01` + `fr-guard-02`;
      `faq-grounding` is a first-entry baseline per the ratchet's own
      `--update` convention).

## I. Review gate — run BEFORE archive (S1 process lesson, repeated every slice since)

- [x] I.1 A fresh reviewer pass (maker ≠ checker) over the full diff against
      `openspec/specs/kb-learning/spec.md` (scenario-by-scenario),
      `design.md`'s five decisions, and AGENTS.md's guardrail rules —
      explicitly confirm: (a) no tool in `tools.ts`'s `TOOLS` accepts an
      answer/content payload for `answer_faq`/`log_question` beyond
      `question` (`@trace FR-GUARD-06`); (b) the ONLY place
      `knowledge/school.md` is ever WRITTEN in the whole diff is
      `apps/dashboard/lib/kb-write.ts` — `packages/agent`/`packages/bot`
      only ever read it (`@trace FR-GUARD-06`); (c) `findDeliverableQuestions`
      (grep-level check) never selects a `delivery_status='failed'` row
      (`@trace FR-KB-04`, design.md Decision 2); (d) the
      `CALENDAR_UNAVAILABLE_APOLOGY` reuse flagged in design.md Decision 4 is
      explicitly dispositioned (fixed with a renamed/new constant, or
      recorded as accepted debt with a reason) — not left silently
      ambiguous. Record findings in
      `openspec/changes/kb-learning/review-findings.json`, same shape as the
      archived slices' files. Fix or explicitly disposition every confirmed
      finding before proceeding.
- [x] I.2 Confirm the `fr-guard-02`/`fr-faq-01`/`fr-faq-02` eval verdicts are
      all recorded and pass every rubric line marked CRITICAL — a CRITICAL
      failure blocks this task until fixed and re-graded.

## J. Validation, docs, and archive prep

- [x] J.1 Run `npm run lint`.
- [x] J.2 Run `npm run test:run` (all unit tests green).
- [x] J.3 Run `npm run test:integration` (sections C/D/E/F's real-SQLite
      suites green).
- [x] J.4 Run `npm run test:e2e` (section G's chrome-devtools/Playwright
      pass).
- [x] J.5 Run `npm run build`.
- [x] J.6 Run `npx openspec validate kb-learning --strict`.
- [x] J.7 Run `npx openspec validate --all --strict` (baseline specs stay
      green, this change validates).
- [x] J.8 Run `node scripts/check-traceability.mjs` (FR-FAQ-01/02,
      FR-KB-01..04, FR-GUARD-02/06 show implemented coverage, 0 failures).
- [x] J.9 Run `node scripts/check-eval-ratchet.mjs` (green, or a deliberate
      baseline update per H.4).
- [x] J.10 Run `node scripts/check-a11y.mjs` and
      `node scripts/check-recordings.mjs` once more against the final build
      (not just the dev server used mid-implementation).
- [x] J.11 Manual real-DB smoke test — SCRIPTED + rerunnable
      (`scripts/qa/manual-smoke-kb-learning.mjs`, transcript
      `docs/qa/kb-learning-manual-smoke.md`, mirroring the S1–S4
      convention):
      1. From a clean SQLite file, run the updated schema; confirm
         `questions` exists via `PRAGMA table_info`.
      2. Start the real bot against a real Telegram test chat; ask a
         KB-covered question (from the seeded `knowledge/school.md`);
         confirm the reply is grounded and a `kb` row appears in the DB.
      3. Ask an uncovered question; confirm the "адміністраторка уточнить"
         reply, an `unanswered`/`open` row in the DB, and that it appears on
         the real dashboard's Question-inbox panel.
      4. On the real dashboard, answer it; confirm `knowledge/school.md` on
         disk now contains the new entry, the row is `answered`, and within
         a few seconds (the drain tick) the SAME lead's real Telegram chat
         receives the admin's answer.
      5. Ask the SAME previously-uncovered question again from a DIFFERENT
         lead/chat; confirm it is now answered straight from the KB
         (`answer_source='kb'`, no bot restart — FR-KB-03's own demo-proof
         moment).
      6. Force a delivery failure (e.g. temporarily break the transport);
         confirm the panel shows the row `failed` with a retry action;
         restore the transport and click retry; confirm delivery on the next
         tick.
      7. Submit an empty answer and a 3,501-character answer on two
         different open questions; confirm inline errors and that neither
         the file nor the DB row changed.
      8. Re-submit an answer on an already-answered question (stale tab);
         confirm no new file entry, no row change, no second Telegram
         message.
      Confirm `=== J.11 SMOKE PASSED (all checks) ===` before proceeding.
- [x] J.12 Update `docs/current-state.md` (date/time, Europe/Kyiv; S5
      `kb-learning` COMPLETE+ARCHIVED summary; note this closes the signed
      Phase 3 DAG — all 5 MVP slices archived, all 30 MVP FRs implemented).
      Check whether `README.md` references slice status (S1–S4 precedent: it
      does not) and update only if it does.
- [x] J.13 Only after J.1–J.12 all pass: `npx openspec archive kb-learning
      --yes`. Gates before archive: all unit/integration/E2E green, lint +
      build clean, openspec 2/2 strict (`kb-learning` + `--all`),
      traceability 0 failures, a11y 0 serious/critical violations,
      recordings backed by real files, `review-findings.json` clean, eval
      ratchet green (both `guardrail-integrity` and `faq-grounding`), manual
      smoke (J.11) passed.
