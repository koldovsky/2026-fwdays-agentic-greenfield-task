# report

## Purpose

The AI summary report for a completed assessment cycle. For a `done` cycle the HR manager
triggers "Draft summary"; the summariser (Claude Opus, via `lib/ai/`) reads **only** that
cycle's collected answers and returns a structured object — strengths, growth areas, and
short verbatim quotes each attributed by the stable question id from the cycle's template
snapshot (FR-TPL-02, FR-CYCLE-03) — with no invented facts, scores, or names. Drafting is
guarded server-side so one cycle yields at most one in-flight run and one stored summary.
The report is read-only in the MVP, visible to HR only, rendered like a typeset
serif document per the design brief; raw answers and AI dialogs stay private to HR
(FR-REPORT-01..04, BC-PRIVACY-01, BC-BRAND-02, TC-AI-02, TC-VALID-01).

## Requirements

### Requirement: Canonical quote attribution key

Every verbatim quote in the summary SHALL be attributed by the **stable question id** taken
from the cycle's template snapshot (FR-TPL-02, FR-CYCLE-03) — never by free-text question
wording, position, or label. The structured-summary Zod schema SHALL require each quote to
carry exactly this `questionId`. A quote whose `questionId` does not match a question id
present in the cycle's snapshot — or whose text is not verbatim in that question's answer —
SHALL be DROPPED from the persisted summary rather than rejecting the whole report; the
strengths, growth areas, and every remaining grounded quote are still stored, and the
dropped quotes are logged server-side. A fabricated or mis-attributed quote is therefore
never persisted, while a model that lightly edits one quote (or attributes one to a scale
question, which has no quotable text) does not sink the entire summary. This single key is
the only machine-checkable attribution rule for the whole capability (FR-REPORT-02,
FR-REPORT-04).

#### Scenario: Quote attribution uses the snapshot question id

- **GIVEN** a stored structured summary for a cycle
- **WHEN** a checker inspects any quote
- **THEN** the quote carries a `questionId` field equal to a stable question id present in
  that cycle's template snapshot, and attribution is verified solely by matching that
  `questionId` against the snapshot — never by comparing free-text question wording

#### Scenario: Quote with an unknown or non-verbatim question id is dropped, the report is kept

- **GIVEN** model output containing one quote whose `questionId` is not one of the cycle
  snapshot's question ids (or whose text is not verbatim in that answer) alongside other
  valid content
- **WHEN** the summary is grounded before persisting
- **THEN** only the ungrounded quote is dropped (and logged server-side); the strengths,
  growth areas, and remaining grounded quotes are persisted, so a single bad quote never
  sinks the whole report. (A summary whose overall SHAPE fails the Zod schema is still
  rejected with no summary persisted, per the grounded-summary requirement below.)

### Requirement: HR triggers Draft summary with inline progress

The system SHALL expose a "Draft summary" action on the detail screen of a `done` cycle, and
SHALL NOT expose it (or SHALL keep it disabled with an explanation) for cycles in
`collecting` or `expired` status. While the summariser runs, the action SHALL show inline
progress in place — never a frozen, unresponsive button. Concurrency SHALL be guarded
server-side: at most one draft run per cycle may be in flight at a time, so duplicate or
replayed server-action invocations cannot produce a second model call or a second persisted
summary. The summary runs once per explicit HR action; there is no automatic or
scheduled drafting (FR-REPORT-01, NFR-COST-01).

#### Scenario: Draft summary available for a done cycle without a summary

- **GIVEN** a cycle in status `done` that has no stored summary yet
- **WHEN** HR opens the cycle detail
- **THEN** the "Draft summary" action is available

#### Scenario: Draft summary refused for a non-done cycle

- **GIVEN** a cycle in status `collecting` or `expired`
- **WHEN** HR views the cycle detail
- **THEN** the "Draft summary" action is absent or disabled with a short text explanation,
  and any attempt to invoke the server action for that cycle is refused without calling the
  model or creating a summary

