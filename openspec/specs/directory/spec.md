# directory

## Purpose

The employee directory lets the HR manager add, view, edit, and archive the employees who
will be assessed. Each employee carries a required full name and email plus optional role,
phone, and Telegram handle. The list is the entry point for selecting a subject when running
an assessment cycle. Employees are archived, never hard-deleted, so historical assessments
keep their subject. Personal data lives only in the database, the form follows the Kolo360
design system, and inputs are validated on blur and at the server boundary
(FR-DIR-01..04, NFR-A11Y-01/-02, BC-BRAND-01, BC-PRIVACY-04).

## Requirements

### Requirement: Add an employee via a form

The system SHALL let the HR manager create an employee through a form whose fields are full
name (**required**), email (**required**), role (optional), phone (optional), and Telegram
handle (optional). Every field has a maximum length, enforced both on blur and at the
server boundary: full name 1–120 characters, email 3–254 characters, role 0–80 characters,
phone 0–32 characters, Telegram handle 0–33 characters. Submitted data SHALL be parsed with
a Zod schema at the server boundary before any write, and the TypeScript type SHALL be
inferred from that schema. A created employee SHALL persist to the database and SHALL appear
in the employee list (FR-DIR-01, FR-DIR-03, TC-VALID-01).

#### Scenario: Employee is created with all fields

- **WHEN** the HR manager submits the add form with a full name, email, role, phone, and
  Telegram handle
- **THEN** a new employee record is persisted with all five values and the new employee is
  shown in the directory list

#### Scenario: Employee is created with only required fields

- **WHEN** the HR manager submits the add form with only a full name and an email, leaving
  role, phone, and Telegram handle blank
- **THEN** a new employee record is persisted with the two required values and the optional
  fields stored as empty/unset, and the employee appears in the list

#### Scenario: Submitted data is validated at the server boundary

- **WHEN** the create action receives the submitted form data
- **THEN** it parses the payload with a Zod schema before any database write, rejecting a
  payload that fails the schema, and the TypeScript type is inferred from that schema (no
  hand-written parallel type, no cast)

#### Scenario: Oversized field value is rejected on blur and at the server

- **WHEN** the HR manager enters a value longer than the field maximum (full name > 120
  characters, email > 254, role > 80, phone > 32, or Telegram handle > 33) — for example a
  121-character full name
