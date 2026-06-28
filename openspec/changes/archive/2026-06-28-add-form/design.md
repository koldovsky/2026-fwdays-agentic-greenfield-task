# Design — add-form

Implements `openspec/specs/form/spec.md` (FR-FORM-01..04). No schema migration — all
required tables (`Cycle`, `Response`, `Answer`) and the `Cycle.status` enum already
exist in `prisma/schema.prisma`. Extends the `add-respond`
slice's `app/respond/[token]/page.tsx`, reuses `tokenBoundarySchema`
(`app/respond/[token]/schemas.ts`), the shared answer contract (`lib/schemas/answer.ts`),
and the pure completion check (`lib/cycles/status.ts`'s `isResponseComplete`).

## Goals

- Render the template's flat, ordered question list one question per screen, with a
  position indicator, loading state, and empty state (FR-FORM-01).
- Render `scale` as a vertical labelled anchor list and `open` as an auto-growing
  textarea, fully keyboard accessible (FR-FORM-02).
- Autosave each answer on advance, validated at the server boundary, resumable, with no
  cross-cycle write and no wrong-question-anchor write (FR-FORM-03).
- Mark the cycle `done` only when every required question across the WHOLE template is
  answered, using the existing pure `isResponseComplete`, and show one quiet confirmation
  sentence (FR-FORM-04).
- Keep `lib/` framework-free; keep every Prisma read/write in `app/`.

## Non-goals

- The AI chat interview UI (`ai-interview` slice owns `mode === "interview"`).
- Retrofitting a `section`/grouping column onto `Question` (see Decision 1 — explicitly
  rejected for MVP).
- Any new question type, file/image upload, or rich-text answers.
- Editing or revisiting a previously answered question after advancing past it (the
  baseline spec describes forward advancement with autosave-then-next; allowing the
  respondent to navigate backward and edit is not described by any FR-FORM-0x scenario
  and is left out of this slice's UI — the data model already supports re-saving the same
  `(responseId, questionId)` if a future slice adds a "back" control, since the upsert is
  idempotent per question).

---

## Decision 1: One question = one "section" (the central reframing for this slice)

**Context.** The baseline spec (`openspec/specs/form/spec.md`) was written against the
KoloDesign mockup's vocabulary — "section" meaning a group of several questions shown
together with a "Section N of M" indicator. The ACTUAL data model that exists today has
no section/grouping concept:

- `prisma/schema.prisma`'s `Question` model: `id`, `templateId`, `order: Int`, `text`,
  `type`, `required`, `anchors: Json?` — a flat list, unique on `(templateId, order)`.
  No `sectionId`, no `groupOrder`, nothing that clusters questions together.
- `lib/schemas/template.ts`'s `questionSchema` / `lib/cycles/snapshot.ts`'s
  `TemplateSnapshot`: `{ name, methodology, questions: Question[] }` — again a flat
  array, ordered by `order`.
- `docs/KoloDesign/Kolo360.dc.html` shows a multi-question-per-screen mockup, but this is
  the FUTURE/aspirational visual direction, not a contract this slice's schema honours.

**Options considered:**

A. Treat each individual question as its own "section": `M = questions.length`, `N` =
   the respondent's 1-indexed current question position. "Section N of M" is literally
   rendered as "Question N of M" (chosen).
B. Retrofit a `sectionId`/`groupOrder` column onto `Question`, migrate existing data, and
   build real multi-question grouping to match the mockup.
C. Treat the WHOLE template as one single section (`M = 1` always), showing every
   question on one scrolling screen.

**Chosen: A.** This was a direct, explicit instruction from the user (this is not an
inference) — retrofitting a section column is out of scope for this slice. Beyond
following that instruction, option A is also the cleanest mapping available given the
schema: every FR-FORM-01 scenario already speaks generically about "section" containing
"questions [in] template order" and a position counter — nothing in the scenario text
requires more than one question per section semantically; a section of exactly one
question is a degenerate but fully valid case of the same model. The mapping is lossless
(table below), so no scenario needs reinterpretation or weakening, only relabelling.

**Rejected B:** a schema migration, new Zod schema fields, snapshot shape changes, and
template-builder UI changes are a much larger slice than "add the form" — and the user
explicitly chose not to do this now. Flagging as ADR-worthy: if a future slice needs true
multi-question sections (to match the KoloDesign mockup visually), it will need its own
migration slice that this decision deliberately does NOT preempt or block — the
per-question model upserts on `(responseId, questionId)`, which remains valid record
keeping under a future grouped UI (the grouping would be a presentation-only concern on
top of the same flat `Answer` rows).

**Rejected C:** contradicts the spec's core intent ("never the whole questionnaire on a
single scroll") and removes the autosave-per-section/per-question and "blocks advancing"
mechanics the spec describes — a single mega-section can't sensibly autosave or "advance"
mid-way.

### FR-FORM-01 scenario → one-question-per-screen mapping (verification table)

| Baseline scenario (spec.md) | Section-based wording | One-question-per-screen satisfaction |
|---|---|---|
| Single section is shown with position label | "Section N of M" shown; only that section's questions render, in template order | "Question N of M" shown (`M = questions.length`); only the current question (a section of size 1) renders; order is `Question.order` ascending — identical ordering guarantee |
| Indicator advances as sections are completed | Indicator updates from N to N+1, previous section's questions no longer render | Indicator updates from "Question N of M" to "Question N+1 of M"; the previous question's screen is replaced by the next question's screen — identical "no longer rendered" guarantee |
| Single-section template still shows the indicator (M = 1) | Shows "Section 1 of 1", completion follows directly | A 1-question template shows "Question 1 of 1"; answering it and advancing goes straight to the completion check (since `N === M`) — identical "no next-section step" guarantee |
| Loading state before saved answers hydrate | Explicit loading state, never blank, controls render only once state is available | Identical — unchanged by the reframing; loading gates the whole `FormFlow`, not a per-question concern |
| Template with no sections or no questions shows an empty state | Explicit empty state, no interactive next/completion control | `questions.length === 0` (the only way "no sections" or "a section with zero questions" can occur in a flat array) renders the `EmptyState` component, no question screen, no completion control — identical guarantee, and actually simpler to detect (a single length check, not a "section has zero questions" nested check) |

No scenario is weakened, dropped, or reinterpreted to mean something different — each
maps onto an existing flat-array operation 1:1. A future reader diffing this design
against the baseline spec should read this table as proof of equivalence, not as a
deviation log.

### Consequent reframings (used by FR-FORM-03 / FR-FORM-04 below)

- "Advancing autosaves the section" → "advancing autosaves the current question's single
  answer" (one `Answer` upsert per advance, not a batch of several).
- "Required questions block advancing" → "the current question, if required, must have a
  valid answer before advancing to the next question's screen; a specific inline message
  names what is missing."
- "Quiet completion on the final section" → fires when the respondent advances past
  question `M` (i.e. `N === M` and that answer was just saved) AND the server's
  whole-template `isResponseComplete` check passes.
- "Resumes at the first section that is not yet complete" → resumes at the first
  question (by `order`) that is `required` and has no valid saved answer; if none exists,
  resumes at the completion confirmation (every required question already answered).

---

## Decision 2: The autosave server action lives in `app/respond/[token]/form-actions.ts`

**Options considered:**

A. A new file, `app/respond/[token]/form-actions.ts`, holding `saveAnswer` (chosen).
B. Add `saveAnswer` into the existing `app/respond/[token]/actions.ts` (which currently
   holds only `chooseMode`).
C. A `lib/form/` module wrapping the Prisma call.

**Chosen: A.** `actions.ts` (from `add-respond`) is scoped to the mode-choice gate — its
file-level comment and tests are entirely about `chooseMode`'s race-safe `updateMany`
guard. Mixing in a structurally unrelated "save one answer, upsert Response, maybe mark
cycle done" action would make `actions.ts` a dumping ground for "anything in
`/respond/[token]` that's a server action," eroding the precedent `add-respond` set of
one action per concern. A dedicated `form-actions.ts` keeps `saveAnswer`'s tests
(`form-actions.test.ts`) cleanly scoped and makes the eventual `ai-interview` slice's own
action file (likely `interview-actions.ts`, by the same naming convention) an obvious,
parallel sibling rather than a third function jammed into a shared file.

**Rejected C:** Prisma writes cannot live in `lib/` (TC-PURE-01); `lib/` already holds the
two pure pieces this action depends on (`answerInputSchema`/`isValidAnchorValue` in
`lib/schemas/answer.ts`, `isResponseComplete` in `lib/cycles/status.ts`) — there is
nothing left to "wrap" in a separate `lib/form/` module that isn't either pure (already
in `lib/`) or a Prisma call (must be in `app/`).

