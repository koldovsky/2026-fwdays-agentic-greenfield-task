# Proposal — add-respond

## Why this slice exists

The `link` slice made `/respond/[token]` resolve to a calm, read-only landing: greeting,
methodology, deadline, and a read-only question preview. It stops there — there is no
way for the respondent to actually start answering. Before the form and AI-interview
slices can exist, the respondent needs a way to pick HOW they will answer (form vs AI
chat), and that choice needs to be durably remembered against the cycle so reopening the
same link does not re-prompt or let two devices diverge. This slice adds that mode-choice
gate and the one-line confidentiality note the baseline spec requires, on top of the
existing landing — it does not replace anything the `link` slice built.

## What changes

### FR-RESP-01 — Plain-language intro gains a confidentiality note

The respondent landing already states who is assessed (first name), the methodology, and
the deadline (`link` slice). This slice adds the one missing element: a single one-line
confidentiality note, rendered once, in Ukrainian, sentence case, no exclamation marks.

### FR-RESP-02 — Two answering modes with a remembered, link-scoped choice

When `Cycle.mode` is `null`, the page renders a mode-choice screen — "fill the form" or
"answer the AI's questions" — instead of (before) the existing question preview. A new
server action persists the choice with a conditional, race-safe write
(`updateMany` guarded by `WHERE mode IS NULL`) so the first write to land wins; a second,
losing request is treated as a normal reopen of the now-already-chosen mode, never a
conflict or error. When `Cycle.mode` is already set (chosen on this visit or a prior one),
the page renders a stub "you chose X" screen acknowledging the mode — building the real
form and AI-interview screens is explicitly out of scope; this slice hands off cleanly to
whichever future route/component those slices own.

### FR-RESP-03 — Shared answer-write contract (validation only, no writes)

This slice does not write any `Answer` rows — that is the form and ai-interview slices'
job. It defines the single shared Zod boundary schema (`lib/schemas/answer.ts`) those two
slices will both import: an `open` answer is a string of at most 4000 characters; a
`scale` answer is parsed only from a canonical anchor value matching one of the question's
defined anchors, with no locale-formatted, whitespace-padded, or coerced numeric strings
accepted. Defining this now (rather than letting `form` and `ai-interview` each invent
their own) keeps the two write paths shape-identical from day one (TC-ARCH-01).

## Existing respondent landing — extended, not replaced

`app/respond/[token]/page.tsx` (built by `link`) keeps its calm-page short-circuits for
unknown/expired/done tokens unchanged. This slice extends the `collecting` branch only:
it inserts the mode gate between the existing intro and the (until now unconditional)
question preview, and adds the confidentiality note to the intro.

`app/respond/[token]/queries.ts`'s `getRespondentCycleByToken` is extended to also return
`mode: RespondMode | null` so the page can branch without a second DB round trip.

## Impact

- Extends `RespondentCycle` (adds `mode`) and its query — no new query file.
- Adds `app/respond/[token]/actions.ts` (server action: `chooseMode`).
- Adds `app/respond/[token]/ModeChoice.tsx` (client component: two buttons, pending state,
  inline error on failure).
- Adds `lib/schemas/answer.ts` (framework-free Zod schemas, no DB import).
- Extends `app/respond/[token]/page.tsx`'s `collecting` branch.
- Extends `lib/i18n/uk.ts` / `en.ts`'s `respondent` namespace (confidentiality note, mode
  choice copy, stub screens).
- No schema migration — `Cycle.mode RespondMode?` already exists.

## Out of scope

- The real form UI and section flow (`form` slice, FR-FORM-*).
- The real AI chat interview UI and streaming (`ai-interview` slice, FR-AI-*).
- Writing any `Answer`/`Response` row (form/ai-interview slices write; this slice only
  defines the shared validation contract they will import).
- Mode switching after answering has begun (explicitly excluded by the baseline spec).
- Multiple respondents per cycle (explicitly excluded by the baseline spec).
