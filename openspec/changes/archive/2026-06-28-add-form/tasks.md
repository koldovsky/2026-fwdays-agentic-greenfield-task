# Tasks — add-form

Implements FR-FORM-01, FR-FORM-02, FR-FORM-03, FR-FORM-04.

Dependencies: slice `add-respond` must be archived first — `app/respond/[token]/page.tsx`,
`app/respond/[token]/queries.ts`, `app/respond/[token]/schemas.ts`
(`tokenBoundarySchema`), `app/respond/[token]/ModeStub.tsx`, `lib/schemas/answer.ts`
(`answerInputSchema`, `isValidAnchorValue`), and the `respondent` i18n namespace must all
exist. `lib/cycles/status.ts`'s `isResponseComplete` (slice `add-cycles`) must already
exist. Read `openspec/changes/add-form/design.md` Decision 1 before starting any task —
every "section" in the baseline spec maps to a single question per the documented table.

---

## 1. Dependencies and database schema

- [x] 1.1 Confirm no schema migration is needed: verify `Response.cycleId @unique`,
  `Answer.@@unique([responseId, questionId])`, `Answer.scaleValue Int?`,
  `Answer.text String?`, and `Cycle.status CycleStatus` are present in
  `prisma/schema.prisma` exactly as documented in `design.md`. Confirm the Prisma-
  generated compound unique input name is `responseId_questionId` (check
  `node_modules/.prisma/client/index.d.ts` or run `npx prisma generate` and inspect the
  generated `AnswerWhereUniqueInput` type) — do not guess the name. No changes to the
  schema; do not run `prisma migrate`. @trace FR-FORM-03 FR-FORM-04

- [x] 1.2 Confirm `app/respond/[token]/schemas.ts` exports `tokenBoundarySchema`,
  `lib/schemas/answer.ts` exports `answerInputSchema`/`isValidAnchorValue`/`AnswerInput`,
  and `lib/cycles/status.ts` exports `isResponseComplete`. These are reused, not
  redefined, by this slice. @trace TC-ARCH-01

---

## 2. Domain logic (validation, calculations, state machines)

- [x] 2.1 Write `lib/cycles/resume.test.ts` (RED — tests must fail before
  implementation):
  - `firstUnansweredRequiredQuestion(questions, answers)` returns the first `required`
    question (by array order, which is already `order`-ascending) whose `answers[id]` is
    missing.
  - Returns the first required question whose saved answer is invalid for its type (a
    `scale` answer whose value is not one of that question's anchors; an `open` answer
    that is an empty/whitespace-only string) — not just "missing".
  - Skips over optional questions entirely, including an unanswered optional question
    that appears before the first unanswered REQUIRED one.
  - Returns `null` when every required question has a valid saved answer (regardless of
    whether optional questions are answered).
  - Returns `null` for a template with zero required questions, even if `answers` is
    empty (resume target is "show completion", not "show question 1") — mirrors
    `isResponseComplete`'s vacuous-true behaviour for an all-optional template.
  - A template resumed mid-way out of order (e.g. question 1 unanswered but question 3
    answered) returns question 1, not question 4 — confirms array-order walk, not
    "highest answered index + 1".
  @trace FR-FORM-03 FR-FORM-04 TC-VALID-01

- [x] 2.2 Implement `lib/cycles/resume.ts` to make 2.1 green:
  - `firstUnansweredRequiredQuestion` as a pure function, no Prisma/Next/React import
    (TC-PURE-01).
  - Per-type validity check mirrors `isResponseComplete`'s rules exactly (scale: numeric
    match against `question.anchors`; open: non-empty after `.trim()`) — cite the
    duplication explicitly in a code comment pointing at `lib/cycles/status.ts` (flagged
    in `design.md` as an ADR-worthy future shared-helper candidate, not a blocker).
  - No `any`, no casts.
  @trace FR-FORM-03 FR-FORM-04 TC-PURE-01 TC-TS-01