---

## Decision 3: Resuming — where the "first unanswered required question" query lives

**Context.** `getRespondentCycleByToken` (from `add-respond`/`link`) does NOT fetch
`Answer` rows today — it only returns the frozen `templateSnapshot` and cycle metadata.
This slice needs the respondent's saved answers to (a) hydrate the form, (b) compute the
resume position, and (c) decide whether to show the completion confirmation instead of a
fresh form.

**Options considered:**

A. Extend `getRespondentCycleByToken` to also `select: { response: { include: { answers:
   true } } }` and return a `savedAnswers: Record<string, number | string>` field on
   `RespondentCycle`, computed in `queries.ts` (chosen).
B. Add a second, separate query function (e.g. `getSavedAnswers(cycleId)`) called from
   `FormFlow` only when `mode === "form"`.
C. Fetch answers inside `FormFlow` itself via a fresh Prisma call.

**Chosen: A.** Same reasoning as `add-respond`'s Decision 3 (extending
`getRespondentCycleByToken` in place rather than adding a second round trip): the page
already calls this query once per request for every mode; appending one more `select`
relation (`response.answers`) costs nothing extra in round trips (Prisma resolves a
nested `select` in the same query) and keeps `RespondentCycle` the single, canonical
respondent-facing read model the `link`/`respond`/`form` slices have all been extending
in place. The shaping work — turning `Answer[]` rows into the flat `Record<string,
number | string>` shape `isResponseComplete` and the form's hydration both expect — is
pure mapping logic and stays in `queries.ts` (still `app/`, since it touches the Prisma
result type, but with zero business logic of its own beyond the shape conversion).

