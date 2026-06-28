# Design — add-respond

Implements `openspec/specs/respond/spec.md` (FR-RESP-01..03). No schema migration;
`Cycle.mode RespondMode?` already exists in `prisma/schema.prisma`. Extends the `link`
slice's `app/respond/[token]/page.tsx` and `queries.ts`; reuses `tokenBoundarySchema` from
`app/respond/[token]/schemas.ts`, `db` from `lib/db/`, and the `respondent` i18n namespace.

## Goals

- Add the missing one-line confidentiality note to the existing intro (FR-RESP-01).
- Gate the (currently unconditional) question preview behind a mode choice when
  `Cycle.mode` is unset, and persist that choice race-safely (FR-RESP-02).
- Define the single shared answer-write Zod contract that `form` and `ai-interview` will
  both import, with no DB write in this slice (FR-RESP-03).
- Keep `lib/` framework-free; keep the mutation (a Prisma write) in `app/`.

## Non-goals

- Building the real form section flow or the real AI chat UI (form/ai-interview slices).
- Writing any `Answer`/`Response` row.
- Supporting mode switching after answering begins.
- Supporting more than one respondent per cycle.

---

## Key decisions

### Decision 1: First-write-wins via `updateMany` guarded by `WHERE mode IS NULL`

**Options considered:**

A. `db.cycle.updateMany({ where: { id, mode: null }, data: { mode } })`, then branch on
   `result.count` (chosen).
B. Read-then-write: `findUnique` to check `mode === null`, then `update` if so.
C. A Postgres-level unique partial index / advisory lock plus a transaction.
D. `update` unconditionally (last write wins) and accept the race.

**Chosen: A.** `updateMany` with a `WHERE mode IS NULL` predicate is a single atomic
statement — Postgres evaluates the predicate and applies the write in one round trip, so
two concurrent requests cannot both "see" `mode IS NULL` and both win; the database's row
lock during the `UPDATE` serialises the two statements, and only the first to acquire the
lock matches the `WHERE` clause (the second sees `mode` already non-null and updates zero
rows). `result.count` deterministically tells the caller whether ITS request won (`count
=== 1`) or lost to a concurrent winner (`count === 0`) — no second query needed to know
the outcome, and the caller still needs one follow-up read only to discover WHICH mode
won when it lost (see flow below).

**Rejected B:** read-then-write has a classic check-then-act race — two requests can both
read `mode === null` before either writes, and both then issue an unconditional `update`,
with the second silently overwriting the first (last-write-wins, violating the spec's
explicit first-write-wins requirement).

**Rejected C:** correct but heavier than needed — a partial unique index or advisory lock
adds schema/infra complexity for a single nullable enum column with one writer per cycle
in practice (BC scoped to one respondent per cycle). `updateMany`'s atomicity is sufficient
without it.

**Rejected D:** directly violates the spec scenario "first chooser binds the link for all
later openers" — last-write-wins would let a second, slower device silently overwrite an
already-answered respondent's mode.

**Trade-off:** the loser's request must do one extra read (`findUnique` for `mode`) to
report back which mode actually won, so it can render the correct stub screen instead of
the one the loser tried to pick. This is a single indexed lookup on the cycle's primary
key — negligible cost — and is the only way to give the loser accurate feedback without
inventing a return-the-winner variant query.

### Decision 2: Mode-choice server action lives in `app/respond/[token]/actions.ts`

**Options considered:**

A. `app/respond/[token]/actions.ts`, a server action co-located with the route it serves
   (chosen).
B. A `lib/respond/` module wrapping the Prisma call.

**Chosen: A.** The action performs a Prisma write — `lib/` is strictly framework-free
(TC-PURE-01), so the write itself cannot live there. Following Decision 3 from the `link`
slice's design (co-located queries in `app/`), the action is the natural Next.js Server
Action attached to the form button in `ModeChoice.tsx`. The pure pieces (the mode-choice
Zod schema) still live in a shared, framework-free location (`lib/schemas/answer.ts`,
see Decision 4) so they are reusable and unit-testable without a DB.

### Decision 3: `getRespondentCycleByToken` is extended in place, not duplicated

**Options considered:**

