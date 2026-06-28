# Proposal — add-form

## Why this slice exists

`add-respond` built the mode gate: once a respondent picks "fill the form", `Cycle.mode`
is persisted as `"form"` and the page renders `ModeStub` — a calm placeholder that
acknowledges the choice and repeats the read-only question preview, but offers no way to
actually answer. This slice replaces that placeholder's form-mode body with the real
form: one question per screen, autosaved per answer, resumable, and ending in a quiet
confirmation. It is the first slice that writes an `Answer` row.

## What changes

### FR-FORM-01 — One question at a time with a thin position indicator

The baseline spec (`openspec/specs/form/spec.md`) describes "Section N of M" in terms of
template *sections* — but the current data model (`Question.order: Int`, no grouping
column) has no concept of a section; `TemplateSnapshot.questions` is a flat, ordered
array. This slice adopts the **one-question-per-screen** reframing documented in full in
`design.md` Decision 1: each individual question IS its "section" for the purposes of
this requirement, so "Section N of M" is rendered as "Question N of M" with `M =
cycle.questions.length` and `N` the respondent's 1-indexed current question position. No
FR-FORM-01 scenario is lost under this mapping — see the mapping table in `design.md`.
The form shows an explicit loading state before saved answers hydrate, and an explicit
empty state when the snapshot has zero questions.

### FR-FORM-02 — Scale anchors as a vertical labelled list; open as auto-growing textarea

Pure UI requirement, unaffected by Decision 1. `scale` questions render their ordered
anchors as selectable labelled rows (label text is the control, single-select, the
persisted value is the anchor's defined value, never its list position). `open`
questions render an auto-growing textarea. Every control has an accessible name and a
visible 2px accent focus ring.

### FR-FORM-03 — Per-question autosave, resumable, validated server boundary

Advancing from the current question to the next autosaves that one question's answer
(the "section" of Decision 1 is a single question, so "autosave the section" becomes
"autosave the current question's answer"). A new server action,
`app/respond/[token]/form-actions.ts`'s `saveAnswer`, resolves the cycle from
`tokenBoundarySchema`, refuses a write when the cycle is not `collecting`, validates the
payload with the shared `answerInputSchema` from `lib/schemas/answer.ts`, and for `scale`
additionally checks the value against THIS question's own anchors (read from the cycle's
own `templateSnapshot`, never a client-supplied anchor list) via `isValidAnchorValue` —
closing both the cross-cycle-write hole and the wrong-question-anchor hole in one check.
The write upserts into `Answer` keyed by `(responseId, questionId)`, creating the
cycle's `Response` row lazily on the first answer. A required question, if unanswered,
blocks advancing with a specific inline message; the same rule is enforced again on the
server so it cannot be bypassed by a client that skips the inline check.

### FR-FORM-04 — Quiet completion, marks the cycle done only when truly complete

After the respondent answers the last question (`N === M`) and that answer is required
and present (or already answered), the server re-checks the WHOLE template via the
already-built, pure `isResponseComplete(snapshot, answers)` (`lib/cycles/status.ts`) —
not "did the respondent reach the last screen" but "is every required question across
the entire template answered". Only then does `Cycle.status` transition to `"done"`. The
respondent then sees exactly one quiet confirmation sentence — no confetti, no animation,
no sound. Reopening a completed link shows that same confirmation, not a fresh form.

### Resuming

Reopening `/respond/[token]` in form mode restores previously saved answers and resumes
at the first question (in template order) that is required and not yet answered — not
necessarily question 1, not necessarily "the next index after the last save". If every
required question is already answered, the respondent sees the completion confirmation
rather than the form.

## Impact

- Replaces `ModeStub`'s form-mode render branch: `app/respond/[token]/page.tsx`'s
  `mode === "form"` branch now renders a new `app/respond/[token]/FormFlow.tsx` instead
  of `ModeStub` (the `interview` branch is untouched — `ai-interview` still owns it via
  `ModeStub`, see `design.md`).
- Adds `app/respond/[token]/form-actions.ts` (`"use server"`: `saveAnswer`).
- Extends `app/respond/[token]/queries.ts` (or adds a sibling query) to also load saved
  `Answer` rows so the form can hydrate and resume.
- Adds client components for the one-question screen, the scale anchor list, the
  auto-growing textarea, and the position indicator — all under `app/respond/[token]/`.
- Writes `Answer`/`Response` rows and transitions `Cycle.status` to `"done"` — the first
  slice in this codebase to do either.
- No schema migration — `Response`/`Answer`/`Cycle.status` already exist.
- Extends `lib/i18n/uk.ts` / `en.ts`'s `respondent` namespace with form-specific copy;
  removes the form-mode usage of `modeStubBody` (the AI-interview slice still owns its
  own stub usage until it lands).

## Out of scope

- The AI chat interview UI (`ai-interview` slice, FR-AI-*) — `mode === "interview"`
  keeps rendering `ModeStub` unchanged.
- Any question type other than `scale`/`open`; file/image upload; rich text in answers.
- Any celebratory completion experience.
- HR-facing progress, per-question results, or the five-dot scale display (`results`
  capability).
- Retrofitting a `section`/grouping column onto `Question` — explicitly rejected per
  Decision 1; the flat per-question model is treated as final for MVP.
