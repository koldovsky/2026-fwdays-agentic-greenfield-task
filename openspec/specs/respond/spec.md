# respond

## Purpose

The respondent entry point at `/respond/[token]`. A valid token resolves to exactly one
cycle and the respondent first sees a plain-language intro (who is assessed, assessment
type, deadline, a one-line confidentiality note), then chooses one of two answering modes
— fill the web form or answer the AI's questions — and that choice is remembered for the
link. This capability owns the single shared per-question response model that both modes
write to, so a cycle's results are shape-identical regardless of mode (FR-RESP-01..03,
BC-PRIVACY-01/-02/-04, FR-SHELL-02, BC-BRAND-01).

## Requirements

### Requirement: Plain-language respondent intro

The system SHALL present, on the respondent page resolved from a valid cycle token, a
plain-language intro that states who is assessed (the subject, by first name or natural
phrasing only — never surname, email, phone, or Telegram handle), the assessment type
(methodology tag), the deadline (as a date), and a single one-line confidentiality note.
The intro SHALL be Ukrainian-first, sentence case, calm in tone, with no exclamation marks
and no emoji, and SHALL carry no personal data beyond what is named above. The respondent
SHALL see only their own session, never any other cycle's data (FR-RESP-01, BC-PRIVACY-01,
BC-PRIVACY-02, BC-PRIVACY-04, FR-SHELL-02, BC-BRAND-01).

#### Scenario: Intro states subject, type, deadline, and confidentiality note

- **GIVEN** a valid cycle token resolving to a `collecting` cycle
- **WHEN** the respondent opens `/respond/[token]`
- **THEN** the intro plainly shows who is assessed (first name or natural phrasing), the
  assessment type, the deadline as a date, and exactly one one-line confidentiality note,
  in Ukrainian, sentence case, with no exclamation marks and no emoji

#### Scenario: Intro carries no forbidden personal data

- **WHEN** the respondent intro is rendered and its source data is inspected
- **THEN** the rendered intro contains no surname, email, phone number, or Telegram handle
  for the subject or anyone else (the no-PII-in-URL guarantee for `/respond/<token>` is owned
  by the link capability under FR-LINK-02 / BC-PRIVACY-02 and is referenced here, not
  re-asserted)

#### Scenario: Intro is scoped to one cycle only

- **GIVEN** two distinct cycles with two distinct tokens
- **WHEN** the respondent opens one token
- **THEN** the intro shows only that cycle's subject, type, and deadline, and exposes no
  field, count, or content belonging to the other cycle

### Requirement: Two answering modes with a remembered choice

The system SHALL offer the respondent exactly two answering modes — fill the form or
answer the AI's questions — and SHALL persist the chosen mode against the cycle/link so
that reopening the same token resumes in the already-chosen mode rather than re-prompting.
Choosing a mode SHALL hand off to the corresponding capability (form or ai-interview)
without losing the resolved cycle context. The mode field referenced here is owned by the
respond capability's data model (FR-RESP-02).

Because the MVP supports exactly one respondent per cycle (see exclusions) and respondents
are not authenticated, the persisted mode is a single nullable field on the cycle, scoped
to the cycle/link rather than to any device or person. The mode is therefore "remembered for
the link" globally: the FIRST choice persisted against the cycle binds the link, and every
subsequent opener of the same token — including a different device or browser — resumes in
that same mode. The system SHALL persist the mode choice as a conditional write that only
sets the field when it is still unset, so that two devices opening an un-chosen token and
racing to pick different modes resolve to exactly one winning mode (the first write that
lands), and the later request is treated as a reopen of the already-chosen mode, not as a
conflict or error. This first-write-wins, link-scoped binding is the accepted behaviour, not
a defect (FR-RESP-02, BC-PRIVACY-01).

#### Scenario: Respondent picks a mode on first open

- **GIVEN** a valid token whose cycle has no mode chosen yet
- **WHEN** the respondent opens `/respond/[token]`
- **THEN** the page offers exactly two choices — fill the form or answer the AI's questions
  — and no answering surface is shown until one is chosen