A. Add `mode: RespondMode | null` to the existing `RespondentCycle` type and `select`
   clause in `app/respond/[token]/queries.ts` (chosen).
B. Add a second query function `getCycleMode(token)` called separately from the page.

**Chosen: A.** The page already calls `getRespondentCycleByToken` once per request; a
second query would be a redundant round trip for data keyed by the same token. Extending
the existing return type is also exactly what the `link` slice's design anticipated by
keeping the type definition open for that field (the type was already named
`RespondentCycle`, not `LinkLandingCycle`, since it was always meant to carry the full
respondent-facing cycle state across the `link` → `respond` slice boundary).

### Decision 4: Shared answer-write contract lives in `lib/schemas/answer.ts`

**Options considered:**

A. `lib/schemas/answer.ts` — alongside `lib/schemas/{employee,cycle,template,usage}.ts`
   (chosen).
B. `lib/respond/answer.ts` — under a respond-specific subtree.

**Chosen: A.** `lib/schemas/` is already the established, single home for every Zod
boundary schema in the repo (TC-ARCH-01 — define once, import everywhere); `form` and
`ai-interview` will both import from here, and neither is "respond's" subtree, so naming
it under `lib/respond/` would misleadingly suggest respond owns the writers. The schema
itself has zero Prisma/Next/React dependency, matching every other file in `lib/schemas/`.

**ADR-worthy:** this is the contract two future slices (`form`, `ai-interview`) must both
honour without redefining it — flagging here so the slices that consume it don't
accidentally fork the rules (e.g. a slightly different max-length).

### Decision 5: Mode-choice screen vs question preview — gate placement

**Options considered:**

A. When `mode === null`, render ONLY the mode-choice screen (greeting + confidentiality
   note + two mode buttons); hide the question preview entirely until a mode is chosen
   (chosen).
B. Always show greeting + question preview, with the mode-choice buttons appended below.

**Chosen: A.** The spec's scenario "Respondent picks a mode on first open" states "no
answering surface is shown until one is chosen." The read-only question preview built by
`link` is not itself an answering surface, but showing the full question list before the
respondent has committed to a mode adds visual noise and contradicts the calm,
single-decision-at-a-time intent of the spec's wording ("the page offers exactly two
choices ... and no answering surface is shown"). Keeping the first screen minimal (intro +
confidentiality note + two choices) is also the simplest mental model: decide how, then
see what. The full read-only preview becomes part of the post-choice stub screen instead
(see below), which still satisfies FR-RESP-01 (intro is shown either way).

---

## Flow: respondent landing with mode gate

```
params.token
  │
  ▼
tokenBoundarySchema.safeParse(token)        (link slice, reused)
  │ failure → calm not-found page            (unchanged)
  ▼
getRespondentCycleByToken(token)             (extended: now also returns `mode`)
  │ null            → calm not-found page    (unchanged)
  │ status "done"   → calm done page         (unchanged)
  │ status "expired"→ calm expired page      (unchanged)
  │ status "collecting"
  ▼
mode === null?
  │ yes → render <ModeChoice token={token} /> (NEW — greeting + confidentiality note +
  │        two buttons, calls chooseMode server action on click)
  │ no  → render <ModeStub mode={cycle.mode} questions={cycle.questions} ... /> (NEW —
           acknowledges the chosen mode; form/ai-interview slices replace this body)
```

## Server action: `chooseMode`

**File:** `app/respond/[token]/actions.ts`

```typescript
"use server";
// @trace FR-RESP-02

const chooseModeInputSchema = z.object({
  token: tokenBoundarySchema,
  mode: z.enum(["form", "interview"]),
});

type ChooseModeResult =
  | { ok: true; mode: "form" | "interview" }
  | { ok: false; error: string };

async function chooseMode(input: unknown): Promise<ChooseModeResult>
```

Implementation steps:

1. Parse `input` with `chooseModeInputSchema.safeParse`. On failure, return
   `{ ok: false, error: <inline message> }` — never throw, never a raw 500 (TC-VALID-01).
2. Look up the cycle id by token (`db.cycle.findUnique({ where: { token }, select: { id:
   true, status: true } })`). If `null`, return `{ ok: false, error: <not-found message> }`
   — token vanished/invalid between render and submit.
