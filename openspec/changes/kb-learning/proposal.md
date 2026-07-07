## Why

`kb-learning` is Slice S5 of the signed Phase 3 plan
(`docs/mvp-capability-plan.md` §S5, G3 2026-07-03) — the DAG's other final
fan-out node alongside `booking-hitl` (now archived), depending on S2
`intake` (the conversation loop that would trigger `answer_faq`/
`log_question`) and S3 `dashboard` (the shell that hosts the new Question
inbox panel), both archived. The baseline spec
`openspec/specs/kb-learning/spec.md` already passed G2 (8 requirements
covering FR-FAQ-01/02, FR-KB-01..04, FR-GUARD-02, FR-GUARD-06); this change
implements it against real code, a real `knowledge/school.md` file, and a
real Telegram chat.

Until this slice lands, `packages/agent/src/tools.ts`'s own header comment
records the deferral explicitly: `answer_faq`/`log_question` are "deliberately
NOT in this list... rely on a deterministic static-prompt fallback line
instead of a half-built KB feature." `packages/db/src/schema.ts` has no
`questions` table (only `leads`/`requests`/`bookings`/`notifications`).
`knowledge/school.md` does not exist. No dashboard route or panel reads or
writes a question. This change supplies all four.

## What Changes

- **A `questions` table** (`packages/db/src/schema.ts`, ADR-0001 §4 amendment)
  with `lead_id`, `request_id`, `telegram_chat_id`, `text`, `answer_source
  ('kb'|'unanswered')`, `status ('open'|'answered')`, `admin_answer`,
  `answered_at`, `delivery_status ('pending'|'delivered'|'failed')` — the
  `delivery_status` column lives directly on this row (per the baseline
  spec's own wording), not a separate outbox table, so the S4
  `notifications` outbox pattern is REUSED architecturally (drain loop,
  in-flight guard, oldest-first) but NOT literally shared.
- **A pure `lib/src/kb/` module** (TC-PURE-01): `validateAnswerText` (non-empty
  after trim, ≤3,500 chars) and `serializeKbEntry` (escapes/indents any
  admin-answer line that would otherwise start a new Markdown heading, so one
  submit always yields exactly one well-formed KB entry). No filesystem I/O
  lives in `lib/` — the actual `knowledge/school.md` read/append calls live at
  the two consuming package boundaries (`packages/agent` for the read side,
  `apps/dashboard` for the write side), mirroring the existing `CalendarPort`
  precedent (interface/pure logic in `lib/`, concrete I/O adapters at the
  edges).
- **Two new closed-tool-set members**, `answer_faq`/`log_question`
  (`packages/agent/src/tools.ts`), each a LOGGING-ONLY tool (the model still
  composes its own reply text, grounded in the knowledge base injected into
  its per-turn dynamic context — design.md Decision 1) — `tools.test.ts`'s
  static guardrail assertion is extended to confirm both exist and neither
  is a KB-write operation (`@trace FR-GUARD-06`).
- **Fresh-per-turn KB injection** (`packages/agent/src/system-prompt.ts`):
  `knowledge/school.md`'s full text is read on every turn and folded into the
  dynamic system-prompt block, so an administrator's inbox answer is usable by
  the very next lead conversation with no bot restart (FR-KB-03's "no restart"
  clause) — design.md Decision 1.
- **Deterministic question logging** wired into `packages/agent/src/loop.ts`'s
  tool dispatch: a new `QuestionsPort` on `LoopPorts`, a new `"logged"`
  `ToolCallOutcome` (deliberately excluded from the reply-assembly override
  that already exists for `save_*`/`pick_slot` outcomes, so the model's own
  KB-grounded narration reaches the lead unmodified) — design.md Decision 4.
- **A second bot-side drain loop** (`packages/bot/src/question-drain.ts`,
  mirroring `notification-drain.ts`'s shape) that delivers `answered` +
  `delivery_status='pending'` questions to their originating lead via
  Telegram — but, unlike S4's notification outbox, this drain deliberately
  never auto-retries a `failed` row: the baseline spec requires a visible,
  administrator-triggered retry action, not silent auto-retry (design.md
  Decision 2's named fork from the S4 precedent).
- **The Question-inbox panel** (`apps/dashboard/components/ds/QuestionInbox.tsx`)
  and its two route handlers (`GET/POST /api/questions`, `POST
  /api/questions/[id]` for the one-action answer, `POST
  /api/questions/[id]/retry` for the manual redelivery action) — the ONE
  panel this capability owns end-to-end, self-fetching (not folded into the
  existing AG-UI `STATE_SNAPSHOT`, a deliberate scope-narrowing call recorded
  in design.md).
- **A seed `knowledge/school.md`** with real placeholder content (format,
  duration, prices, group composition) so FR-FAQ-01 grounding has something to
  answer from on day one.

No requirement text in `openspec/specs/kb-learning/spec.md` changes in
substance; this change carries one small, deliberate refinement (a
previously-ambiguous edge state in the "Question-inbox panel" requirement —
see design.md's note and the delta below) plus the mechanical `MODIFIED`
wrapper OpenSpec strict validation requires for at least one delta per
change (same convention S1–S4 established).

## Capabilities

### New Capabilities

(none — `kb-learning` is an existing G2-passed baseline capability)

### Modified Capabilities

- `kb-learning`: one requirement (`Question-inbox panel`) gains a small
  clarifying clause + scenario resolving a genuine ambiguity the design
  surfaced (see design.md's own note); every other requirement carries a
  `MODIFIED` delta with the full, unedited baseline content, mapping cleanly
  onto the existing baseline names for the archive step (OpenSpec Option B).

## Impact

- **Packages touched:** `lib/` (new `lib/src/kb/`: `validate-answer.ts`,
  `serialize-entry.ts`, colocated tests), `packages/db` (new `questions`
  table + `packages/db/src/questions.ts` helpers), `packages/agent` (`tools.ts`
  gains two tool definitions; `loop.ts` gains `QuestionsPort` +
  `LoopPorts.questions` + the `"logged"` outcome + two new `applyToolUse`
  branches; `system-prompt.ts` gains the fresh-KB dynamic block and a rewritten
  FR-FAQ-02 static instruction; new `kb-context.ts` for the KB file read),
  `packages/bot` (new `question-drain.ts`; `pipeline.ts` binds `QuestionsPort`
  to `packages/db/src/questions.ts`; `index.ts` wires the new drain timer),
  `apps/dashboard` (new `QuestionInbox` component + `/api/questions*` routes;
  a new `apps/dashboard/lib/kb-write.ts` for the append side; `DashboardApp.tsx`
  gains one new section), root (`knowledge/school.md`, new file).
- **Test layers added:** unit (`lib/src/kb/*.test.ts`, `questions.test.ts`,
  `loop.test.ts` additions, `system-prompt.test.ts` additions,
  `question-drain.test.ts`), integration (real SQLite: full
  unanswered→admin-answers→lead-receives-answer loop; dashboard route tests
  against a fake filesystem/fake `TelegramTransport`), a guardrail eval
  (`evals/cases/fr-guard-02.eval.ts`) plus two FAQ evals
  (`evals/cases/fr-faq-01.eval.ts`, `fr-faq-02.eval.ts`), a static assertion
  extension (`tools.test.ts`), E2E (chrome-devtools/Playwright) for the
  Question-inbox panel with axe + a fresh vision-judge pass.
- **Non-goals for this slice:** inbox deduplication/frequency counters
  (`FR-KB-05`, Future), agent-drafted answers, automatic re-answering of every
  lead who asked the same question, a general KB editor UI, live SSE push for
  the inbox panel (it refreshes on each admin action and page load — see
  design.md's note on this scope-narrowing call).
- **Deferred, named with owner:** folding the Question-inbox panel into the
  existing AG-UI `STATE_SNAPSHOT`/SSE stream (would give the panel the same
  live-push guarantee the pending queue and HallMap already have) is left as a
  future hardening item, owned by whichever slice next touches the dashboard
  transport — not invented here, since the baseline spec's own scenarios are
  all admin-interaction-driven (open the panel, click an action), never
  "observe a push without acting."
