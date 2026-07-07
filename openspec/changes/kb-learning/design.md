## Context

The baseline spec (`openspec/specs/kb-learning/spec.md`) already settles
*what* this capability does: KB-grounded FAQ answers, a deterministic
"administrator will clarify" promise for everything else, deterministic
question logging, a Question-inbox panel, a one-action admin answer that
grows the KB, answer delivery back to the lead, and the two structural
guardrails (FR-GUARD-02: no invented prices/terms; FR-GUARD-06: no agent
KB-write tool). What the baseline spec deliberately does NOT settle — because
it is a behavioral contract, not an implementation plan — is: where the KB
text enters the model's context, which process delivers an admin's answer
back to Telegram and how a delivery failure is retried, how FR-GUARD-02 is
actually enforced at runtime vs. at eval-judge time, the exact `questions`
table shape, and the ordering discipline that keeps the KB file and the DB
row from diverging. Those five questions are this design's five decisions.

Two established precedents this design deliberately reuses rather than
reinvents: `booking-hitl`'s SQLite-outbox-drained-by-the-bot pattern (S4,
`openspec/changes/archive/2026-07-07-booking-hitl/design.md` Decision 1) for
cross-process delivery, and the `CalendarPort` split (a plain interface +
pure logic in `lib/`, a concrete I/O adapter at the package boundary) for
where filesystem access to `knowledge/school.md` lives. Decision 2 below
names the ONE place this design deliberately DIVERGES from the S4 precedent
(auto-retry vs. manual retry) and explains why the divergence is required by
this capability's own baseline spec, not a stylistic preference.

