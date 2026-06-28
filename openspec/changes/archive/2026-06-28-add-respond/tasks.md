# Tasks — add-respond

Implements FR-RESP-01, FR-RESP-02, FR-RESP-03.

Dependencies: slice `add-link` must be archived first — `app/respond/[token]/page.tsx`,
`app/respond/[token]/queries.ts`, `app/respond/[token]/schemas.ts` (`tokenBoundarySchema`),
and the `respondent` i18n namespace must all exist. `Cycle.mode RespondMode?` must already
be present in `prisma/schema.prisma` (added in `add-foundation`).

---

## 1. Dependencies and database schema

- [x] 1.1 Confirm no schema migration is needed: verify `Cycle.mode RespondMode?` is
  present in `prisma/schema.prisma` and the `RespondMode` enum carries exactly `form` |
  `interview`. No changes to the schema — do not run `prisma migrate`. @trace FR-RESP-02

- [x] 1.2 Confirm `app/respond/[token]/schemas.ts` exports `tokenBoundarySchema` and that
  `app/respond/[token]/queries.ts` exports `getRespondentCycleByToken` and
  `RespondentCycle`. These are reused, not redefined, by this slice. @trace TC-ARCH-01

---

## 2. Domain logic (validation, calculations, state machines)

- [x] 2.1 Write `lib/schemas/answer.test.ts` (RED — tests must fail before
  implementation):
  - `openAnswerSchema` accepts a string up to 4000 characters; rejects a 4001-character
    string.
  - `openAnswerSchema` accepts an empty string (an empty open answer is a valid, if
    unhelpful, answer — rejection of "no answer at all" is the writer's concern, not this
    schema's).
  - `scaleAnswerSchema` accepts a plain integer (e.g. `3`); rejects a decimal (`3.5`);
    rejects a numeric string (`"3"`); rejects a locale-formatted string (`"3,5"`,
    `"1 000"`); rejects a whitespace-padded string (`" 3 "`); rejects `NaN`/`Infinity`.
  - `answerInputSchema` discriminates on `type`: `{ type: "open", questionId, text }` and
    `{ type: "scale", questionId, value }`; an unexpected `type` value is rejected; a
    payload missing `questionId` is rejected.
  - `isValidAnchorValue(value, anchors)` returns `true` only when `value` exactly matches
    one `anchors[].value`; returns `false` for a value outside the anchor set, an empty
    anchor list, and a near-miss (e.g. anchors `[1,2,3]`, value `4`).
  @trace FR-RESP-03 TC-VALID-01

- [x] 2.2 Implement `lib/schemas/answer.ts` to make 2.1 green:
  - `openAnswerSchema = z.string().max(4000)`.
  - `scaleAnswerSchema = z.number().int()` — no `z.coerce`, no `z.preprocess` that trims
    or parses a string; a non-number input is rejected by Zod's base type check before any
    refinement runs.
  - `answerInputSchema` as a `z.discriminatedUnion("type", [...])` of the open and scale
    variants.
  - `AnswerInput = z.infer<typeof answerInputSchema>` (no hand-written parallel type).
  - `isValidAnchorValue` as a small pure function taking `value: number` and `anchors:
    ReadonlyArray<{ value: number }>` — no Prisma, no DB lookup, no `lib/cycles/snapshot`
    import (caller already has the snapshot anchors).
  - File has no `next/*`, `react`, or DOM import (TC-PURE-01). No `any`, no casts.
  @trace FR-RESP-03 TC-PURE-01 TC-VALID-01 TC-TS-01

- [x] 2.3 Write `app/respond/[token]/actions.test.ts` (RED — tests must fail before
  implementation):
  - Mock `lib/db` so no real DB is needed.
  - `chooseMode` rejects a malformed payload (missing `token`, missing `mode`, an
    unexpected `mode` value like `"chat"`) with `{ ok: false, error }`, and the mocked
    `db.cycle.updateMany` / `db.cycle.findUnique` are never called for a payload that
    fails the Zod parse.
  - `chooseMode` returns `{ ok: false, error }` when the token does not resolve to a
    cycle (mocked `findUnique` returns `null`), with no `updateMany` call.
  - `chooseMode` returns `{ ok: false, error }` when the resolved cycle's `status` is
    `"done"` or `"expired"`, with no `updateMany` call.
  - `chooseMode` returns `{ ok: true, mode: "form" }` when `updateMany` (mocked) reports
    `count: 1` for a `collecting` cycle with `mode: null`.
  - `chooseMode` returns `{ ok: true, mode: "interview" }` (the WINNER's mode, not the
    caller's requested mode) when `updateMany` (mocked) reports `count: 0` and a follow-up
    `findUnique` (mocked) reports the cycle's `mode` is already `"interview"` — simulating
    the loser of the race.
  @trace FR-RESP-02 TC-VALID-01

- [x] 2.4 Implement `app/respond/[token]/actions.ts` to make 2.3 green:
  ```
  "use server";
  ```
  - Define `chooseModeInputSchema = z.object({ token: tokenBoundarySchema, mode:
    z.enum(["form", "interview"]) })` (reuses `tokenBoundarySchema` from `./schemas`,
    does not redefine the token regex).
  - Parse the inbound payload; on failure return `{ ok: false, error: <Ukrainian inline
    message> }`.
  - `db.cycle.findUnique({ where: { token }, select: { id: true, status: true } })`; on
    `null` return `{ ok: false, error: <not-found message> }`.
  - If `status !== "collecting"`, return `{ ok: false, error: <closed message> }` — no
    write attempted.
  - `db.cycle.updateMany({ where: { id, mode: null }, data: { mode } })` (the conditional,
    race-safe write — design Decision 1).
  - If `result.count === 1`, return `{ ok: true, mode }`.
  - If `result.count === 0`, re-read `db.cycle.findUnique({ where: { id }, select: { mode:
    true } })` and return `{ ok: true, mode: <winner's mode> }` — never throw if the
    re-read's `mode` is unexpectedly `null` (treat as a server error message instead, no
    raw 500).
  - No `any`, no casts. Mark with `import "server-only"` is implicit via `"use server"`
    but the file must not be importable from a client bundle by accident — verify via the
    build step (task 6.2).
  @trace FR-RESP-02 TC-VALID-01 TC-TS-01

- [x] 2.5 Extend `app/respond/[token]/queries.test.ts` (RED additions — extend the
  existing `link`-slice test file, do not duplicate it):
  - `getRespondentCycleByToken` returns `mode: null` for a `collecting` cycle whose
    `Cycle.mode` column is `null` in the mocked DB row.
  - Returns `mode: "form"` / `mode: "interview"` when the mocked DB row's `mode` column
    carries that value.
  - All existing assertions from the `link` slice (status branching, `subjectFirstName`,
    no-PII fields, broken-snapshot-returns-null) remain green unchanged.
  @trace FR-RESP-02 BC-PRIVACY-02

- [x] 2.6 Extend `app/respond/[token]/queries.ts`'s `RespondentCycle` type and
  implementation to make 2.5 green:
  - Add `mode: RespondMode | null` to the `RespondentCycle` type (import `RespondMode`
    from `@prisma/client` or re-export the `lib/cycles/status.ts`-style local type if one
    exists — confirm there is exactly one canonical `RespondMode` type reused, not a
    second hand-written union).
  - Add `mode: true` to the `select` clause's top-level fields.
  - Return `cycle.mode` directly (it is already typed `RespondMode | null` by Prisma — no
    cast needed).
  @trace FR-RESP-02 TC-TS-01

---

## 3. Services and Server Actions

- [x] 3.1 Confirm `chooseMode` (task 2.4) is the only server action this slice adds —
  there is no separate "submit answer" action in this slice (that belongs to `form` /
  `ai-interview`). @trace FR-RESP-02

---

## 4. UI and route handlers

- [x] 4.1 Implement `app/respond/[token]/ModeChoice.tsx` (`"use client"`):
  - Props: `token: string` (opaque token only, never the cycle id).
  - Renders the confidentiality note (`uk.respondent.confidentiality`) and the mode-choice
    title (`uk.respondent.modeChoiceTitle`), then two buttons: form
    (`uk.respondent.modeForm` + `modeFormHint`) and interview (`uk.respondent.modeInterview`
    + `modeInterviewHint`).
  - Uses `useTransition` to call the `chooseMode` server action on click; while pending,
    disables both buttons and shows `uk.respondent.modeChoosing` near the clicked button.
  - On `{ ok: true }`, calls `router.refresh()` so the server component re-renders into
    `ModeStub` for the now-persisted mode (which may differ from the clicked mode if this
    request lost the race — task 2.4 returns the winner's mode either way).
  - On `{ ok: false }`, renders the returned `error` inline below the buttons (no raw
    exception, no console error), re-enables both buttons.
  - No exclamation marks, no emoji, Lucide outline icons only, design-system tokens,
    sentence case.
  @trace FR-RESP-02 BC-BRAND-01

- [x] 4.2 Implement `app/respond/[token]/ModeStub.tsx` (server component):
  - Props: `mode: "form" | "interview"`, plus the fields already rendered by the `link`
    slice's `collecting` branch (`subjectFirstName`, `methodology`, `deadline`,
    `daysRemaining`, `questions`).
  - Renders the existing greeting/methodology/deadline block and read-only question list
    (reuse the exact JSX `link` built — do not reimplement it; extract to a shared
    sub-component if that avoids duplication, per TC-ARCH-01).
  - Adds the confidentiality note (`uk.respondent.confidentiality`) once, near the
    greeting.
  - Adds one acknowledgement line: `uk.respondent.modeChosenForm` or
    `uk.respondent.modeChosenInterview` depending on `mode`, followed by
    `uk.respondent.modeStubBody`.
  - Comment at the top of the file: `// STUB — replaced wholesale by the form/ai-interview
    slices when mode === "form" / "interview" respectively. Do not extend this file with
    real answering UI; build it in the owning slice instead.`
  @trace FR-RESP-02 FR-RESP-01 BC-BRAND-01

- [x] 4.3 Extend `app/respond/[token]/page.tsx`'s `collecting` branch (do not touch the
  `notFound` / `done` / `expired` branches, which stay exactly as the `link` slice left
  them):
  - After resolving `cycle.status === "collecting"`, branch further on `cycle.mode`:
    - `mode === null` → render `<ModeChoice token={token} />` (plus the existing
      greeting/confidentiality content — confirm whether `ModeChoice` itself renders the
      greeting, or the page renders it once and passes children; pick whichever avoids
      duplicating the greeting markup between `ModeChoice` and `ModeStub`).
    - `mode !== null` → render `<ModeStub mode={cycle.mode} ... />` with the rest of the
      already-resolved cycle fields passed through.
  - Confirm the question preview (the `<ol>` of questions) is NOT rendered when
    `mode === null` — only the mode-choice screen is shown (design Decision 5).
  - No `notFound()` from Next.js; still no cycle id anywhere in rendered HTML.
  @trace FR-RESP-01 FR-RESP-02 BC-PRIVACY-02

