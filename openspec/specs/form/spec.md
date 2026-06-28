# form

## Purpose

The web form mode lets a respondent answer a cycle's template questions one section at a time
through a calm, paced form at `/respond/[token]`. It renders `scale` questions as a vertical
labelled anchor list and `open` questions as an auto-growing textarea, autosaves each section so
the link is resumable, blocks advancing past unanswered required questions with a specific inline
message, and ends with one quiet confirmation sentence. All answers write to the shared
per-question response model so form and AI-interview results are identical in shape
(FR-FORM-01..04, FR-RESP-03, NFR-I18N-01, NFR-A11Y-01/-02, TC-VALID-01, TC-PURE-01).

## Requirements

### Requirement: One section at a time with a thin progress indicator

The form SHALL display exactly one section (question group) at a time, never the whole
questionnaire on a single scroll, and SHALL show a thin "Section N of M" progress indicator that
reflects the current section position within the template's ordered sections. The indicator SHALL
communicate position by an accompanying text label, not by color alone, and the questions within a
section SHALL appear in their template order. Before the saved answers have hydrated the form SHALL
show an explicit loading state (never a blank area), and a template with no sections or no questions
SHALL render an explicit empty state rather than an interactive section with a "next" or completion
control (FR-FORM-01, NFR-A11Y-02).

#### Scenario: Single section is shown with position label

- **WHEN** a respondent in form mode views a cycle whose template has M ordered sections and is on
  the Nth section
- **THEN** only that section's questions render (in template order) and a thin "Section N of M"
  indicator is shown, with N and M expressed as text and not conveyed by color alone

#### Scenario: Indicator advances as sections are completed

- **WHEN** the respondent successfully advances from section N to section N+1
- **THEN** the indicator updates to "Section N+1 of M" and the previous section's questions are no
  longer rendered

#### Scenario: Single-section template still shows the indicator

- **WHEN** the template has exactly one section (M = 1)
- **THEN** the form shows "Section 1 of 1" and presents the completion path directly after that
  section rather than offering a "next section" step

#### Scenario: Loading state is shown before saved answers hydrate

- **WHEN** the form is rendering and the respondent's saved answers have not yet loaded
- **THEN** the form shows an explicit loading state (for example a skeleton or loading indicator)
  and never a blank area, and only renders the section's controls once the saved state is available

#### Scenario: Template with no sections or no questions shows an empty state

- **WHEN** the resolved cycle's template has zero sections, or a section has zero questions, so
  there is nothing to answer
- **THEN** the form renders an explicit empty state explaining there is nothing to complete and does
  not present an interactive "next section" or completion control that would mark an empty cycle
  `done`

### Requirement: Scale anchors as a vertical labelled option list; open as auto-growing textarea

For a `scale` question the form SHALL render the question's ordered anchors as a vertical list of
labelled, selectable options where the visible anchor label text is itself the control (a single
selectable row per anchor), and SHALL NOT render a bare numeric 1-5 row of unlabelled buttons.
Exactly one anchor SHALL be selectable at a time, and the persisted value SHALL be that anchor's
defined value (not its list position). For an `open` question the form SHALL render an
auto-growing textarea that expands with the entered text rather than scrolling within a fixed
height. Every control SHALL have an accessible name and a visible 2px accent focus ring
(FR-FORM-02, NFR-A11Y-01).

#### Scenario: Scale question renders labelled anchor rows

- **WHEN** a `scale` question with an ordered set of labelled anchors (value + label) is rendered
- **THEN** each anchor appears as its own selectable row whose label text is the clickable control,
  the anchors appear in their defined order, and no bare unlabelled numeric 1-5 row is shown

#### Scenario: Selecting an anchor stores its value, single-select

- **WHEN** the respondent selects an anchor and then selects a different anchor in the same
  `scale` question
- **THEN** only the most recently selected anchor remains selected and the stored answer is that
  anchor's defined value (not its ordinal position in the list)

#### Scenario: Open question uses an auto-growing textarea

- **WHEN** the respondent types multiple lines into an `open` question's field
- **THEN** the textarea grows to fit the text instead of clipping or showing an inner scrollbar at
  a fixed height, and the entered text is preserved verbatim as the answer