#### Scenario: Choice is remembered for the link

- **GIVEN** a respondent who chose a mode on a prior visit
- **WHEN** the same token is reopened
- **THEN** the cycle resumes directly in the previously chosen mode without re-prompting
  for a mode

#### Scenario: Chosen mode persists across the link's lifetime

- **WHEN** the chosen mode is recorded
- **THEN** it is stored against the cycle/link in the database so it survives reload, a new
  session, and a different device opening the same token

#### Scenario: First chooser binds the link for all later openers

- **GIVEN** a valid token whose cycle has no mode chosen yet, opened by two devices that
  have not yet picked a mode
- **WHEN** the two devices submit different mode choices (one form, one AI) and the writes
  are applied in some order
- **THEN** the conditional write sets the cycle mode only while it is unset, so exactly one
  mode (the first write to land) becomes the link's mode, the later device is treated as a
  reopen and resumes in that already-chosen mode, and neither request surfaces a raw 500 or a
  conflict error — this single-respondent, link-scoped binding is the accepted behaviour

### Requirement: Single shared per-question response model

The system SHALL define one per-question response model — one stored entry per template
question per cycle — and BOTH answering modes (form and AI interview) SHALL write to that
same model, so a completed cycle's results are identical in shape regardless of the mode
used. A `scale` answer SHALL be stored as one valid anchor value of that question; an
`open` answer SHALL be stored as the respondent's text. This shared answer-write SHALL be
the single home reused by the form and ai-interview capabilities; neither mode SHALL
define its own parallel answer store (FR-RESP-03, BC-PRIVACY-01).

The one-entry-per-question, update-in-place (upsert) invariant asserted below is a SHARED
invariant of this single model, not a respond-only behaviour: it originates in the
Response/Answer persistence model owned by the data-model capability and is the contract the
form (FR-FORM-*) and ai-interview (FR-AI-*) write flows agree to honour. Respond states it
here because it owns the shared model; the writing capabilities reuse it rather than
redefining it.

#### Scenario: Form and AI writes are shape-identical

- **GIVEN** two cycles on the same template, one answered via the form and one via the AI
  interview
- **WHEN** their stored responses are read
- **THEN** both yield the same shape — one entry per question keyed the same way, with the
  same value types per question kind — distinguishable only by which mode was used, not by
  the response structure

#### Scenario: Scale answer stored as a valid anchor value

- **WHEN** either mode records an answer to a `scale` question
- **THEN** the stored value is one of that question's defined anchor values, and a value
  outside the question's anchors is rejected, never persisted

#### Scenario: Open answer stored as the respondent's text

- **WHEN** either mode records an answer to an `open` question
- **THEN** the stored value is the respondent's text for that question

#### Scenario: One entry per question, last write wins per question (shared invariant)

- **GIVEN** the shared Response/Answer model owned by the data-model capability, whose
  one-entry-per-question upsert contract both write flows honour (FR-RESP-03; model owned by
  data-model, reused by form FR-FORM-* and ai-interview FR-AI-*)
- **WHEN** an answer is recorded for a question that already has an entry for this cycle
- **THEN** the existing entry for that question is updated in place (no duplicate entry is
  created), preserving the one-entry-per-question invariant

### Requirement: Invalid, expired, or out-of-bounds entry is handled calmly

The system SHALL guard the respondent entry against invalid input and disallowed states.
An unknown or expired token SHALL render the calm explanatory page owned by the link
capability (FR-LINK-03) and never a stack trace, raw 500, or generic error. The calm page
SHALL be objectively identifiable: it SHALL respond with HTTP 200 (an in-app rendered page,
not a thrown error), it SHALL render a known Ukrainian-first copy key from `lib/i18n/uk.ts`
(for example `respond.closed.unknown` / `respond.closed.expired` / `respond.closed.done`)
rather than ad-hoc text, and it SHALL NOT include a stack trace, the string `500`, or a
generic framework error screen.