#### Scenario: Running state shows inline progress, not a frozen button

- **GIVEN** a `done` cycle with no summary yet
- **WHEN** HR triggers "Draft summary" and the summariser is running
- **THEN** the action shows an inline running/progress indicator with an accessible name
  in place of the idle label, remains responsive (not a frozen click target), and a second
  trigger while running is ignored rather than starting a parallel run

#### Scenario: Concurrent server-side draft request is rejected without a second model call

- **GIVEN** a `done` cycle whose draft run is already in flight (a first server-action
  invocation is between starting and persisting its summary)
- **WHEN** a second draft server-action request arrives for the same cycle — from another
  tab, a double submit, or a replayed request
- **THEN** the second request is rejected by the server-side guard, no second summariser
  model call is made, and at most one summary is ever persisted for that cycle

#### Scenario: Re-draft on a cycle that already has a stored summary is refused

- **GIVEN** a `done` cycle that already has a stored summary
- **WHEN** HR opens the cycle detail and, if shown, triggers "Draft summary"
- **THEN** the existing summary is displayed read-only and no re-draft occurs: the action is
  hidden or disabled with a short text explanation, and any direct server-action invocation
  to draft again is refused without calling the model and without overwriting or versioning
  the stored summary (re-draft, overwrite, and versioning are intentionally out of scope for
  the MVP)

#### Scenario: Summary runs once per explicit action

- **WHEN** no HR member has triggered "Draft summary" for a cycle
- **THEN** no summary is drafted and no summariser model call is made for that cycle (no
  automatic, scheduled, or background drafting occurs)

### Requirement: Summary grounded only in the cycle's answers

The summariser SHALL receive **only** the cycle's collected per-question answers (plus the
template questions and, at most, the subject's first name where natural phrasing requires it)
and SHALL produce strengths, growth areas, and short verbatim quotes drawn from those
answers. It SHALL NOT invent facts, fabricate numeric scores or ratings, introduce names or
people absent from the answers, or include the subject's surname, email, phone, or Telegram
handle. Each verbatim quote SHALL be text that occurs in a collected answer and SHALL be
attributed by the canonical `questionId` (the snapshot question id of the question that
answer responded to). Quote-text matching against the source answer SHALL use a defined
normalisation — Unicode NFC, trimmed and internally collapsed whitespace, case-sensitive —
so the check is deterministic for Ukrainian and other non-Latin text (FR-REPORT-02,
BC-PRIVACY-04, TC-AI-02).

#### Scenario: Strengths, growth areas, and quotes come from the answers

- **GIVEN** a `done` cycle whose answers contain specific statements
- **WHEN** HR drafts the summary
- **THEN** the report contains strengths and growth areas supported by those answers, and
  each verbatim quote, after NFC + collapsed-whitespace normalisation, occurs within the
  normalised text of the answer to the question identified by the quote's `questionId`

#### Scenario: Large answer set and long Ukrainian answers are handled without corruption

- **GIVEN** a `done` cycle with many answers and individual open-text answers that are long
  and written in Ukrainian (non-Latin) text
- **WHEN** HR drafts the summary
- **THEN** the assembled prompt stays within the summariser's configured input bound (answers
  exceeding it are truncated deterministically rather than silently dropped or sent
  unbounded), the returned quotes are still attributed by `questionId` and match their source
  answers under the defined normalisation, and the Ukrainian text is preserved and rendered
  intact without mojibake

#### Scenario: No invented facts, scores, or names

- **WHEN** the summariser output is produced
- **THEN** it contains no fabricated numeric score or rating, no person name or fact that
  does not appear in the cycle's answers, and no surname, email, phone, or Telegram handle of
  the subject (the prompt never received those fields)

#### Scenario: Only this cycle's answers reach the summariser

- **WHEN** the summariser prompt is assembled for a cycle
- **THEN** it includes only that cycle's collected answers, the template questions, and at
  most the subject's first name — never another cycle's answers and never the
  token-to-employee personal mapping