#### Scenario: Controls are keyboard reachable with a visible focus ring

- **WHEN** the respondent navigates the section with the keyboard
- **THEN** every anchor option and textarea is reachable in tab order, carries an accessible name,
  and shows a visible 2px accent focus ring when focused

### Requirement: Per-section autosave with a resumable link

The form SHALL autosave the current section's answers (per question) before advancing, persisting
each answer to the shared per-question response model so that reopening the link later resumes from
the respondent's saved state rather than restarting at section 1 with empty fields. Answers written
by the form SHALL be identical in shape to answers written by the AI interview for the same cycle.
Inbound answer payloads SHALL be validated with Zod at the server boundary, with the TypeScript
type inferred from that schema, and an answer SHALL only ever be associated with the cycle resolved
from its own token (no cross-cycle write). A `scale` answer SHALL be accepted only if it matches one
of the question's defined anchor values exactly (strict equality against the defined value set, with
no locale or number coercion), and an `open` answer SHALL be accepted only up to a fixed maximum of
4000 characters (FR-FORM-03, FR-RESP-03, TC-VALID-01, NFR-SEC-01).

#### Scenario: Advancing autosaves the section

- **WHEN** the respondent fills a section's answers and advances to the next section
- **THEN** each answer is persisted to the per-question response model for this cycle before the
  next section renders, without requiring a separate explicit "save" action

#### Scenario: Reopening the link resumes from saved state

- **WHEN** the respondent closes the page and later reopens the same `/respond/[token]` link
- **THEN** the form restores the previously saved answers and resumes at the first section that is
  not yet complete, rather than restarting at section 1 with empty fields

#### Scenario: Form and AI answers share one shape

- **WHEN** a `scale` answer and an `open` answer are saved through the form
- **THEN** they are written to the same per-question response model the AI interview writes to, so
  a cycle's results are identical in shape regardless of mode

#### Scenario: Answer payload is validated at the boundary

- **WHEN** the autosave server action or route handler receives an answer payload
- **THEN** it parses the payload with a Zod schema (rejecting a `scale` value that is not one of the
  question's defined anchor values, or a malformed/oversized `open` value) before persisting, and
  the persisted type is inferred from that schema

#### Scenario: Scale value must match a defined anchor value with no locale coercion

- **WHEN** a `scale` answer arrives whose value is a locale-formatted or stringified number rather
  than an exact member of the question's defined anchor value set (for example `"3,0"` with a comma
  decimal, `" 3 "` with surrounding whitespace, or the string `"3"` when the defined value is the
  number `3`)
- **THEN** the schema rejects it without attempting any locale parsing or number coercion; only a
  value strictly equal to one of the question's defined anchor values is accepted and persisted

#### Scenario: Open answer over the maximum length is rejected

- **WHEN** an `open` answer payload longer than 4000 characters is received
- **THEN** the schema rejects it as oversized before persisting, and an `open` answer of 4000
  characters or fewer is accepted

#### Scenario: An answer cannot be written to another cycle

- **WHEN** a save request carries a question id that does not belong to the cycle resolved from its
  token
- **THEN** the write is rejected and no answer is stored against any other cycle

### Requirement: Required questions block advancing with a specific inline message

The form SHALL prevent advancing to the next section (or to completion) while any required question
in the current section is unanswered, and SHALL show a specific inline validation message on each
unanswered required question rather than a generic banner or a raw 500. The same required-question
rule SHALL be enforced on the server at save time so it cannot be bypassed by the client. Optional
questions SHALL never block advancing. All messages SHALL be Ukrainian-first sourced from
`lib/i18n/uk.ts` (FR-FORM-03, NFR-I18N-01, TC-VALID-01). The explicit-state contract for the
inline error display follows the shell capability's FR-SHELL-03 (referenced as supporting context;
FR-SHELL-03 ownership stays with the shell capability).

#### Scenario: Unanswered required question blocks and shows an inline message

- **WHEN** the respondent attempts to advance while a required question in the current section has
  no answer
