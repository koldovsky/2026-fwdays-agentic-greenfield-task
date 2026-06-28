# templates

## Purpose

Templates are the reusable blueprints HR picks from when starting an assessment
cycle. The app ships with at least two seeded templates (e.g. a probation
check-in and a peer feedback round), each carrying a name, a methodology tag,
and an ordered list of typed questions. Each question has a stable id, an order,
text, a type (`scale` or `open`), and a required flag; `scale` questions carry an
ordered list of labelled anchors. In the MVP templates are read-only — there is
no editor — and HR can preview any template exactly as a respondent would see it
(FR-TPL-01, FR-TPL-02, FR-TPL-03, TC-VALID-01, TC-PURE-01, NFR-I18N-01).

## Requirements

### Requirement: At least two seeded read-only templates with name, methodology tag, and ordered questions

The system SHALL ship with at least two seeded templates (for example a probation
check-in and a peer feedback round). Each template SHALL have a name, a
methodology tag, and an ordered list of questions. Templates are seeded into the
database and SHALL NOT be created, edited, or deleted through the product in the
MVP (read-only). The seed data SHALL be validated against a Zod schema at the
seeding boundary, with the TypeScript type inferred from that schema, and SHALL
NOT be hand-written as a parallel type. A template name SHALL be a non-empty,
trimmed string of at most 200 characters (FR-TPL-01, FR-TPL-03, TC-VALID-01).

#### Scenario: Two distinct templates exist after seeding

- **GIVEN** a freshly seeded database
- **WHEN** the seeded templates are listed
- **THEN** at least two templates exist, each with a non-empty name, a non-empty
  methodology tag, and at least one question, and the two templates have distinct
  names and represent distinct methodologies (e.g. probation check-in and peer
  feedback)

#### Scenario: Each template exposes its questions in a defined order

- **GIVEN** a seeded template whose question order values are unique and contiguous
  integers starting at 1 (1, 2, 3, ...)
- **WHEN** its question list is read
- **THEN** the questions are returned sorted ascending by their order value, a stable
  and deterministic ordering identical on every read

#### Scenario: Duplicate or non-contiguous question order values are rejected at the seed boundary

- **GIVEN** seed data for a template whose questions contain a duplicated order value
  (two questions sharing the same order) or non-contiguous order values (e.g. 1, 2, 4
  with a gap, or values not starting at 1)
- **WHEN** the template is parsed with the template Zod schema
- **THEN** parsing fails with a validation error and the template is not written to the
  database, because the schema requires the question order values of a template to be
  exactly the unique contiguous integers 1..N where N is the question count, so the
  read order is always unambiguous

#### Scenario: Templates are read-only in the MVP

- **GIVEN** the running MVP product
- **WHEN** any user (including HR) attempts to create, edit, or delete a template
- **THEN** no such action is exposed, and templates can only be read or previewed,
  never mutated through the product

#### Scenario: Malformed seed data is rejected at the boundary

- **GIVEN** seed data missing a required field (e.g. a template with no name, no
  methodology tag, or an empty question list)
- **WHEN** the seed is parsed with the template Zod schema
- **THEN** parsing fails with a validation error and the malformed template is not
  written to the database

#### Scenario: An over-length template name is rejected

- **GIVEN** seed data for a template whose name exceeds 200 characters (e.g. a
  201-character string)
- **WHEN** the template is parsed with the template Zod schema
- **THEN** parsing fails with a validation error and the template is not written to the
  database

### Requirement: Typed questions with stable id, order, text, type, and required flag

Each template question SHALL have a stable identifier (unchanging across reads and
referenced by downstream cycle snapshots and responses), an order, text, a type
that is exactly one of `scale` or `open`, and a required flag. Question text SHALL
be a string that, once trimmed of leading and trailing whitespace, is non-empty and
at most 500 characters. The question shape
SHALL be defined once via a Zod schema with the TypeScript type inferred from it,
matching the data-model schema for questions (FR-TPL-02, TC-VALID-01, TC-ARCH-01).

#### Scenario: A question carries all required fields

- **GIVEN** any question on a seeded template
- **WHEN** the question is read
- **THEN** it has a stable id, an order, non-empty text, a type of `scale` or
  `open`, and a boolean required flag

#### Scenario: Question ids are stable across reads

- **GIVEN** a seeded template read at two different times with no seed change in
  between
- **WHEN** the ids of its questions are compared
- **THEN** each question has the same id on both reads, so downstream cycle
  snapshots and responses can reference it reliably

#### Scenario: An unknown question type is rejected

- **GIVEN** seed data with a question whose type is neither `scale` nor `open`
  (e.g. `multiple-choice`)
- **WHEN** the question is parsed with the question Zod schema
- **THEN** parsing fails with a validation error and the question is not accepted

#### Scenario: A question with empty or whitespace-only text is rejected

- **GIVEN** seed data with a question whose text is an empty string or consists only
  of whitespace (e.g. `""` or `"   "`)
- **WHEN** the question is parsed with the question Zod schema
- **THEN** parsing fails with a validation error and the question is not accepted,
  because trimmed question text must be non-empty

#### Scenario: An over-length question text is rejected

- **GIVEN** seed data with a question whose trimmed text exceeds 500 characters
- **WHEN** the question is parsed with the question Zod schema
- **THEN** parsing fails with a validation error and the question is not accepted

### Requirement: Scale questions carry an ordered list of labelled anchors