3. If `cycle.status !== "collecting"`, return `{ ok: false, error: <closed message> }` —
   answering (including mode choice) is refused for a non-collecting cycle (FR-RESP-02,
   the shared "non-collecting cycle" rule from the Invalid/expired requirement).
4. Conditional write: `const result = await db.cycle.updateMany({ where: { id: cycle.id,
   mode: null }, data: { mode: input.mode } })` (Decision 1).
5. If `result.count === 1`, this request won — return `{ ok: true, mode: input.mode }`.
6. If `result.count === 0`, this request lost to a concurrent winner — re-read
   `db.cycle.findUnique({ where: { id: cycle.id }, select: { mode: true } })` and return
   `{ ok: true, mode: <the already-set mode> }` (a reopen of the now-already-chosen mode,
   not an error — per the spec's explicit "neither request surfaces a conflict error").
7. `revalidatePath` (or rely on the client redirecting/refreshing) so the page re-renders
   in the now-known mode.

No `any`, no casts. The two-branch result type lets the client component render an inline
error only on `ok: false`, never a raw exception boundary.

## Client component: `ModeChoice`

**File:** `app/respond/[token]/ModeChoice.tsx` (`"use client"`)

- Props: `token: string` (opaque token only, matching the `CopyLinkButton` pattern from
  `link` — never the cycle id).
- Renders the greeting, confidentiality note, and two buttons: "Заповнити форму" / "
  Відповісти в чаті з AI" (exact copy in the i18n table below).
- On click: calls `chooseMode({ token, mode })` via `useTransition` (pending state
  disables both buttons and shows `uk.shell.states.loading`-style text on the clicked
  button).
- On `{ ok: true }`: triggers a client-side refresh (`router.refresh()`) so the server
  component re-renders into the stub screen for the now-persisted mode — including when
  the request "lost" the race and the resolved mode differs from what was clicked.
- On `{ ok: false }`: shows the returned `error` message inline below the buttons, no
  raw 500, buttons re-enabled.

## Stub screen: `ModeStub`

**File:** `app/respond/[token]/ModeStub.tsx` (server component, no client JS needed)

- Props: `mode: "form" | "interview"`, plus the existing intro fields the `link` slice
  already renders (greeting, methodology, deadline) and the read-only question list.
- Renders the existing intro + confidentiality note + the existing read-only question
  preview (reusing the exact markup `link` built) + one line acknowledging the chosen
  mode (`uk.respondent.modeChosenForm` / `modeChosenInterview`).
- Explicitly NOT the real form or chat UI — a calm placeholder. The `form` slice replaces
  this body when `mode === "form"`; the `ai-interview` slice replaces it when `mode ===
  "interview"`. This slice does not import or stub out any future component from those
  slices — it owns only this acknowledgement screen.

---

## Shared answer-write contract

**File:** `lib/schemas/answer.ts` (framework-free; no Prisma, no Next, no React)

```typescript
// @trace FR-RESP-03, TC-VALID-01

export const openAnswerSchema = z.string().max(4000);

// Canonical anchor value only — z.number().int() rejects locale-formatted,
// whitespace-padded, or coerced numeric STRINGS outright (no z.coerce, no
// z.preprocess that trims/parses). A JSON payload must send a real number.
export const scaleAnswerSchema = z.number().int();

export const answerInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("open"), questionId: z.string().min(1), text: openAnswerSchema }),
  z.object({ type: z.literal("scale"), questionId: z.string().min(1), value: scaleAnswerSchema }),
]);

export type AnswerInput = z.infer<typeof answerInputSchema>;

/**
 * Validate a scale answer against the SPECIFIC question's defined anchors (not
 * just "is an int") — the value must equal one of `question.anchors[].value`
 * exactly. Returns a Zod-style result so callers (form/ai-interview) get one
 * consistent error shape regardless of which mode is writing.
 */
export function isValidAnchorValue(value: number, anchors: ReadonlyArray<{ value: number }>): boolean
```

This module defines the CONTRACT only — it has no Prisma import and performs no write.
`form` and `ai-interview` (future slices) import `answerInputSchema` and
`isValidAnchorValue` at their own server-action boundaries, parse the inbound payload
through it, and only then perform their own `db.answer.upsert(...)` keyed by
`(responseId, questionId)` — honouring the "one entry per question, update in place"
invariant the baseline spec describes as shared, not respond-owned.

`isValidAnchorValue` deliberately takes the anchors as a plain parameter rather than
re-deriving them from a global lookup, keeping the function pure and testable without a
DB or the `snapshotSchema` import — callers already have the cycle's snapshot anchors in
hand when they call it.

---

## i18n additions

Extend `lib/i18n/uk.ts` and `en.ts`'s existing `respondent` namespace (append-only):

| Key | Ukrainian | English |
|-----|-----------|---------|
| `respondent.confidentiality` | "Ваші відповіді конфіденційні та використовуються лише для цієї оцінки" | "Your answers are confidential and used only for this assessment" |
| `respondent.modeChoiceTitle` | "Як вам зручніше відповісти" | "How would you like to answer" |
| `respondent.modeForm` | "Заповнити форму" | "Fill the form" |
| `respondent.modeFormHint` | "Питання одне за одним, з прогресом" | "Questions one at a time, with progress" |
| `respondent.modeInterview` | "Відповісти в чаті з AI" | "Answer the AI's questions" |
| `respondent.modeInterviewHint` | "Розмова замість форми" | "A conversation instead of a form" |
| `respondent.modeChoosing` | "Зберігаємо вибір…" | "Saving your choice…" |
| `respondent.modeChoiceFailed` | "Не вдалося зберегти вибір. Спробуйте ще раз" | "Could not save your choice. Try again" |
| `respondent.modeChosenForm` | "Ви обрали форму" | "You chose the form" |
| `respondent.modeChosenInterview` | "Ви обрали чат з AI" | "You chose the AI chat" |
| `respondent.modeStubBody` | "Цей екран — заглушка. Реальна форма зʼявиться найближчим часом" | "This screen is a placeholder. The real form/interview will be here soon" |

(`modeStubBody` exists ONLY for this slice's stand-in screen and is expected to be
deleted/replaced wholesale when `form`/`ai-interview` land — flagged in tasks.md.)

---

## Error handling strategy

| Situation | Handling |
|-----------|----------|
| Malformed `chooseMode` payload (bad token, unexpected mode value) | Zod rejects at the action boundary; `{ ok: false, error }` returned, nothing written |
| Token not found at action time | `{ ok: false, error: notFound }`, nothing written |
| Cycle not `collecting` (done/expired) at action time | `{ ok: false, error: closed }`, nothing written — covers the spec's "answering refused for non-collecting cycle" scenario for the mode-choice path specifically |
| Two devices race to set different modes | `updateMany` guard ensures exactly one write lands; the loser re-reads and renders the winning mode — no error, no duplicate write |
| Clipboard/network failure rendering the action | Inline `modeChoiceFailed` message, buttons re-enabled, no raw 500 |

This slice does not introduce any new "unknown/expired token" path — those remain owned
by `link`'s existing calm pages, reached before the mode gate is ever evaluated.

---

## Data model — no changes

`Cycle.mode RespondMode?` already exists in `prisma/schema.prisma`. No migration. The
`Response`/`Answer` models already exist and are untouched by this slice (no write path
added here — only the validation contract those future writers will import).

---

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Race between two devices choosing different modes | `updateMany` + `WHERE mode IS NULL` is atomic at the Postgres row-lock level (Decision 1); the loser re-reads and renders the winner's mode, no error surfaced |
| Stub screen copy lingers after `form`/`ai-interview` land, confusing testers | `modeStubBody` key and `ModeStub.tsx` are explicitly flagged in tasks.md as slice-local placeholders to be replaced, not extended, by the next two slices |
| `answer.ts` schema rules drift from what `form`/`ai-interview` actually need later | Both future slices MUST import from `lib/schemas/answer.ts` rather than redefine — called out in tasks.md and the baseline spec's "single shared model" requirement; a follow-up review on those slices should grep for a duplicate inline schema |
| `chooseMode` called after the respondent has already started answering in the chosen mode | Out of scope per spec (mode switching mid-cycle unsupported); the action does not check whether any `Answer` rows exist, since switching is not offered as a UI option once `mode` is set (the stub screen has no "change mode" control) |