The actual "which question does the respondent resume at" computation — walking
`questions` in order, returning the first `required` question with no valid entry in
`savedAnswers` — is extracted as a small, pure, framework-free function:
`lib/cycles/resume.ts`'s `firstUnansweredRequiredQuestion(questions, answers)`. This is
deliberately pure and lives in `lib/` (not `queries.ts`) because:
- it has no Prisma dependency — only the already-loaded snapshot questions and answers
  record, both of which `isResponseComplete` already consumes in the same shape;
- it is independently unit-testable without mocking Prisma;
- it is the natural sibling of `isResponseComplete` (both walk `snapshot.questions` and
  consult the same `answers` record) and arguably belongs in `lib/cycles/status.ts`
  itself — but is kept in a new `lib/cycles/resume.ts` file instead of growing
  `status.ts` further, since "derive status" and "find resume position" are distinct
  enough concerns to warrant separate, single-purpose files (both still under
  `lib/cycles/`, so there is one home for cycle-state logic, not two unrelated homes).

**Rejected B/C:** both reintroduce a second DB round trip for data keyed by the exact
same `(token → cycle.id)` lookup the page already performs — the established pattern in
this codebase (per `add-respond`'s and `add-link`'s own design docs) is to extend the one
canonical query, not fork a parallel one.

```typescript
// lib/cycles/resume.ts (new, framework-free)
// @trace FR-FORM-03, FR-FORM-04

export function firstUnansweredRequiredQuestion(
  questions: ReadonlyArray<{
    id: string;
    order: number;
    type: string;
    required: boolean;
    anchors?: ReadonlyArray<{ value: number }>;
  }>,
  answers: Record<string, number | string>,
): { id: string; order: number } | null {
  // Walk questions in their existing array order (already `order`-ascending from
  // snapshotSchema/orderedQuestions); return the first required question whose
  // answers[id] is missing or fails the same per-type validity check
  // isResponseComplete uses (scale: numeric anchor match; open: non-empty trimmed
  // string). Returns null when every required question already has a valid answer
  // (the resume target is then "show the completion confirmation", not a question).
}
```