---

## 5. Tests

- [x] 5.1 Verify `lib/schemas/answer.test.ts` (from task 2.1) is fully green. No test uses
  `any`, casts, or `@ts-ignore`. @trace TC-TS-01 NFR-DX-01

- [x] 5.2 Verify `app/respond/[token]/actions.test.ts` (from task 2.3) is fully green,
  including the race-loser scenario (`count: 0` → re-read → winner's mode returned).
  @trace FR-RESP-02 TC-TS-01

- [x] 5.3 Verify the extended `app/respond/[token]/queries.test.ts` (task 2.5) is fully
  green, including both the new `mode` assertions and every pre-existing `link`-slice
  assertion (no regression). @trace FR-RESP-02 BC-PRIVACY-02

- [x] 5.4 Manual smoke test (after tasks 4.1–4.3, against a real local DB):
  a. Seed or create a cycle in `collecting` status with `mode = null`. Copy its `token`.
  b. Open `/respond/<token>` — confirm the mode-choice screen renders: greeting,
     confidentiality note, and exactly two buttons (form / AI chat). Confirm the
     read-only question list is NOT shown yet.
  c. Click "Заповнити форму" — confirm a brief pending state, then the page re-renders
     into the stub screen acknowledging "Ви обрали форму", showing the read-only question
     list and the confidentiality note.
  d. Reload the same `/respond/<token>` URL — confirm it goes straight to the form stub
     screen (no re-prompt for a mode).
  e. In the DB, manually reset that cycle's `mode` back to `null`. Open the link in two
     browser tabs simultaneously; in one tab click "form", in the other click "AI chat"
     as close together as practical — confirm exactly one mode wins (check the DB), both
     tabs end up showing the SAME stub screen after refresh, and neither tab shows a
     console error or a raw 500.
  f. Manually set a different cycle's `status` to `expired` with `mode = null`. Open its
     `/respond/<token>` — confirm the existing calm "window closed" page renders, with no
     mode-choice screen reachable.
  g. Manually set a `collecting` cycle's `status` to `done` mid-session (simulating a
     concurrent completion) and attempt `chooseMode` against it directly (e.g. via a
     temporary test button or server console) — confirm `{ ok: false }` is returned and
     no `mode` is written.
  @trace FR-RESP-01 FR-RESP-02 FR-RESP-03 BC-PRIVACY-01