#### Scenario: Empty or unparseable model output does not corrupt the report

- **WHEN** the model returns output that fails the structured-summary Zod schema (missing
  sections, malformed quotes, or non-conforming shape)
- **THEN** the parse is rejected at the boundary, no malformed summary is persisted, and HR
  sees a calm "could not draft the summary, try again" state rather than a raw 500 or partial
  garbled report

### Requirement: Report is read-only and HR-only

The summary report SHALL be read-only in the MVP — HR can view it but cannot edit, approve,
lock, or version it — and SHALL be visible only inside the authenticated cabinet to the HR
manager. The cycle's raw answers and any AI interview dialogs SHALL remain private to HR and
SHALL NOT be exposed to the respondent or to any unauthenticated request (FR-REPORT-03,
BC-PRIVACY-01, NFR-SEC-01).

#### Scenario: Report is viewable but not editable

- **GIVEN** a cycle with a drafted summary
- **WHEN** HR views the report
- **THEN** the report is presented read-only, with no edit, approve, lock, or version
  controls (those are intentionally out of scope for the MVP)

#### Scenario: Report requires authentication

- **GIVEN** an unauthenticated request to a report or its server action/route
- **WHEN** the request is made
- **THEN** it is redirected to sign-in (with a `next` parameter for the originating cabinet
  URL) or refused, and no summary, answer, or dialog content is returned

#### Scenario: Respondent never sees the report, answers, or dialogs

- **WHEN** the respondent's `/respond/[token]` surface is accessed
- **THEN** it exposes neither the summary report, the raw answers of others, nor any AI
  dialog; those live only in the HR cabinet

### Requirement: Structured summariser output rendered as a typeset document

The summariser output SHALL be a structured object validated by a Zod schema — named
sections (such as strengths and growth areas) plus quotes that each carry the canonical
`questionId` of their source question — and the TypeScript type SHALL be inferred from that
schema via `z.infer`, never
hand-written. The report SHALL be rendered with the design system's report styling so it
reads like a typeset document (serif body per the design brief), in sentence case, calm and
confidential tone, no exclamation marks, no emoji (FR-REPORT-04, BC-BRAND-02, TC-VALID-01,
TC-ARCH-01).

#### Scenario: Output is a schema-validated structured object with sourced quotes

- **WHEN** the summariser returns its result
- **THEN** the result is parsed by the structured-summary Zod schema into sections and
  quotes where each quote carries the canonical `questionId` (the snapshot question id) of
  the question it came from, and the consuming code uses the `z.infer` type rather than a
  parallel hand-written type

#### Scenario: Report renders with typeset serif report styling

- **GIVEN** a stored structured summary
- **WHEN** HR views the report screen
- **THEN** it is rendered with the design system's report styling — serif body, typeset
  document feel per BC-BRAND-02 — in sentence case with no exclamation marks or emoji, and
  defines explicit loading and error states for the drafting and view flows

### Requirement: Explicit MVP exclusions

The system SHALL NOT implement the items below in the MVP; report scopes only the drafting,
storing, and read-only rendering of a single AI summary per cycle, and the exclusions below
SHALL NOT be reported as defects.

#### Scenario: Editorial approval gate is out of scope

- **WHEN** considering in-place editing, evidence pull-quote curation, locking, versioning,
  or an approval workflow for the report
- **THEN** these are intentionally unsupported in the MVP and deferred (per the PRD
  "Out of scope" list)

#### Scenario: Report export is out of scope

- **WHEN** considering PDF or CSV export of the report
- **THEN** export is intentionally unsupported in the MVP; the report is viewed in-cabinet
  only

#### Scenario: Token-cost recording is owned elsewhere

- **WHEN** the summariser model call records its token usage and USD cost
- **THEN** that recording is owned by the usage-accounting capability (FR-USAGE-*), not by
  report; report only triggers the call