- **THEN** on blur the field shows its specific inline length message (for example "Full name
  must be at most 120 characters") and submission is blocked; and if the oversized value
  reaches the create or edit action (client validation bypassed), the same Zod length rule
  rejects the payload before any database write and the failure is returned as an inline
  field message rather than a raw error

### Requirement: List, edit, and archive employees

The system SHALL show the HR manager a list of employees and SHALL let the manager edit an
existing employee's fields or archive an employee. Archiving SHALL be a soft state change
(for example a status or `archivedAt` marker), never a hard delete, so any assessment that
references the employee keeps its subject. Archived employees SHALL be excluded from the
default active list and SHALL NOT be offered as new-assessment subjects, while remaining
resolvable for historical records. The list, edit, and archive screens SHALL each define
explicit empty, loading, and error states (FR-DIR-02, FR-SHELL-03).

#### Scenario: Directory lists employees

- **WHEN** the HR manager opens the employee directory with at least one active employee
- **THEN** the active employees are shown in a list

#### Scenario: Empty directory shows an empty state

- **WHEN** the HR manager opens the directory and there are no active employees
- **THEN** an explicit empty state is shown (not a blank area), inviting the manager to add
  the first employee

#### Scenario: Editing an employee updates the record

- **WHEN** the HR manager edits an existing employee and submits valid changes
- **THEN** the employee record is updated in place (same identity), the changes are parsed
  with the same Zod schema, and the updated values appear in the list

#### Scenario: Archiving is a soft state change, never a hard delete

- **WHEN** the HR manager archives an employee
- **THEN** the employee record is retained in the database in an archived state, is removed
  from the default active list, is no longer offered as a new-assessment subject, and any
  existing assessment that references the employee still resolves to that employee

### Requirement: On-blur validation with specific inline messages

The system SHALL validate form fields on blur and SHALL surface a specific message for each
failing field (for example "Email is not valid" for a malformed email). The required fields
(full name and email) SHALL block submission while empty, each showing its own specific
inline required message rather than a single generic banner.

The decidable validation rules per field are:

- **Full name** — required; after trimming, length 1–120 characters.
- **Email** — required; 3–254 characters; must match the standard email shape (a non-empty
  local part, an `@`, and a domain with at least one dot), validated by Zod's email rule.
- **Role** — optional; when present, length 0–80 characters; no format constraint.
- **Phone** — optional; when present, after trimming it MUST match the regex
  `^\+?[0-9 ()\-]{6,32}$` — that is, an optional leading `+` followed by 6–32 characters
  drawn only from digits, spaces, parentheses, and hyphens. This explicitly ACCEPTS
  locale-formatted numbers such as `+380 (44) 123-45-67` or `+1 650-555-0100`, and REJECTS
  values containing letters or other symbols (for example `call me`).
- **Telegram handle** — optional; when present it MUST match the regex `^@[A-Za-z0-9_]{5,32}$`
  — a leading `@` followed by 5–32 characters of ASCII letters, digits, or underscores. This
  REJECTS values without a leading `@`, shorter than 5 characters after the `@`, or containing
  spaces or other punctuation.

The same Zod schema enforces these rules on blur (client) and at the server boundary. When the
server action rejects a payload, it SHALL return a typed error result of the shape
`{ ok: false, fieldErrors: Record<fieldName, string> }` mapping each failing field to its
specific message; the form SHALL render each entry under its corresponding field. A mutation
SHALL never surface a raw server error or 500 to the user (FR-DIR-03, TC-VALID-01).

#### Scenario: Malformed email shows a specific message on blur

- **WHEN** the HR manager types a malformed email and blurs the email field
- **THEN** a specific inline message such as "Email is not valid" is shown on the email field

#### Scenario: Empty required field blocks submit with its own message

- **WHEN** the HR manager attempts to submit with full name and/or email left empty
- **THEN** submission is blocked and each empty required field shows its own specific inline
  required message (for example "Full name is required", "Email is required")

#### Scenario: Malformed optional field is flagged, blank optional field is accepted

- **WHEN** the HR manager enters a phone containing letters (for example `call me`) or a
  Telegram handle without a leading `@` (for example `mihailo`), versus leaving the field
  blank
- **THEN** a value that fails the field regex shows its specific inline message (for example
  "Phone format is not valid", "Telegram handle is not valid") and blocks submit, while a
  blank optional field passes validation

#### Scenario: Locale-formatted phone number is accepted

- **WHEN** the HR manager enters a locale-formatted phone such as `+380 (44) 123-45-67` or
  `+1 650-555-0100` in the optional phone field and blurs it
- **THEN** the value passes validation (it matches `^\+?[0-9 ()\-]{6,32}$`), no inline error
  is shown, and submission is not blocked by the phone field

#### Scenario: Server-side validation failure surfaces inline, never a raw 500

- **WHEN** the create or edit action rejects the payload at the Zod boundary because client
  validation was bypassed, and one or more fields fail (for example email malformed and full
  name empty in the same submission)
- **THEN** the action returns the typed result `{ ok: false, fieldErrors: { email: "Email is
  not valid", fullName: "Full name is required" } }`, the form renders each message under its
  matching field, and the user never sees a raw server error or HTTP 500

### Requirement: Directory follows the Kolo360 design system and protects personal data

The directory and its add/edit form are not in the design brief's screen list and SHALL be
composed from the Kolo360 design system: cards, hairline borders, sentence case, and the
shared design-system form components and tokens, with no reinvented styling. Interactive
elements SHALL have accessible names, a full keyboard tab order, and a visible 2px accent
focus ring; status SHALL be conveyed by a text label, never by color alone. UI strings SHALL
be Ukrainian-first with an English fallback, drawn from the centralised i18n strings, with no
exclamation marks and no emoji. Personal data (full name, email, phone, Telegram handle)
SHALL live only in the database and SHALL NOT be exposed to third parties or placed in any
AI prompt (FR-DIR-04, NFR-A11Y-01, NFR-A11Y-02, BC-BRAND-01, BC-PRIVACY-04).

#### Scenario: Form and list use design-system components and tokens

- **WHEN** the directory list and the add/edit form are rendered
- **THEN** they are built from the Kolo360 design-system components (cards, hairline borders,
  shared form inputs) using the design tokens, in sentence case, with no reinvented or
  ad-hoc styling

#### Scenario: Interactive elements are keyboard and screen-reader accessible

- **WHEN** the HR manager navigates the directory and form by keyboard and with a screen
  reader
- **THEN** every interactive element is reachable by keyboard, has an accessible name, and
  shows a visible 2px accent focus ring when focused

#### Scenario: Status is never communicated by color alone

- **WHEN** an employee's archived/active status is displayed
- **THEN** the status is conveyed with a text label and meets WCAG AA contrast, not by color
  alone

#### Scenario: UI strings are Ukrainian-first and from centralised i18n

- **WHEN** the directory and form strings are rendered
- **THEN** they come from the centralised Ukrainian-first i18n strings (English fallback) and
  contain no exclamation marks and no emoji

#### Scenario: Personal data stays in the database

- **WHEN** an employee's data is stored and used
- **THEN** full name, email, phone, and Telegram handle are persisted only in the database
  and are never sent to a third party or placed in any AI prompt

### Requirement: Out-of-scope exclusions for the directory MVP

The following are intentionally **not** part of the directory capability in the MVP and SHALL
NOT be reported as defects: hard deletion of employees (archive only), bulk import or export
of employees, employee self-service editing of their own record, profile photos or avatars,
org-chart or manager-hierarchy relationships, and any directory writes by a respondent or any
role other than the HR manager.

#### Scenario: Hard delete is not offered

- **WHEN** the HR manager looks for a way to permanently delete an employee
- **THEN** no hard-delete action exists; the only removal is archive (soft) and this is not a
  defect

#### Scenario: Non-HR actors cannot modify the directory

- **WHEN** a respondent or any non-HR actor attempts to add, edit, or archive an employee
- **THEN** the action is not available to them; directory writes are reserved for the
  authenticated HR manager