- **THEN** advancing is blocked and a specific inline message is shown on that question (naming what
  is missing), the respondent stays on the current section, and no generic error or raw 500 appears

#### Scenario: Optional questions do not block

- **WHEN** the respondent leaves only optional questions blank and attempts to advance
- **THEN** advancing succeeds and the blank optional answers are recorded as unanswered

#### Scenario: Server enforces the required rule

- **WHEN** a save/advance request omits a required answer despite client-side checks
- **THEN** the server rejects the advance with the same specific validation outcome and does not
  mark the section or cycle complete

#### Scenario: Validation messages are Ukrainian-first

- **WHEN** any required-question validation message is shown
- **THEN** the text comes from the centralised `lib/i18n/uk.ts` strings (Ukrainian-first, English
  fallback), in sentence case with no exclamation marks or emoji

### Requirement: Quiet completion confirmation

On completing the final section the form SHALL show exactly one quiet confirmation sentence and
SHALL NOT show confetti, celebratory animation, sound, or any exclamatory copy. Completion SHALL
set the cycle state consistently with the shared response model: the cycle becomes `done` only when
every required question across all sections is answered, regardless of which section the respondent
reached, and unanswered optional questions SHALL NOT block completion. Reaching the final section
while a required question in any section is still unanswered SHALL NOT mark the cycle `done`. The
confirmation sentence SHALL be Ukrainian-first from
`lib/i18n/uk.ts` (FR-FORM-04, FR-RESP-03, NFR-I18N-01, BC-BRAND-01).

#### Scenario: Completion shows one quiet sentence, no celebration

- **WHEN** the respondent completes the final section with all required questions answered
- **THEN** the form shows a single calm confirmation sentence and renders no confetti, no
  celebratory animation, no sound, and no exclamation marks or emoji

#### Scenario: Completion marks the cycle done

- **WHEN** the final section is completed and all required questions across the cycle are answered
- **THEN** the cycle is recorded as `done` in the shared response model

#### Scenario: Reaching the final section with an earlier required answer missing does not complete

- **WHEN** the respondent reaches and completes the final section but a required question in an
  earlier section was never persisted (for example a link resumed mid-way that jumped ahead, or an
  earlier required answer that was not saved)
- **THEN** the cycle is NOT marked `done`; completion is blocked, the unanswered required question
  is surfaced with its specific inline message, and the respondent is returned to the earliest
  section holding an unanswered required question

#### Scenario: Optional answers left blank do not block completion

- **WHEN** every required question across all sections is answered but one or more optional
  questions in earlier sections remain blank
- **THEN** completion succeeds and the cycle is recorded as `done`, with the blank optional answers
  recorded as unanswered

#### Scenario: Reopening a completed link shows the confirmation, not a fresh form

- **WHEN** the respondent reopens the link after completing the form
- **THEN** they see the quiet confirmation state (and their saved answers as already submitted)
  rather than an empty section 1 inviting re-entry

### Requirement: Out-of-scope exclusions for the form capability

The form SHALL support only the `scale` and `open` question types and SHALL limit answers to a
selected anchor value or plain text; the following are intentionally excluded from the form
capability in the MVP so they are not reported as defects. Specifically, the form SHALL NOT provide
question types other than `scale` and `open`; SHALL
NOT support file/image upload, attachments, or rich-text formatting in answers; SHALL NOT include
any celebratory completion experience (animation, confetti, sound); SHALL NOT use a runtime i18n
library (strings are static in `lib/i18n/`); SHALL NOT render the respondent intro, mode choice, or
token-resolution/expired-link handling (owned by the `respond` and link capabilities); and SHALL
NOT render HR-facing progress, per-question results, or the five-dot scale display (owned by the
`results` capability).

#### Scenario: Unsupported question type is not rendered as a new control

- **WHEN** a template question is not of type `scale` or `open`
- **THEN** the form does not invent a new control for it; only `scale` and `open` are supported in
  the MVP form mode

#### Scenario: No attachments or rich text in answers

- **WHEN** a respondent attempts to attach a file or apply rich-text formatting in an `open` answer
- **THEN** the form provides no such affordance and stores the answer as plain text only