This duplicates the per-type validity check `isResponseComplete` already encodes
inline — flagged here as an ADR-worthy follow-up: a future refactor could have both
functions share one `isValidAnswerForQuestion(question, answer)` helper instead of two
parallel inline checks, but splitting that out is not required to ship this slice
correctly (the two checks are each ~6 lines and tested independently; a premature shared
abstraction is not worth blocking this slice on). Tasks.md flags this as a candidate for
a future tidy-up, not a defect.

---

## Decision 4: `ModeStub` → `FormFlow` — where the render-branch split happens

**Options considered:**

A. `app/respond/[token]/page.tsx`'s render branch becomes a three-way switch on
   `cycle.mode`: `null` → `ModeChoice`, `"form"` → new `FormFlow`, `"interview"` →
   `ModeStub` (chosen).
B. Keep a single `ModeStub` component and have it internally branch on `mode` to render
   either the real form or its own placeholder body.

**Chosen: A.** `ModeStub`'s file-top comment (written by `add-respond`) already says:
"replaced wholesale by the form/ai-interview slices when mode === 'form' / 'interview'
respectively. Do not extend this file with real answering UI; build it in the owning
slice instead." This slice honours that instruction literally: `FormFlow` is a sibling
component, `ModeStub` keeps serving the `interview` branch completely unchanged (no
prop or behaviour change to `ModeStub` itself) until `ai-interview` lands and does the
identical swap for its own branch. `page.tsx`'s `collecting` branch becomes:

```typescript
// status === "collecting"
if (cycle.mode === null) {
  return <ModeChoice token={parseResult.data} ... />;
}

if (cycle.mode === "form") {
  return <FormFlow token={parseResult.data} cycle={cycle} />;
}

// cycle.mode === "interview" — unchanged, ai-interview slice's responsibility
return <ModeStub mode={cycle.mode} ... />;
```

**Rejected B:** would re-grow `ModeStub` into exactly the file its own comment forbids
extending, and would force the `ai-interview` slice to either touch this slice's code or
inherit an awkward shared component with two unrelated bodies multiplexed by a prop.

`FormFlow` itself (`app/respond/[token]/FormFlow.tsx`, a client component — it owns
local state for the current question index, the in-progress answer value, the pending
autosave transition, and inline validation messages) receives the cycle's resolved,
privacy-safe fields plus `savedAnswers` and the resume target computed server-side, and
internally renders one of: `LoadingState` (only relevant during the autosave transition,
never on first paint since the page is already server-rendered with hydrated data —
see Error handling table), the single-question screen (indicator + control + advance
button + inline error), the `EmptyState` (zero questions), or the quiet completion
sentence.

---

## Prisma upsert pattern for `Answer` (lazy `Response` creation)

```typescript
// app/respond/[token]/form-actions.ts, inside saveAnswer, after validation passes

const response = await db.response.upsert({
  where: { cycleId: cycle.id },
  create: { cycleId: cycle.id },
  update: {}, // no-op update — upsert only to fetch-or-create the row id
  select: { id: true },
});

await db.answer.upsert({
  where: { responseId_questionId: { responseId: response.id, questionId: parsed.questionId } },
  create: {
    responseId: response.id,
    questionId: parsed.questionId,
    ...(parsed.type === "scale" ? { scaleValue: parsed.value } : { text: parsed.text }),
  },
  update: {
    ...(parsed.type === "scale" ? { scaleValue: parsed.value, text: null } : { text: parsed.text, scaleValue: null }),
  },
});
```

The compound unique name `responseId_questionId` is Prisma's default name for
`@@unique([responseId, questionId])` on `Answer` — confirmed against
`prisma/schema.prisma`. The `update` branch explicitly nulls the OTHER type's column
(`text: null` when re-saving a scale answer, `scaleValue: null` when re-saving an open
answer) so a question's type can never change shape mid-cycle by accident leaving a
stale value from a different type in the row — defensive, even though the template
snapshot's `question.type` is frozen and a client cannot send a mismatched `type` for an
existing `questionId` without failing the `answerInputSchema` discriminated-union parse
against that question's own type (checked by cross-referencing `parsed.questionId`
against the snapshot before the Prisma call, not merely trusting the client's `type`
field — see Error handling table, "answer type does not match question type").