A malformed mode-choice or answer payload SHALL be rejected by a Zod parse at the server
boundary with an inline message, never a raw 500, and nothing SHALL be persisted. The
boundary schema SHALL enforce explicit, decidable bounds: an `open` answer's text SHALL be a
string of at most 4000 characters (a longer payload is rejected, not truncated or stored);
a `scale` answer SHALL be parsed only from a canonical value matching exactly one of the
question's defined anchor values, with no locale-formatted, whitespace-padded, or
non-canonical numeric string accepted (for example a thousands-separated, decimal-comma, or
space-wrapped string is rejected, not coerced). Answering SHALL be refused for a cycle that
is not `collecting` (already `done` or `expired`)
(FR-RESP-02, FR-RESP-03, FR-LINK-03, NFR-SEC-01, TC-VALID-01, BC-BRAND-01).

#### Scenario: Unknown or expired token shows a calm page

- **WHEN** `/respond/[token]` is opened with an unknown token or a token whose cycle is
  `expired`
- **THEN** the response status is HTTP 200 and the rendered page is the calm explanatory
  page (no intro, no mode choice, no answering surface) showing a known `lib/i18n/uk.ts` copy
  key for the matching closed state, with no stack trace, no occurrence of `500`, and no
  generic framework error screen

#### Scenario: Malformed mode or answer payload is rejected at the boundary

- **WHEN** the mode-choice or answer action receives a payload that is missing fields, has
  an unexpected mode value, or has a wrong value type
- **THEN** a Zod schema rejects it at the server boundary and an inline validation message
  is returned, never a raw 500, and nothing is persisted

#### Scenario: Oversized open answer is rejected, not stored

- **GIVEN** an `open` question
- **WHEN** the answer action receives a text payload longer than 4000 characters (for
  example a 10,000-character string)
- **THEN** the Zod boundary schema rejects it before any write, an inline validation message
  is returned, no raw 500 is surfaced, and no entry is created or updated for that question

#### Scenario: Locale-formatted or non-canonical scale value is rejected, not coerced

- **GIVEN** a `scale` question whose anchors are the canonical values for that question
- **WHEN** the answer action receives a scale value that is not a canonical anchor — a
  locale-formatted number (decimal comma or thousands separator), a whitespace-padded value,
  or any other non-canonical string form of an otherwise valid anchor
- **THEN** the Zod boundary schema rejects it without coercing, an inline validation message
  is returned, no raw 500 is surfaced, and nothing is persisted

#### Scenario: Answering refused for a non-collecting cycle

- **GIVEN** a token whose cycle is `done` or `expired`
- **WHEN** the respondent attempts to choose a mode or submit an answer
- **THEN** the write is refused and the respondent sees the calm completed/closed state,
  with no new response entry created

### Requirement: Explicit MVP exclusions

The system SHALL scope the respond capability to the entry, mode choice, and shared
response model only, and SHALL treat the following as intentionally out of scope for the
MVP so they are not reported as defects.

#### Scenario: Mode switching after answering is not supported

- **WHEN** a respondent has chosen a mode and begun answering
- **THEN** switching to the other mode mid-cycle is intentionally unsupported in the MVP
  (the AI-unavailable fallback offered by ai-interview, FR-AI-07, is the only crossover and
  is owned by ai-interview, not respond)

#### Scenario: Form and AI rendering/flow live in their own capabilities

- **WHEN** considering the form's section flow and the AI interview's chat behaviour
- **THEN** those are owned by the form (FR-FORM-*) and ai-interview (FR-AI-*) capabilities
  respectively; respond owns only the entry, the remembered mode choice, and the shared
  per-question response model they write to

#### Scenario: Multiple respondents per cycle are not supported

- **WHEN** a cycle is considered
- **THEN** the MVP supports one respondent per cycle; multi-respondent collection is
  intentionally out of scope