This change's own `specs/kb-learning/spec.md` delta is `MODIFIED
Requirements` for every one of the baseline's eight requirements (OpenSpec
strict validation requires at least one delta per change — the same
mechanical requirement S1–S4 already satisfied this way). Seven of the eight
carry no text change. The eighth (`Question-inbox panel`) gains one small,
genuine clarification — flagged in Decision 2's own note below — because this
design surfaced a real ambiguity in how the baseline's two inbox-visibility
sentences interact at the exact moment an admin answer is submitted but not
yet delivered.

## Goals / Non-Goals

**Goals:**
- Keep every guardrail-critical fact in deterministic code, never the
  model's discretion: which `answer_source` a question gets, whether a
  number the model states is actually present in the KB (checked by the
  eval judge against a frozen KB snapshot, not a runtime parser — Decision
  3), and the two-write ordering that keeps `knowledge/school.md` and the
  `questions` row from ever diverging (Decision 5).
- Make an inbox answer usable by the very next lead conversation with **no
  bot restart** — the baseline spec's own explicit FR-KB-03 scenario name
  (Decision 1).
- Reuse the S4 outbox architecture's SHAPE (a durable `delivery_status`
  column, a bot-side drain loop, an in-flight guard) without reusing its
  literal table or its auto-retry policy, since this capability's baseline
  spec explicitly requires a *visible, administrator-triggered* retry
  affordance (Decision 2).
- Keep `lib/` exactly as pure as every prior slice left it: this is the
  first slice whose domain concept (a knowledge-base file) lives on disk, and
  the temptation to let `lib/` touch `fs` is resisted the same way `lib/`
  never touched a real Calendar SDK — the port/adapter split is applied here
  too, not waived because the I/O feels "simple" (Decision 5's own note).

**Non-Goals:**
- Inbox deduplication or frequency counters (`FR-KB-05`, Future) — the
  baseline spec's own Exclusions section already names this; unchanged here.
- A general knowledge-base editor UI — the two write paths stay a direct file
  edit and the inbox's one-action answer, per FR-KB-03's own wording.
- Live SSE push for the Question-inbox panel (see Decision 2's closing
  note) — every baseline scenario is admin-interaction-driven, never
  "observe a push without acting."
- A runtime numeric-extraction guard over the model's free Ukrainian text
  (Decision 3) — deliberately rejected, not merely deferred; see that
  decision's own alternatives-rejected table for why.

## Decisions

### Decision 1: KB injection — read `knowledge/school.md` fresh, per turn, into the dynamic system-prompt block

**The real decision: WHEN does the model see the knowledge base's current
contents, and WHERE in the existing prompt architecture does that text
live?** `packages/agent/src/system-prompt.ts` already splits into a STATIC
block (voice + guardrail rules, byte-identical every call) and a DYNAMIC
block (`buildDynamicBlock`, rebuilt fresh from the turn's `IntakeState` every
call) — the KB text is a THIRD kind of context: neither static (it changes
whenever an admin answers a question) nor conversation-state-derived (it is
the same for every lead, every state).

| | Bake the KB into the STATIC block at process startup | Read once, cache in memory, invalidate on inbox-answer | **Read fresh from disk every turn (chosen)** |
|---|---|---|---|
| FR-KB-03 "no restart" | Fails outright — the static block is built once, at import time; a new inbox answer would need a process restart to ever reach a lead | Works, but needs a cross-process cache-invalidation signal (the dashboard process and the bot process are separate — the exact ADR-0001 §1 problem Decision 2 also has to solve) | Works with ZERO extra plumbing — the dashboard writes the file, the very next bot-process read sees it |
| New moving parts | None, but wrong behavior | A cache + an invalidation channel (another cross-process signal to design, test, and get wrong) | None — reuses the file itself as the single source of truth, no cache to go stale |
| Cost per turn | N/A | One extra read only after invalidation | One `readFileSync` per turn — a KB file of a few thousand characters is a sub-millisecond read, dwarfed by the model round trip's own latency (NFR-UX-01's budget is seconds, not milliseconds) |

**Chosen:** a new `packages/agent/src/kb-context.ts` module exposes
`readKnowledgeBaseText(): string`, resolving `knowledge/school.md` from the
repo root the SAME way `packages/bot/src/index.ts` already resolves its own
`repoRoot` (`path.resolve(dirname(fileURLToPath(import.meta.url)),
"../../..")`), called once per `runIntakeTurn()` invocation and folded into
`buildDynamicBlock`'s output via a new `buildKnowledgeBaseBlock(kbText)`
formatter — a fenced section titled "База знань (дослівно, єдине джерело
цифр і умов)" with an explicit instruction that any number/term absent from
this block follows the unanswered-promise path. A missing/unreadable file
degrades to an EMPTY KB block (`readKnowledgeBaseText` catches `ENOENT` and
returns `""`, never throws) — every question then correctly falls onto the
`log_question` promise path, which is safe and non-data-lossy, unlike
Decision 5's write side, which must fail loud (see that decision's own
contrast).

**`system-prompt.ts`'s static block itself also changes** (not a new
concept, a correction): its current FR-FAQ-02 line says "do not call a tool
for this... that is a later capability, not this one" — literally
describing the pre-S5 deferral. This slice deletes that sentence and
replaces it with the real instruction: call `answer_faq` when the answer is
in the KB block below, `log_question` when it is not, in EITHER case compose
the reply yourself in the SAME turn, grounded exclusively in the KB block —
never state a number/price/term (BC-PRICE-01's four categories, enumerated
verbatim) absent from it.

### Decision 2: answer-delivery channel — reuse S4's outbox SHAPE, deliberately fork its retry POLICY

**The real decision: how does an admin's inbox answer reach the lead's
Telegram chat, given the dashboard process and the bot process are separate
(ADR-0001 §1, the identical constraint S4's Decision 1 already solved for
booking decisions)?**

The mechanism is a direct reuse of S4's own answer: the dashboard's
answer-handler route can't call `TelegramTransport.sendMessage` itself (no
transport instance in that process), so it writes a durable, drainable
signal, and the bot's own process drains it. Unlike S4, this capability does
NOT need a separate `notifications`-style outbox table — the signal IS the
`questions` row itself (`delivery_status` lives directly on it, per the
baseline spec's own explicit wording: "Telegram delivery of an admin answer
is tracked on the `questions` row via the `delivery_status` column"). A new
`packages/bot/src/question-drain.ts`, structurally a near-twin of
`notification-drain.ts` (same in-flight-id guard so two overlapping timer
ticks never double-send the same row, same "one bad row never stops the
batch" try/per-row/catch shape), queries `findDeliverableQuestions` —
**`status='answered' AND delivery_status='pending'` ONLY.**

**Where this design DIVERGES from S4, by name:** S4's drain query is
`delivery_status IN ('pending','failed')` — a `failed` row is silently
retried on the very next tick, forever, with no admin action needed (S4's own
LOCKED human decision, 2026-07-07: "the automatic drain retry is sufficient
... for the single-teacher MVP"). This capability's OWN baseline spec
explicitly does NOT make that same call — its "Question-inbox panel"
requirement says a `failed` row "stays on the panel in a visually distinct
delivery-failed state with a retry action," and its own scenario is titled
"Successful retry delivers the answer and clears the panel" — a `failed` row
is a **UI-visible, human-actioned** state, not a silent auto-retry queue.

| | Auto-retry `failed` rows too (copy S4's query verbatim) | **`failed` rows require a manual retry action before re-entering the drain queue (chosen)** |
|---|---|---|
| Matches THIS capability's baseline spec | No — the spec's own scenario names a retry ACTION and a visually distinct state; an invisible auto-retry would make that UI dead weight, contradicting the spec's own wording | Yes, verbatim |
| Consistency with S4 | Perfect consistency, wrong behavior — S4's decision was itself an amendment made because S4's OWN baseline scenario was rewritten to drop the manual-retry clause (a LOCKED human call specific to booking notifications); this capability's baseline was never amended that way | A deliberate, named fork — not an oversight, not "forgetting" the S4 precedent |
| Failure visibility | A `failed` row would still show on the panel (nothing hides it), but a silent retry loop running underneath makes the visible "retry" button either misleading (it does nothing new) or racy (it could double-queue against the timer) | Clean: `failed` is a stable state until the administrator acts, exactly once |

**Chosen:** `findDeliverableQuestions` never returns `failed` rows. A new
route, `POST /api/questions/[id]/retry`, is the ONLY way a `failed` row
re-enters `pending` (`retryQuestionDelivery`, guarded `WHERE status='answered'
AND delivery_status='failed'` — a stale click on an already-`pending`/
`delivered` row is a no-op, mirroring every other stale-submit guard this
codebase already uses). The next drain tick (a few seconds later, same
cadence as S4's `NOTIFICATION_DRAIN_INTERVAL_MS`) then attempts the send.

**Sub-decision, flagged for sign-off: no live push for the inbox panel.**
S4 republishes a dashboard-scoped `STATE_SNAPSHOT` on the existing AG-UI hub
after every decision, so the queue/HallMap update without a reload. Folding
the Question inbox into that SAME snapshot was considered and rejected FOR
THIS SLICE: the inbox is a materially different, self-contained data source
(a `questions` list, not `leads`/`requests`/`bookings`), and every one of the
baseline spec's own scenarios is phrased as "the administrator opens the
panel" / "clicks an action" — never "observes a live update without acting."
`QuestionInbox.tsx` therefore self-fetches (`GET /api/questions` on mount,
and again after every mutating action it performs: answer submit, retry
click) rather than subscribing to the hub. A `failed`→`delivered` transition
caused by a drain tick the admin did NOT click for (impossible under the
manual-retry design above, but true for a `pending`→`delivered` transition
right after an answer submit) becomes visible only on the next fetch, not
instantly — an accepted, named scope-narrowing call, not an oversight.

**Note on the ONE clarifying spec-text change this design surfaces:**
`serializeKbEntry`/`markQuestionAnswered` complete synchronously in the
answer-handler request (Decision 5), so `delivery_status` is still `'pending'`
(not yet `'delivered'`) at the instant the route responds. The baseline's
"One-action admin answer" requirement says the question "disappears from the
inbox list" right after that submit; its "Question-inbox panel" requirement
says a question "leaves the inbox list once it is both `answered` and
`delivery_status = 'delivered'`" — read together, a freshly-answered,
not-yet-drained row is, for a few seconds, simultaneously "disappeared" (per
one sentence) and "still present" (per the other). This design resolves the
tension by treating "disappears from the inbox list" as describing the
ADMIN'S OWN CLIENT after a successful submit (an optimistic, immediate
removal in `QuestionInbox.tsx`'s own local state), while the SERVER-SIDE
`findOpenInboxQuestions` query — what a fresh page load or another admin
tab would see — follows the panel requirement's literal rule
(`NOT (status='answered' AND delivery_status='delivered')`, so a
just-answered/still-pending row remains server-visible, in the same
visually-distinct "answered, sending…" treatment the panel already has for
`failed`). The delta below adds one scenario making this explicit, since it
is a genuine judgment call a human should confirm, not a mechanical
transcription.

### Decision 3: FR-GUARD-02 enforcement — structural + eval-behavioral, NOT a runtime numeric-extraction guard

**The real decision: how is "never invent a price/term absent from the KB"
actually enforced, given the model produces free Ukrainian prose, not a
structured value?**

| | Build a runtime numeric extractor (regex/NLU over the model's reply, compare extracted numbers against a parsed KB) | **Structural closed-tool-set + fresh-KB-grounding + eval-judge verification (chosen)** |
|---|---|---|
| Feasibility over free Ukrainian text | Genuinely hard: Ukrainian numerals appear as digits ("1200"), spelled-out words ("тисяча двісті"), locale-formatted ("1 200,00"), or embedded in a sentence with no fixed grammar — a regex/heuristic parser is itself an untested, easy-to-fool surface (the exact "hand-rolled NLU in `lib/`" pattern S2's own design.md Decision 1 already rejected for weekday/time parsing, for the identical reason) | No text-parsing needed at all — the guardrail is that no tool exists which could ever answer a price/term question from anywhere OTHER than the KB block already in context |
| What a false negative costs | A genuinely invented price that the extractor fails to notice (e.g. it missed a spelled-out numeral) ships silently — the WORST failure mode for a guardrail: a false sense of safety | N/A — there is no extraction step to have a false negative in |
| What a false positive costs | A CORRECT quote from the KB gets flagged as "invented" because the extractor's normalization missed a locale variant (this is exactly the baseline spec's own "Locale-formatted number is recognized as matching the KB" scenario naming a real risk) — a brittle runtime check could itself cause a working conversation to be rejected/logged as a guardrail violation | N/A — the eval JUDGE performs this normalized comparison once, per graded case, with full context (a fresh LLM reading both texts), which is exactly the kind of comparison an LLM judge is suited for and a regex is not |
| Where "normalized comparison" (the spec's own phrase) actually lives | Runtime code, duplicating locale-formatting logic that already has to be right in exactly one place to be trustworthy | The eval JUDGE's own rubric line (`evals/cases/fr-guard-02.eval.ts`'s rubric explicitly instructs: "a differently-formatted rendering of the same KB number is NOT a violation") — the judge already reads and compares text as its core competency |
| Consistency with the rest of this design | Would add the FIRST piece of free-text parsing logic anywhere in `lib/`, breaking the "extract, don't invent — the model does linguistic work, code does deterministic work" split every prior slice (S2's `save_age`/`propose_slots` schema-plus-validator pattern) has held | Matches it exactly: the deterministic parts (which tool was called, what row gets logged, whether the KB block was actually present in context) are code; judging whether free-text PROSE stayed faithful to that KB block is left to the eval judge, the same division of labor S2 already established |

**Chosen:** FR-GUARD-02 is enforced by three layers, none of them a runtime
text parser:
1. **Structural (static):** `tools.ts`'s closed set has no
   `get_price`/`get_terms`/any tool that could answer a price/term question
   from a source other than the KB block already in the model's context —
   `answer_faq`/`log_question` are LOGGING tools; they carry no answer payload
   the model could get "wrong" at the tool-call level, because the model's
   own narrated reply text (not a tool argument) is what could contain an
   invented number.
2. **Grounding (Decision 1):** the KB block is fresh every turn and the
   static prompt's rewritten FR-FAQ-02 instruction explicitly enumerates the
   four BC-PRICE-01 categories (price, lesson duration, group composition/
   size, discounts) as the ONLY categories where a number/term may ever be
   stated, and only when present in that turn's KB block.
3. **Behavioral verification (eval):** `evals/cases/fr-guard-02.eval.ts`
   drives real turns (real `ClaudeAgentModelPort`, per the `fr-guard-01.eval.ts`
   precedent) across the baseline spec's four enumerated categories, each in
   a present-in-KB and an absent-from-KB variant, with an explicit "pressured
   for a number" variant (the baseline's own "ну приблизно, скільки дітей —
   5? 10?" scenario) — graded by a fresh `eval-judge` agent (maker ≠ checker)
   against a rubric that performs the normalized-number comparison as a
   reading-comprehension task, not a runtime computation.

This is a `dimension: guardrail-integrity` case, joining `fr-guard-01` under
the SAME ratchet dimension `check-eval-ratchet.mjs` already tracks — a
regression in either guardrail's eval score fails the same gate.

### Decision 4: the `questions` table shape and the deterministic-logging seam

Mirrors ADR-0001 §4's own wording almost verbatim:

```sql
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
  telegram_chat_id TEXT NOT NULL,
  text TEXT NOT NULL,
  answer_source TEXT NOT NULL CHECK (answer_source IN ('kb', 'unanswered')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered')),
  admin_answer TEXT,
  answered_at TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_questions_inbox
  ON questions(created_at) WHERE answer_source = 'unanswered';
```

`ON DELETE CASCADE` on `lead_id` (matches `requests`' own convention, keeps
NFR-PRIV-02's delete-lead cascade a schema fact); `ON DELETE SET NULL` on
`request_id` (a question can outlive the specific request it was asked
during — mirrors `bookings.request_id`'s own `SET NULL` reasoning in
booking-hitl design.md Decision 4). Created AFTER `leads`/`requests` in
`initSchema()` (both FKs must already exist).

`packages/db/src/questions.ts` exports: `insertQuestion` (`RETURNING *`,
`status`/`delivery_status` left at their column defaults — never
insert-time parameters, same convention `notifications.ts` already
established for exactly this reason); `findOpenInboxQuestions` (the
visibility rule from Decision 2's closing note, `ORDER BY created_at DESC` —
newest-first, per FR-KB-02, the OPPOSITE ordering convention from
`findDeliverableNotifications`'s oldest-first FIFO, because one is an
admin-facing list and the other is a delivery queue); `findQuestionById`;
`markQuestionAnswered(db, id, adminAnswer)` (guarded `WHERE status='open'` —
Decision 5's idempotency); `retryQuestionDelivery` (guarded `WHERE
status='answered' AND delivery_status='failed'`); `markQuestionDeliveryStatus`
(`'delivered'`/`'failed'`, guarded `WHERE status='answered'`);
`findDeliverableQuestions` (Decision 2's `pending`-only query).

**The deterministic-logging seam (mirrors FR-HITL's own tool-dispatch
pattern, not the conversation reducer):** a question can be asked in ANY
`conversationState`, so this is NOT an `IntakeEvent`/`transition()` concern —
it is dispatched in `loop.ts`'s `applyToolUse`, the SAME layer
`propose_slots`/`request_hold` (booking-hitl) already occupy, via a new port:

```ts
export interface QuestionsPort {
  logAnsweredFromKb(question: string): Promise<void>;
  logUnanswered(question: string): Promise<void>;
}
```

`packages/bot/src/pipeline.ts` binds this to `packages/db/src/questions.ts`'s
`insertQuestion`, pre-applying the current turn's `lead_id`/`request_id`/
`telegram_chat_id` (the same "pre-bind the request's own context, expose only
the narrow method the loop needs" shape `SlotsPort`/`HoldStorePort` already
use). `applyToolUse` gains two branches (structured the same way as the
existing `explain_scope`/`explain_format` dedicated-tool branches — no
`transition()` call, no state mutation):

```ts
if (block.name === "answer_faq") {
  await ports.questions.logAnsweredFromKb(readQuestionInput(block));
  return { state, logEntry: { tool: block.name, input: block.input, outcome: "logged" } };
}
if (block.name === "log_question") {
  await ports.questions.logUnanswered(readQuestionInput(block));
  return { state, logEntry: { tool: block.name, input: block.input, outcome: "logged" } };
}
```

**A new `ToolCallOutcome` member, `"logged"` — deliberately NOT `"applied"`.**
`runIntakeTurn`'s existing reply-assembly rule
(`hasAppliedToolCall || stateAdvanced`) overrides the model's own narrated
text with the deterministic ack+next-question composer whenever ANY tool
call in the turn was `"applied"`. An FAQ turn's whole point is the OPPOSITE:
the model's own KB-grounded narration IS the reply — overriding it with
"Дякую, я це записала. <next intake question>" would silently discard the
actual answer text. Naming the outcome `"logged"` (not `"applied"`) means a
PURE FAQ turn (no other tool call) leaves `hasAppliedToolCall` false, so
`reply = narratedText` unchanged — exactly the existing off-topic/pass-through
code path, reused, not duplicated. A MIXED turn (e.g. the lead also answers
`save_tastes` in the same message) still gets the deterministic next-question
appended, with the model's own FAQ-plus-ack narration as the prefix — this
is unchanged existing behavior for combined turns, not a new special case.

Both tool-call sites are wrapped by `runIntakeTurn`'s EXISTING
`applyToolUse` try/catch (the same one `propose_slots`/`request_hold`/
`cancel_request`'s booking-release already rely on for NFR-REL-01) — a
`QuestionsPort` failure (a DB write erroring) is caught there, no new
error-handling code needed. The existing catch always returns
`CALENDAR_UNAVAILABLE_APOLOGY`, whose Ukrainian text literally says
"не вдається перевірити розклад занять" (can't check the schedule) — accurate
for a Calendar failure, imprecise for a DB-write-during-question-logging
failure. Flagged here rather than silently reused: renaming this constant to
a generic `PORT_UNAVAILABLE_APOLOGY` (or adding a second, question-specific
constant) is a one-line, low-risk fix touching a file this slice already
edits; `tasks.md`'s review-gate stage decides whether to fix it now or record
it as accepted debt, since it predates this slice and is not, by itself, a
kb-learning regression.

### Decision 5: KB write atomicity and the pure/impure split for `lib/src/kb/`

**Ordering (the spec's own words): "The append and the status change SHALL
not diverge: a failed append leaves the question unanswered."** The answer
handler (`apps/dashboard/app/api/questions/[id]/route.ts`) therefore runs, in
this fixed order, every abort path returning BEFORE the next step (the same
"every abort path returns before the commit" discipline booking-hitl's
Decision 5 already established for calendar-then-DB):

1. **Validate** the answer text: `validateAnswerText` (`lib/src/kb/`) —
   non-empty after trim, ≤3,500 characters. Invalid → inline `400`-shaped JSON
   error, nothing touched (baseline "Empty answer"/"Oversized answer"
   scenarios).
2. **Re-load the question row** and check `status === 'open'` — anything else
   (already `answered`, or gone) → a `{status:"stale"}`-shaped no-op response
   (mirrors booking-hitl's own stale-submit convention), satisfying the
   baseline's own "Stale submit on an already-answered question is a no-op"
   scenario: no append, no status change, no Telegram send.
3. **Serialize** the entry: `serializeKbEntry({question, answer})`
   (`lib/src/kb/`) — escapes any answer line that would otherwise parse as a
   new Markdown heading.
4. **Append to `knowledge/school.md`** via a THIN, package-boundary I/O call
   (`apps/dashboard/lib/kb-write.ts`, a plain `fs.appendFileSync`, or a
   read-modify-write if a trailing-newline invariant needs preserving) — a
   thrown error here (missing file, unwritable directory) is caught and
   returns the baseline's own named error path ("the administrator sees an
   inline error naming the failure") — **the question is NOT marked answered**
   (step 5 never runs), satisfying "SHALL not diverge" by construction: the DB
   write is ALWAYS the step AFTER a successfully completed file write, never
   the other way around, so there is no ordering in which the DB says
   "answered" while the file was never actually touched.
5. **Mark the row `answered`** (`markQuestionAnswered`, `admin_answer`,
   `answered_at`, `delivery_status` left at `'pending'` so Decision 2's drain
   loop picks it up) — a residual risk (a catastrophic failure between steps
   4 and 5, e.g. the process crashing mid-write) is accepted, not solved: both
   operations are synchronous, in-process, back-to-back Node calls
   (`fs.appendFileSync` then a `better-sqlite3` `UPDATE`, which is itself
   synchronous) — there is no `await` boundary between them for another
   request to interleave through, and the actual failure window is the same
   order of magnitude as any other single-process "two writes, no distributed
   transaction" pattern already accepted elsewhere in this codebase (e.g.
   booking-hitl's own calendar-write-then-DB-commit sequencing, which is
   ALSO not a two-phase commit — it is ordered so the WORSE failure mode
   (an orphaned commit with no matching effect) can't happen, exactly the
   same reasoning applied here).

**The pure/impure split.** The task brief that scoped this slice describes
`lib/src/kb/` as owning "the KB read + append-serialization." This design
refines that: the **serialization logic** (`validateAnswerText`,
`serializeKbEntry`, and a private `escapeHeadingLines` helper) is 100% pure —
string in, string/result out, zero I/O, trivially colocated-test-covered —
and lives in `lib/src/kb/`, exactly as scoped. The **actual filesystem
read/append calls** do NOT live in `lib/`, for the same reason `lib/` has
never imported `googleapis` or a Telegram SDK: `lib/` defines pure logic and,
where needed, a PORT type; the concrete adapter lives at the package boundary
that actually needs the I/O. `knowledge/school.md` has exactly two readers/
writers in this design — `packages/agent` (read, Decision 1) and
`apps/dashboard` (write, this decision) — neither shares a runtime process
with the other, so there is no third consumer that would benefit from a
shared `lib/`-level I/O function; each owns its own thin `fs` call. This is a
DELIBERATE narrowing of the task brief's literal wording, flagged here for
sign-off since "put the read AND the write in `lib/`" was the initially
scoped shape.

**The read side's failure mode is the mirror image of the write side's, by
design:** `readKnowledgeBaseText()` (Decision 1) fails SOFT (empty string,
never throrws) because a soft failure there just means every question
degrades to the safe `log_question` promise path; `kb-write.ts`'s append
fails LOUD (throws, caught by the route, surfaced inline, question stays
open) because a soft failure there would SILENTLY lose the administrator's
answer — exactly what the baseline spec's own "school.md append failure"
scenario forbids ("the administrator sees an inline error naming the
failure").

## Risks / Trade-offs

- **[Risk]** The Question-inbox panel has no live push (Decision 2's closing
  note) — an admin who leaves the panel open across a background drain-tick
  delivery won't see the row disappear until they act again or reload.
  → **Mitigation:** every baseline scenario is interaction-driven, not
  observation-driven; if the demo shows this reads as "stuck," folding the
  panel into the existing `STATE_SNAPSHOT` hub is a scoped follow-up, not a
  redesign (Decision 2's own note already names the exact mechanism).
- **[Risk]** `CALENDAR_UNAVAILABLE_APOLOGY`'s wording is imprecise when
  reused for a `QuestionsPort` failure (Decision 4's own flag).
  → **Mitigation:** low-risk, cheap fix; `tasks.md`'s review-gate stage
  (mirroring booking-hitl's own H.1 process) explicitly decides fix-now vs.
  accepted-debt, rather than silently shipping the imprecision unexamined.
- **[Risk]** The append-then-mark-answered ordering (Decision 5) is not a
  true two-phase commit — a catastrophic crash between the two synchronous
  calls is a residual, unhandled failure mode.
  → **Mitigation:** both calls are synchronous and back-to-back with no
  `await` boundary between them (no interleaving risk from a concurrent
  request); the accepted residual window is the same order of magnitude as
  every other "ordered writes, not a distributed transaction" pattern this
  codebase already ships (booking-hitl's calendar-then-DB sequencing).
- **[Risk]** `lib/src/kb/` touching zero filesystem I/O (Decision 5) means
  the read and write sides duplicate a small amount of path-resolution logic
  across `packages/agent` and `apps/dashboard` instead of sharing one
  function.
  → **Mitigation:** the duplicated logic is a single `path.resolve(...,
  "knowledge/school.md")` line, already duplicated across `packages/bot` and
  `apps/dashboard` today for `KAMERTON_DB_PATH`/repo-root resolution (see
  `packages/bot/src/index.ts` and `apps/dashboard/lib/dashboard-db.ts`'s own
  `repoRoot` constants) — consistent with, not a regression from, the
  existing convention.
- **[Risk]** A `knowledge/school.md` that grows large over many admin answers
  is read in FULL, every turn, into the model's context window (Decision 1).
  → **Mitigation:** out of scope for MVP (single-teacher volume, a KB
  measured in low thousands of characters per the 3,500-char per-entry
  bound); named here as a known scaling limit for a future slice, not solved
  by this one.