---

## 6. Validation, docs, and archive prep

- [x] 6.1 Add the new keys to `lib/i18n/uk.ts`'s existing `respondent` namespace
  (append-only — do not modify any key from the `link` slice):
  ```
  confidentiality: "Ваші відповіді конфіденційні та використовуються лише для цієї оцінки",
  modeChoiceTitle: "Як вам зручніше відповісти",
  modeForm: "Заповнити форму",
  modeFormHint: "Питання одне за одним, з прогресом",
  modeInterview: "Відповісти в чаті з AI",
  modeInterviewHint: "Розмова замість форми",
  modeChoosing: "Зберігаємо вибір…",
  modeChoiceFailed: "Не вдалося зберегти вибір. Спробуйте ще раз",
  modeChosenForm: "Ви обрали форму",
  modeChosenInterview: "Ви обрали чат з AI",
  modeStubBody: "Цей екран — заглушка. Реальна форма зʼявиться найближчим часом",
  ```
  Mirror in `lib/i18n/en.ts`. @trace NFR-I18N-01

- [x] 6.2 Run full verification loop — all must be green before proceeding:
  ```
  npm run lint
  npx tsc --noEmit
  npm test
  npm run build
  ```
  Confirm `chooseMode` and any other `"use server"` file are not bundled into the client
  by inspecting the build output for stray server-only code, and confirm `lib/schemas/
  answer.ts` has zero `next/*`/`react`/DOM imports. No `any`, no casts, no `@ts-ignore`.
  Console must be silent on a healthy session. @trace NFR-DX-01 TC-TS-01 TC-PURE-01