Every `scale` question SHALL carry an ordered, non-empty list of anchors, each
anchor having a value and a label. An anchor `value` SHALL be a JSON integer (the
canonical type), not a string and not a decimal — values such as `"3"`, `3.5`, or a
locale-formatted `"3,5"` are not valid `value` inputs. The anchor `value`s within a
single `scale` question SHALL be unique. The anchors SHALL define the only valid
answer values for that question: a downstream answer to a `scale` question is valid
only if it equals one of that question's anchor `value` integers. `open` questions
SHALL NOT carry anchors. The anchor
shape SHALL be defined once via a Zod schema with the TypeScript type inferred from
it (FR-TPL-02, TC-VALID-01).

#### Scenario: A scale question exposes ordered labelled anchors

- **GIVEN** a `scale` question on a seeded template
- **WHEN** its anchors are read
- **THEN** the anchors are returned as a non-empty list in a defined order, each with
  an integer `value` and a human-readable label, the `value`s are unique within the
  question, and these integer `value`s are the only valid answer values for that
  question

#### Scenario: An open question has no anchors

- **GIVEN** an `open` question on a seeded template
- **WHEN** the question is read
- **THEN** it carries no anchor list, only free-text question text

#### Scenario: A scale question with no anchors is rejected

- **GIVEN** seed data with a `scale` question whose anchor list is empty or missing
- **WHEN** the question is parsed with the question Zod schema
- **THEN** parsing fails with a validation error and the question is not accepted

#### Scenario: An anchor missing a value or label is rejected

- **GIVEN** seed data with a `scale` question whose anchor lacks a value or a label
- **WHEN** the anchor is parsed with the anchor Zod schema
- **THEN** parsing fails with a validation error and the question is not accepted

#### Scenario: A non-canonical or locale-formatted anchor value is rejected

- **GIVEN** seed data with a `scale` question whose anchor `value` is not a canonical
  JSON integer — for example the numeric string `"3"`, a decimal `3.5`, a
  locale-formatted decimal-comma string `"3,5"`, or a string with leading zeros
  `"03"`
- **WHEN** the anchor is parsed with the anchor Zod schema
- **THEN** parsing fails with a validation error and the question is not accepted; the
  schema does not coerce strings to numbers, so only an integer `value` is admitted

#### Scenario: Duplicate anchor values within one scale question are rejected

- **GIVEN** seed data with a `scale` question whose anchors contain two entries sharing
  the same `value` (e.g. two anchors both with `value` 3)
- **WHEN** the question is parsed with the question Zod schema
- **THEN** parsing fails with a validation error and the question is not accepted,
  because anchor `value`s must be unique within a question so each valid answer value
  maps to exactly one anchor

### Requirement: HR can preview a template as the respondent would see it

The system SHALL let an authenticated HR manager preview any seeded template
rendered as the respondent would see it: the template name, methodology tag, and
each question in order, with `scale` questions showing their labelled anchors as
the option list and `open` questions showing their free-text prompt. The preview
SHALL be read-only (no answers are saved) and styled with the Kolo360 design
tokens, with Ukrainian-first strings and explicit empty, loading, and error
states (FR-TPL-03, NFR-I18N-01, NFR-SEC-01, NFR-A11Y-01).

#### Scenario: Preview renders questions in respondent form

- **GIVEN** an authenticated HR manager opening the preview of a seeded template
- **WHEN** the preview loads
- **THEN** it shows the template name, methodology tag, and every question in
  order, with each `scale` question rendering its labelled anchors as the option
  list and each `open` question rendering its free-text prompt, exactly as a
  respondent would see them

#### Scenario: Preview saves nothing

- **GIVEN** an HR manager viewing a template preview
- **WHEN** they interact with the previewed inputs (e.g. select an anchor or type
  text)
- **THEN** no response is persisted and no cycle is affected, because the preview is
  read-only

#### Scenario: Unauthenticated preview request redirects to sign-in

- **GIVEN** a request without a valid session targeting the template preview route
- **WHEN** the request is handled
- **THEN** it is redirected to the sign-in page carrying the intended path as
  `next`, and the preview is not rendered

#### Scenario: Any authenticated session is the HR manager in the single-account MVP

- **GIVEN** that the MVP has a single HR account (FR-AUTH-02), so every valid session
  belongs to the HR manager and there is no non-HR authenticated actor
- **WHEN** a request with a valid session targets the template preview route
- **THEN** the request is treated as HR and the preview is rendered; a distinct
  authenticated-but-not-HR (forbidden) path is intentionally out of scope in the MVP
  because no such role exists, and the only authorization boundary enforced here is
  authenticated versus unauthenticated

#### Scenario: Previewing an unknown template shows a calm error, not a stack trace

- **GIVEN** an authenticated HR manager requesting the preview of a template id
  that does not exist
- **WHEN** the request is handled
- **THEN** a calm not-found state is shown using the Kolo360 tokens and
  Ukrainian-first strings, never a raw 500 or a stack trace

## Out of scope (intentional exclusions)

- A template editor, template authoring, or custom methodologies — templates are
  seeded and read-only in the MVP. Reports of "cannot edit a template" are not bugs.
- Question types beyond `scale` and `open` (e.g. multiple-choice, rating matrices).
- Per-employee or per-cycle template customisation; cycle-time snapshotting is owned
  by the `cycles` capability (FR-CYCLE-03), not by templates.
- Localisation of seeded template content into multiple languages at runtime; only
  the surrounding product UI strings are centralised (NFR-I18N-01).
- Role-based authorization beyond authenticated/unauthenticated for preview; the MVP
  has a single HR account (FR-AUTH-02), so an authenticated-but-not-HR forbidden path
  is intentionally unsupported. Reports of "no forbidden/403 handling for preview" are
  not bugs in the MVP.