Both upserts run inside a single `db.$transaction([...])` (or sequential awaits without
a transaction wrapper, since `Response.cycleId` is unique and idempotent to upsert twice)
— the `Response` upsert is so cheap and idempotent that a transaction is a defensive
nicety, not a correctness requirement; tasks.md task 3.x decides the exact wrapping based
on whichever keeps the action's error handling simplest to read, but the two writes MUST
both succeed or the function returns an error before any "cycle done" write proceeds.

## How `Cycle.status` transitions to `"done"`

After the `Answer` upsert succeeds, `saveAnswer`:

1. Re-reads (or reuses, if already in hand from validation) the FULL set of the cycle's
   saved answers as a `Record<string, number | string>` — the same shape
   `isResponseComplete` expects (one extra `db.answer.findMany({ where: { responseId }
   })` keyed query, mapped to the flat record; cheap, and necessary because the action
   only received ONE question's answer in its input, not the whole set).
2. Calls the existing pure `isResponseComplete(cycle.templateSnapshot, fullAnswersRecord)`
   from `lib/cycles/status.ts` — reused, not reimplemented.
3. If `true` AND `cycle.status === "collecting"`, writes
   `db.cycle.update({ where: { id: cycle.id }, data: { status: "done" } })` in the same
   server action call (a fourth Prisma call, after the two upserts and the re-read) —
   not in a separate request, so the very save that completes the template is the same
   request that flips the cycle to `done`. No client-side "are we done" guess is
   trusted; the server is the sole authority on completion, mirroring FR-FORM-04's
   "completion SHALL set the cycle state consistently with the shared response model"
   regardless of which screen the respondent was looking at when the last required
   answer landed (covers the spec's "reaching the final section with an earlier required
   answer missing" scenario too: completion is checked against the WHOLE template every
   time any answer is saved, not just when `N === M`).
4. If `false`, `status` is left untouched (still `collecting`) even if `N === M` — the
   respondent advancing past the last question screen with an outstanding required gap
   elsewhere does not complete the cycle; `FormFlow` then re-resolves the resume target
   (Decision 3) and returns the respondent to the earliest unanswered required question,
   surfacing its inline message, instead of showing the confirmation.

This means completion-checking happens on EVERY `saveAnswer` call, not only on the
last one — slightly more work per save (one extra `findMany` + the pure check), but it
is the only way to satisfy the spec scenario where the respondent's resumed link lands on
a LATER question than an unanswered earlier one (e.g. answers were saved out of strict
order via a resumed session) — recomputing fresh each time is simpler and more correct
than trying to track "is this the last save" as separate client state.

## Auto-growing textarea implementation

**Options considered:**

A. A small client-side `onChange`/`onInput` handler that resets `element.style.height =
   "auto"` then sets it to `element.scrollHeight + "px"` (the standard "auto-grow
   textarea" technique), wired into a `<textarea>` ref inside the open-question control
   component (chosen).
B. A CSS-only "hidden mirror" trick: an invisible `<div>` with identical font/padding
   that grows with the text via `grid-template-rows: 1fr / auto` and the textarea
   overlaid via CSS grid, with no JS.
C. A third-party auto-resize textarea library/dependency.

**Chosen: A.** This codebase has zero existing auto-grow precedent to match, and AGENTS
forbids new heavy dependencies without cause — option C is unjustified for ~10 lines of
plain DOM code. Option B (CSS-grid mirror) is elegant and JS-free, but is meaningfully
trickier to get pixel-perfect across browsers for a textarea whose font/line-height must
exactly match an invisible mirror element, and a single `onInput` handler achieves the
same visual result with code any future maintainer can read top-to-bottom without
knowing the CSS-grid auto-sizing trick. The handler is gated behind `"use client"`
already (the control needs `onChange` for the answer value regardless), so there is no
additional client-bundle cost beyond a few lines in an already-client component.

```typescript
// app/respond/[token]/OpenAnswerField.tsx ("use client")
function handleInput(event: React.FormEvent<HTMLTextAreaElement>) {
  const el = event.currentTarget;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
```

Applied on mount too (via a `ref` callback or `useEffect` on the restored saved value)
so a resumed answer that already has multiple lines renders already-expanded, not
clipped until the first keystroke.

---

## Data model — no changes

`Response`/`Answer`/`Cycle.status` already exist exactly as needed:
- `Response.cycleId @unique` — exactly one response per cycle (BC scoped to one
  respondent per cycle, matching `add-respond`'s non-goals).
- `Answer.@@unique([responseId, questionId])` — exactly one answer per question per
  response, upsertable in place on resave.
- `Cycle.status CycleStatus` (`collecting | done | expired`) — this slice is the first to
  write `"done"`.

No migration. `lib/cycles/resume.ts` is the only new `lib/` file.

---

## Error handling strategy

| Situation | Handling |
|---|---|
| Malformed `saveAnswer` payload (bad token, bad `questionId`, malformed `answerInputSchema` shape) | Zod rejects at the action boundary; `{ ok: false, error }` returned, nothing written |
| Token not found / cycle not found at save time | `{ ok: false, error: notFound }`, nothing written |
| Cycle not `collecting` (already `done`/`expired`) | `{ ok: false, error: closed }`, nothing written — mirrors `chooseMode`'s same-shaped guard from `add-respond` |
| `questionId` does not belong to this cycle's `templateSnapshot` | `{ ok: false, error }`, nothing written — the cross-cycle-write defense; the question is looked up in the cycle's OWN snapshot, never trusted from the client beyond its id string |
| Answer type does not match the snapshot question's own `type` (e.g. client sends `type: "scale"` for a question the snapshot says is `"open"`) | `{ ok: false, error }`, nothing written — checked by cross-referencing `parsed.questionId` against `snapshot.questions` before persisting, not merely trusting the client's discriminant |
| `scale` value not one of THIS question's anchors | `{ ok: false, error }`, nothing written — `isValidAnchorValue(value, question.anchors)` reading anchors from the snapshot, never a client-supplied list |
| `open` text over 4000 characters | Rejected by `openAnswerSchema` inside `answerInputSchema`, nothing written |
| Required question left blank, respondent attempts to advance | Client blocks locally first (inline message, no request sent); if a request IS sent anyway (bypassing the client), the server's `saveAnswer` itself only ever receives ONE answer at a time and cannot "leave a question blank" as a payload — the required-block is actually enforced by `FormFlow` refusing to call `saveAnswer` for the empty value, AND by the resume/completion check (Decision 3/the `Cycle.status` section) refusing to mark the cycle `done` while any required question lacks a valid saved answer regardless of how the respondent's screens were navigated |
| Network/server failure mid-save | Inline error message under the current question, the answer is NOT advanced past, retry leaves the respondent on the same question (no raw 500, no silent data loss) |
| Resumed link, all required questions already answered | `FormFlow` renders the quiet completion sentence directly (Decision 3's resume target is `null`), never a fresh empty question 1 |
| Zero questions in the snapshot | `EmptyState` rendered, no advance/completion control reachable (FR-FORM-01 empty-state scenario) |

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| A future reader mistakes the one-question-per-screen model for an oversight rather than a deliberate decision | Decision 1 is documented in full, with an explicit scenario-by-scenario mapping table, in this file and referenced from `proposal.md` |
| `firstUnansweredRequiredQuestion` and `isResponseComplete` drift apart (two near-duplicate per-type validity checks) | Flagged explicitly in Decision 3 as an ADR-worthy follow-up; both functions are independently unit-tested against the same fixtures in tasks.md so a drift would surface as a test mismatch, not a silent bug |
| `saveAnswer` recomputing `isResponseComplete` on every save adds DB load for long templates | Acceptable for MVP scale (one respondent, one cycle, a template of a handful of questions); flagged here rather than optimised away, since correctness (catching out-of-order resumed completion) matters more than micro-optimising a low-traffic respondent endpoint |
| Auto-grow textarea technique behaves inconsistently across browsers for restored multi-line values | Applied on mount (ref/`useEffect`), not only on `onInput`, so a resumed answer renders already-expanded; covered by a manual smoke-test step in tasks.md |
| `FormFlow` accidentally extends `ModeStub` instead of replacing only the `mode === "form"` branch | `page.tsx`'s branch order is explicit (`null` → `interview` unchanged → `form` → new component); independent review task confirms `ModeStub.tsx`'s diff is empty (zero changes) for this slice |