- [x] 6.3 Independent review pass (maker != checker): reviewer confirms:
  - The conditional write in `chooseMode` is exactly `updateMany` guarded by `WHERE mode
    IS NULL` (or equivalent) — not a read-then-write — and the loser path re-reads and
    returns the winner's mode rather than its own requested mode.
  - `chooseMode` refuses the write for a `done`/`expired` cycle before attempting
    `updateMany`.
  - `lib/schemas/answer.ts` has no Prisma/Next/React import and `scaleAnswerSchema`
    rejects every locale-formatted/whitespace/coerced example listed in the baseline spec
    scenario, not just generic non-numbers.
  - `ModeChoice` does not render the question preview while `mode === null`.
  - `ModeStub`'s file-top comment correctly flags it as a placeholder for `form`/
    `ai-interview` to replace, not extend.
  - No cycle id anywhere in the respondent page HTML, the `chooseMode` payload, or the
    `ModeChoice`/`ModeStub` component props.
  - `lib/` remains framework-free (no `next/*`, `react`, or DOM in `lib/schemas/answer.ts`
    or any other `lib/` file touched by this slice).
  - No auth check added to the public `/respond/[token]` route or its server action (it
    stays token-gated only, matching `link`).
  @trace BC-PRIVACY-01 NFR-SEC-01 TC-PURE-01 TC-VALID-01

- [x] 6.4 Run `npx openspec validate add-respond --strict` — fix any validation errors
  before proceeding.

- [x] 6.5 Run `npx openspec validate --all --strict` — confirm no regressions in any
  other capability spec.

- [x] 6.6 Update `docs/current-state.md`:
  - Timestamp.
  - Mark `add-respond` as complete.
  - Set next step to `add-form` (depends on this slice for the mode gate and the shared
    `lib/schemas/answer.ts` contract).

- [x] 6.7 Gate on smoke test (task 5.4) passing in full, then run:
  ```
  npx openspec archive add-respond --yes
  ```
  This moves the change to `openspec/changes/archive/` and promotes the ADDED
  requirements into `openspec/specs/respond/spec.md`. Do NOT archive if any smoke test
  step failed or the verification loop (6.2) is not fully green.