- [x] 2.3 Write `app/respond/[token]/form-actions.test.ts` (RED — tests must fail before
  implementation):
  - Mock `lib/db` so no real DB is needed.
  - `saveAnswer` rejects a malformed payload (missing `token`, missing `questionId`, an
    `answerInputSchema`-invalid shape) with `{ ok: false, error }`, and no mocked Prisma
    method is called.
  - `saveAnswer` returns `{ ok: false, error }` when the token does not resolve to a
    cycle (mocked `findUnique` returns `null`).
  - `saveAnswer` returns `{ ok: false, error }` when the resolved cycle's `status` is
    `"done"` or `"expired"` — no `Answer`/`Response` write attempted.
  - `saveAnswer` returns `{ ok: false, error }` when `questionId` does not match any
    question id in the cycle's own `templateSnapshot` (cross-cycle/wrong-question-id
    defense) — no write attempted.
  - `saveAnswer` returns `{ ok: false, error }` when the payload's discriminant (`type:
    "scale"` / `"open"`) does not match the snapshot question's own `type` for that
    `questionId` — no write attempted.
  - `saveAnswer` returns `{ ok: false, error }` when a `scale` value is not one of THIS
    question's own defined anchors (even if it would be a valid anchor value for a
    DIFFERENT question in the same template) — no write attempted.
  - `saveAnswer` upserts `Response` (mocked `db.response.upsert`) then `Answer` (mocked
    `db.answer.upsert`, keyed by `responseId_questionId`) for a valid `collecting`-cycle
    payload, and returns `{ ok: true, complete: false }` when the mocked full-answers
    re-read (`db.answer.findMany`) shows the template still incomplete after this save.
  - `saveAnswer` returns `{ ok: true, complete: true }` AND calls
    `db.cycle.update({ where: { id }, data: { status: "done" } })` when the mocked
    full-answers re-read shows `isResponseComplete` now true and the cycle's prior status
    was `"collecting"`.
  - `saveAnswer` does NOT call `db.cycle.update` (status stays `collecting`) when the
    full-answers re-read shows the template still incomplete.
  - Re-saving an already-answered `questionId` (resave/edit case) updates the existing
    `Answer` row (mocked `db.answer.upsert`'s `update` branch) and nulls the other type's
    column (`text: null` when resaving as `scale`, `scaleValue: null` when resaving as
    `open`) — confirms the defensive null-out from `design.md`.
  @trace FR-FORM-03 FR-FORM-04 TC-VALID-01 NFR-SEC-01

- [x] 2.4 Implement `app/respond/[token]/form-actions.ts` to make 2.3 green:
  ```
  "use server";
  ```
  - Define the save-answer input schema as `z.object({ token: tokenBoundarySchema,
    answer: answerInputSchema })` (reuses `tokenBoundarySchema` and `answerInputSchema`,
    does not redefine either).
  - Parse the inbound payload; on failure return `{ ok: false, error: <Ukrainian inline
    message> }`.
  - `db.cycle.findUnique({ where: { token }, select: { id: true, status: true,
    templateSnapshot: true } })`; on `null` return `{ ok: false, error: <not-found
    message> }`.
  - Parse `templateSnapshot` through `snapshotSchema` (reused from `lib/cycles/
    snapshot.ts`) — defensive, mirrors `getRespondentCycleByToken`'s existing pattern; on
    parse failure return `{ ok: false, error }`, no write.
  - If `cycle.status !== "collecting"`, return `{ ok: false, error: <closed message> }`.
  - Look up `question = snapshot.questions.find((q) => q.id === answer.questionId)`; if
    not found, return `{ ok: false, error }` — the cross-cycle/wrong-id defense.
  - If `question.type !== answer.type`, return `{ ok: false, error }` — type-mismatch
    defense.
  - If `answer.type === "scale"`, call `isValidAnchorValue(answer.value,
    question.anchors ?? [])`; if `false`, return `{ ok: false, error }`.
  - Upsert `Response` (lazy create on `cycleId`) then upsert `Answer` keyed by
    `(responseId, questionId)`, nulling the other type's column on update (exact pattern
    from `design.md`'s Prisma upsert section).
  - Re-read all answers for this `responseId` (`db.answer.findMany`), map to the flat
    `Record<string, number | string>` shape `isResponseComplete` expects.
  - Call `isResponseComplete(snapshot, fullAnswersRecord)`. If `true` and
    `cycle.status === "collecting"`, write `db.cycle.update({ where: { id: cycle.id },
    data: { status: "done" } })`.
  - Return `{ ok: true, complete: <result of isResponseComplete> }`.
  - No `any`, no casts. Every Prisma call wrapped so a thrown DB error becomes `{ ok:
    false, error: <generic server-error message> }`, never an unhandled rejection
    surfacing a raw 500 to the respondent.
  @trace FR-FORM-03 FR-FORM-04 TC-VALID-01 TC-TS-01 NFR-SEC-01

- [x] 2.5 Extend `app/respond/[token]/queries.test.ts` (RED additions — extend the
  existing test file, do not duplicate it):
  - `getRespondentCycleByToken` returns a new `savedAnswers: Record<string, number |
    string>` field, built from the mocked `Answer` rows under the cycle's `Response`
    (empty object `{}` when no `Response` row exists yet, or when it exists with zero
    `Answer` rows).
  - A mocked `scale` answer row (`scaleValue: 3, text: null`) maps to `savedAnswers[id] =
    3` (a number); a mocked `open` answer row (`scaleValue: null, text: "..."`) maps to
    `savedAnswers[id] = "..."` (a string).
  - All existing assertions from the `respond`/`link` slices (status branching,
    `subjectFirstName`, `mode`, no-PII fields, broken-snapshot-returns-null) remain green
    unchanged.
  @trace FR-FORM-03 FR-FORM-04 BC-PRIVACY-02

- [x] 2.6 Extend `app/respond/[token]/queries.ts`'s `RespondentCycle` type and
  implementation to make 2.5 green:
  - Add `savedAnswers: Record<string, number | string>` to the `RespondentCycle` type.
  - Extend the `select` clause: `response: { select: { answers: { select: {
    questionId: true, scaleValue: true, text: true } } } }`.
  - Map `cycle.response?.answers ?? []` into the flat record: for each row, if
    `scaleValue !== null` set `[questionId]: scaleValue`, else if `text !== null` set
    `[questionId]: text` (no `any`, no cast — Prisma's generated row type already
    discriminates via nullability checks, not a manual assertion).
  @trace FR-FORM-03 FR-FORM-04 TC-TS-01

---

## 3. Services and Server Actions

- [x] 3.1 Confirm `saveAnswer` (task 2.4) is the only server action this slice adds, and
  that it lives in `app/respond/[token]/form-actions.ts`, NOT in the existing
  `app/respond/[token]/actions.ts` (which stays scoped to `chooseMode` per `design.md`
  Decision 2 — confirm `actions.ts`'s diff is empty for this slice). @trace FR-FORM-03

- [x] 3.2 Decide and document (inline code comment, referencing `design.md`) whether the
  `Response` upsert + `Answer` upsert run inside a `db.$transaction([...])` or as
  sequential awaits — implement whichever keeps `saveAnswer`'s error handling simplest to
  read end to end, per `design.md`'s note that this is a defensive nicety, not a
  correctness requirement. @trace FR-FORM-03

---

## 4. UI and route handlers

- [x] 4.1 Implement `app/respond/[token]/ScaleAnswerField.tsx` (`"use client"`):
  - Props: `questionId: string`, `anchors: TemplateSnapshot["questions"][number]
    ["anchors"]` (ordered, as stored in the snapshot — no client-side reordering),
    `value: number | null` (the currently selected anchor value, or `null`), `onChange:
    (value: number) => void`, `error?: string` (the specific inline message, if any).
  - Renders each anchor as its own selectable row (e.g. a styled `<button type="button">`
    or a visually-hidden native radio + visible label) whose LABEL TEXT is the clickable
    control — no bare numeric 1-5 row, per FR-FORM-02. Anchors render in their defined
    (snapshot) order.
  - Exactly one anchor is selectable at a time; selecting a different anchor deselects
    the previous one (single-select, controlled by `value`/`onChange`, not internal
    uncontrolled state).
  - Every anchor row has an accessible name (the label text itself, or `aria-label`
    matching it) and a visible 2px accent focus ring (reuse the project's existing
    `focus-ring` utility class, confirmed present in `ErrorState.tsx`'s retry button).
  - Renders `error` inline below the control when present, in the same calm style as
    other inline validation messages in this codebase.
  @trace FR-FORM-02 NFR-A11Y-01

- [x] 4.2 Implement `app/respond/[token]/OpenAnswerField.tsx` (`"use client"`):
  - Props: `questionId: string`, `value: string`, `onChange: (value: string) => void`,
    `error?: string`.
  - Renders a `<textarea>` with an accessible name (`aria-label` or an associated
    `<label>`), a visible 2px accent focus ring, and the auto-grow `onInput`/mount
    behaviour from `design.md`'s "Auto-growing textarea implementation" section
    (resets `style.height` then sets it to `scrollHeight`, applied on mount too so a
    restored multi-line saved value renders already expanded, not clipped).
  - Renders `error` inline below the control when present.
  @trace FR-FORM-02 NFR-A11Y-01

- [x] 4.3 Implement `app/respond/[token]/FormFlow.tsx` (`"use client"`):
  - Props: `token: string`, plus the cycle fields needed to drive the flow:
    `questions: TemplateSnapshot["questions"]`, `savedAnswers: Record<string, number |
    string>`, `cycleStatus: "collecting" | "done"` (an already-`done` cycle, reached by
    reopening a completed link, renders the confirmation immediately — see task 4.5),
    plus `subjectFirstName`/`methodology`/`deadline`/`daysRemaining` for the
    greeting/meta block (reuse the same markup pattern `ModeStub` already established,
    extracting a shared sub-component if duplication would otherwise result, per
    TC-ARCH-01).
  - On mount (or via `useState` initial value, since `savedAnswers`/the resume target are
    already known server-side), computes the initial question index using
    `firstUnansweredRequiredQuestion` imported from `lib/cycles/resume.ts` — `null` means
    "render the completion confirmation directly", not question 1.
  - `questions.length === 0` renders `EmptyState` (FR-FORM-01 empty-state scenario) — no
    question screen, no advance/completion control.
  - Otherwise renders ONE question at a time: the position indicator ("Питання N з M" —
    confirm exact Ukrainian copy in task 6.1), the question text, the appropriate field
    (`ScaleAnswerField`/`OpenAnswerField` by `question.type`), and an "advance" button.
  - "Advance" button behaviour: if the current question is `required` and its current
    local value is empty/unset, show the specific inline message on that question's field
    (no request sent) and do not advance. Otherwise call `saveAnswer({ token, answer })`
    via `useTransition`; while pending, disable the advance button and show
    `uk.shell.states.loading`-style pending text.
  - On `{ ok: true, complete: true }`: render the quiet completion sentence (task 4.4),
    regardless of whether the just-saved question was the last in the array (per
    `design.md`'s "server is sole authority on completion" — completion is driven by the
    response, not by `N === M` locally).
  - On `{ ok: true, complete: false }`: advance local state to the NEXT question by
    `order` (not necessarily `currentIndex + 1` if a future resumed state has gaps —
    reuse `firstUnansweredRequiredQuestion` again on the updated in-memory answers map
    to pick the next screen, keeping one single source of truth for "what's next" rather
    than two separate index-increment and resume-lookup code paths).
  - On `{ ok: false, error }`: render the returned `error` inline on the current
    question's field (no raw exception, no console error), re-enable the advance button,
    stay on the current question.
  - Before the saved state is available (this should not normally happen since `page.tsx`
    is server-rendered with `savedAnswers` already resolved — confirm via task 4.6
    whether a loading state is ever reachable here, or whether `LoadingState` is reserved
    for the pending-autosave-transition case only; document the decision in a code
    comment).
  - No exclamation marks, no emoji, Lucide outline icons only, design-system tokens,
    sentence case.
  @trace FR-FORM-01 FR-FORM-02 FR-FORM-03 FR-FORM-04 NFR-A11Y-02 NFR-I18N-01

- [x] 4.4 Implement the quiet completion confirmation (either inline within `FormFlow`
  or a small extracted `FormComplete.tsx` — pick whichever avoids prop-drilling
  duplication):
  - Exactly one calm sentence (`uk.respondent.formComplete` — see task 6.1), no confetti,
    no celebratory animation, no sound, sentence case, no exclamation marks or emoji.
  - Rendered both when a save just completed the cycle (task 4.3's `complete: true`
    branch) AND when `cycleStatus === "done"` is already true on initial render (a
    reopened, already-completed link) — same component, same copy, both paths.
  @trace FR-FORM-04 BC-BRAND-01

- [x] 4.5 Extend `app/respond/[token]/page.tsx`'s `collecting` branch (do not touch the
  `notFound`/`done`/`expired` top-level branches, which stay exactly as `link`/`respond`
  left them) per `design.md` Decision 4:
  - `cycle.mode === null` → `ModeChoice` (unchanged).
  - `cycle.mode === "form"` → new `<FormFlow token={...} questions={cycle.questions}
    savedAnswers={cycle.savedAnswers} cycleStatus={cycle.status} ... />` — confirm
    `cycle.status` here is always `"collecting"` at this point in the branch (the
    top-level `done`/`expired` short-circuits already ran) UNLESS a save inside this same
    request flips it — `FormFlow` only needs to handle `"collecting"` as the entry
    `cycleStatus`, since a TRULY already-`done` cycle is caught by the top-level `done`
    branch before reaching here; confirm this reasoning in a code comment and adjust
    `FormFlow`'s prop type accordingly if it simplifies (i.e. `FormFlow` may not need a
    `cycleStatus` prop at all if `savedAnswers` + `firstUnansweredRequiredQuestion`
    already fully determine "show confirmation vs show question N" — resolve this during
    implementation, not as a presumption baked into this task list).
  - `cycle.mode === "interview"` → `ModeStub` (UNCHANGED — confirm `ModeStub.tsx` has a
    zero-line diff for this slice).
  @trace FR-FORM-01 FR-FORM-04 BC-PRIVACY-02

- [x] 4.6 Confirm and document (code comment in `page.tsx` or `FormFlow.tsx`) whether a
  client-visible loading state between server-render and hydration is ever reachable for
  the form-mode branch, given `savedAnswers`/`questions` are already resolved
  server-side before any HTML is sent — if not reachable, the FR-FORM-01 "loading state
  before saved answers hydrate" scenario is satisfied trivially (there is no unhydrated
  gap to show a skeleton for); if reachable (e.g. a slow client-side re-fetch path is
  added later), wire in `LoadingState` at that point, not preemptively. @trace FR-FORM-01

---

## 5. Tests

- [x] 5.1 Verify `lib/cycles/resume.test.ts` (task 2.1) is fully green, including the
  out-of-order resume case and the all-optional vacuous-`null` case. No `any`, casts, or
  `@ts-ignore`. @trace FR-FORM-03 FR-FORM-04 TC-TS-01

- [x] 5.2 Verify `app/respond/[token]/form-actions.test.ts` (task 2.3) is fully green,
  including: the wrong-question-id rejection, the type-mismatch rejection, the
  wrong-question-anchor rejection (a value valid for question B rejected when sent for
  question A), the lazy `Response` creation, the `complete: true` → `Cycle.status`
  update, and the resave-nulls-the-other-column behaviour. @trace FR-FORM-03 FR-FORM-04
  TC-TS-01 NFR-SEC-01

- [x] 5.3 Verify the extended `app/respond/[token]/queries.test.ts` (task 2.5) is fully
  green, including the `savedAnswers` shape mapping for both answer types and every
  pre-existing `link`/`respond`-slice assertion (no regression). @trace FR-FORM-03
  FR-FORM-04 BC-PRIVACY-02

- [x] 5.4 Manual smoke test (after tasks 4.1–4.6, against a real local DB):
  a. Seed or create a cycle in `collecting` status with `mode = "form"` and a template
     snapshot of at least 3 questions: one required `scale`, one required `open`, one
     optional (either type). Copy its `token`.
  b. Open `/respond/<token>` — confirm "Question 1 of 3" (or your seeded `M`) renders
     with the first question's control, and the read-only question-list stub from
     `ModeStub` is NOT shown (the real form replaced it).
  c. Try to advance the required `scale` question with no anchor selected — confirm
     advancing is blocked, a specific inline message appears on that question, and no
     network request fires (check devtools network tab).
  d. Select an anchor and advance — confirm the page moves to "Question 2 of 3" and the
     scale answer was persisted (verify in the DB: an `Answer` row with the correct
     `scaleValue`, and a `Response` row now exists for this cycle).
  e. Type multiple lines into the required `open` question's textarea — confirm it grows
     to fit the text without an inner scrollbar — leave it blank and try to advance —
     confirm it blocks with a specific inline message — then fill it and advance.
  f. Leave the optional question blank and advance (or complete, if it is the last) —
     confirm advancing/completing succeeds with the optional answer recorded as
     unanswered.
  g. Confirm the quiet completion sentence renders after the last required question is
     answered — no confetti, no animation, no sound — and check the DB: `Cycle.status`
     is now `"done"`.
  h. Reload the same `/respond/<token>` URL — confirm it shows the completion
     confirmation directly (not a fresh "Question 1 of 3").
  i. Seed a SECOND cycle, answer only some required questions (skip a later one if your
     form allows navigating without the earlier required answer — or directly write a
     partial `Answer` row in the DB for question 1 only, leaving question 2 required and
     unanswered, simulating a resumed/out-of-order session), then close and reopen the
     link — confirm the form resumes at the EARLIEST unanswered required question, not
     at "wherever was last saved + 1".
  j. Attempt to call `saveAnswer` (e.g. via a temporary script or browser devtools
     console invoking the action with a crafted payload) using a `questionId` that
     belongs to a DIFFERENT cycle's template — confirm it is rejected and no answer is
     written to either cycle.
  k. Attempt a `scale` answer whose value is valid for a DIFFERENT question in the SAME
     template but not for the current question — confirm it is rejected.
  l. Manually set the cycle's `status` to `"expired"` mid-session (simulating the
     deadline passing) and attempt to advance — confirm the save is refused and no
     further answers are written.
  @trace FR-FORM-01 FR-FORM-02 FR-FORM-03 FR-FORM-04 BC-PRIVACY-01

---

## 6. Validation, docs, and archive prep

- [x] 6.1 Add the new keys to `lib/i18n/uk.ts`'s existing `respondent` namespace
  (append-only — do not modify any key from `link`/`respond`):
  ```
  questionPosition: "Питання {n} з {m}",
  formRequiredMissing: "Це питання обов'язкове. Будь ласка, дайте відповідь, щоб продовжити",
  formAdvancing: "Зберігаємо відповідь…",
  formSaveFailed: "Не вдалося зберегти відповідь. Спробуйте ще раз",
  formNext: "Далі",
  formComplete: "Дякуємо. Вашу відповідь збережено",
  formScaleLabel: "Оберіть варіант відповіді",
  formOpenLabel: "Ваша відповідь",
  formEmptyTitle: "Немає питань для відповіді",
  formEmptyBody: "У цьому циклі оцінювання немає жодного питання",
  ```
  Mirror in `lib/i18n/en.ts`. Confirm `modeStubBody`'s form-mode usage is removed (the
  `interview` branch may still use it until `ai-interview` lands — do not delete the key
  itself if `ModeStub` still references it for the interview branch). @trace NFR-I18N-01

- [x] 6.2 Run full verification loop — all must be green before proceeding:
  ```
  npm run lint
  npx tsc --noEmit
  npm test
  npm run build
  ```
  Confirm `saveAnswer` and any other `"use server"` file are not bundled into the client
  by inspecting the build output, and confirm `lib/cycles/resume.ts` has zero
  `next/*`/`react`/DOM imports. No `any`, no casts, no `@ts-ignore`. Console must be
  silent on a healthy session. @trace NFR-DX-01 TC-TS-01 TC-PURE-01

- [x] 6.3 Independent review pass (maker != checker): reviewer confirms:
  - `ModeStub.tsx` has a zero-line diff for this slice (the `interview` branch is
    genuinely untouched).
  - `app/respond/[token]/actions.ts` has a zero-line diff for this slice (the new action
    lives only in `form-actions.ts`, per Decision 2).
  - `saveAnswer` rejects a `scale` value valid for a DIFFERENT question in the same
    template when sent for the CURRENT question (anchors are read from the cycle's own
    snapshot per-question, not a flattened "any anchor in this template" set).
  - `saveAnswer` rejects a payload whose `questionId` does not belong to the resolved
    cycle's own `templateSnapshot` (cross-cycle-write defense) before any Prisma write.
  - `Cycle.status` only ever transitions to `"done"` via the
    `isResponseComplete(snapshot, fullAnswersRecord)` check on the FULL answer set, never
    via a "last question index reached" shortcut.
  - `firstUnansweredRequiredQuestion` and `isResponseComplete`'s per-type validity rules
    agree on every shared fixture (spot-check by running both against the same answers
    record in a scratch test, not just trusting independently-written tests to agree).
  - `lib/cycles/resume.ts` has no Prisma/Next/React import (TC-PURE-01).
  - No cycle id anywhere in the respondent page HTML, the `saveAnswer` payload, or any
    new component's props.
  - No auth check added to the public `/respond/[token]` route or `form-actions.ts` (it
    stays token-gated only, matching `chooseMode`'s precedent).
  - Every new client component (`ScaleAnswerField`, `OpenAnswerField`, `FormFlow`) has no
    exclamation marks, no emoji, and uses Lucide outline icons only where icons appear.
  @trace BC-PRIVACY-01 NFR-SEC-01 TC-PURE-01 TC-VALID-01

- [x] 6.4 Run `npx openspec validate add-form --strict` — fix any validation errors
  before proceeding. (Expected: this change folder has no `specs/` delta — the baseline
  `openspec/specs/form/spec.md` already exists in full from Phase 2 onboarding, so adding
  a duplicate "ADDED Requirements" block would be rejected by the validator; only
  `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md` exist in this folder.)

- [x] 6.5 Run `npx openspec validate --all --strict` — confirm no regressions in any
  other capability spec.

- [x] 6.6 Update `docs/current-state.md`:
  - Timestamp.
  - Mark `add-form` as complete.
  - Set next step to `add-ai-interview` (the remaining `mode === "interview"` branch,
    still rendering `ModeStub` until that slice lands) or whichever slice the
    `mvp-capability-plan.md` schedules next.

- [x] 6.7 Gate on smoke test (task 5.4) passing in full, then archive. NOTE: because this
  change folder has no `specs/` delta (per task 6.4), running `npx openspec archive
  add-form --yes` may have nothing to promote — follow the SAME manual archive pattern
  used for `add-respond` (moved to `openspec/changes/archive/<date>-add-form/` directly,
  rather than relying on `openspec archive` to promote a delta that does not exist,
  since the baseline spec was already fully authored ahead of this slice during
  onboarding). Do NOT archive if any smoke test step failed or the verification loop
  (6.2) is not fully green.
