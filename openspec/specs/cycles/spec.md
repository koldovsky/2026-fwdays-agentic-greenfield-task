# cycles

## Purpose

A cycle is the unit the HR manager works with: a snapshot of a template, a subject employee, a
deadline, a private link token, and a status. This capability owns cycle creation, launch (token
generation + template snapshot), the `collecting`/`done`/`expired` status lifecycle, and the
cycles list. It guarantees that a launched cycle is frozen against later template/seed changes and
that its status reflects completion and the deadline (FR-CYCLE-01..05, NFR-SEC-01, NFR-I18N-01,
BC-BRAND-01, TC-VALID-01, TC-PURE-01).

## Requirements

### Requirement: HR creates a cycle from a template, a subject, and a deadline

The system SHALL let the signed-in HR manager create a cycle by choosing exactly one seeded
template, exactly one subject employee from the directory, and a deadline date. The creation input
SHALL be validated with Zod at the server boundary (template id, subject id, deadline) before any
write, and the TypeScript types SHALL be inferred from that schema. A cycle SHALL reference a real,
non-archived employee and an existing template; a missing or archived subject or a missing template
SHALL be rejected with an inline message, never a raw 500. Create SHALL be reachable only by an
authenticated HR session; an unauthenticated request SHALL be refused and write nothing. The
deadline SHALL be accepted only as an ISO `YYYY-MM-DD` calendar date and SHALL be a future date
(strictly after today) within a bounded horizon; a locale-formatted, past/today, or out-of-range
deadline SHALL be rejected at the boundary (FR-CYCLE-01, NFR-SEC-01, NFR-I18N-01, BC-BRAND-01,
TC-VALID-01).

#### Scenario: Valid template, subject, and deadline create a cycle

- **GIVEN** the HR manager is signed in and the directory has at least one non-archived employee and
  the app has at least one seeded template
- **WHEN** the HR manager submits the create form with a chosen template, a chosen subject, and a
  future deadline date
- **THEN** a cycle is created referencing that subject and template, with the chosen deadline stored

#### Scenario: Missing or malformed input is rejected at the boundary

- **GIVEN** the HR manager is on the create form
- **WHEN** the submission omits the template, omits the subject, or carries a non-date / unparseable
  deadline
- **THEN** the Zod parse fails and the action returns a specific inline validation message per field,
  creating no cycle and surfacing no raw 500

#### Scenario: A locale-formatted deadline is rejected, only ISO YYYY-MM-DD is accepted

- **GIVEN** the HR manager is on the create form and today is `2026-06-28`
- **WHEN** the deadline arrives as the Ukrainian locale string `28.06.2026` (DD.MM.YYYY) rather than
  the ISO form `2026-06-28`
- **THEN** the Zod parse rejects `28.06.2026` with an inline "use the date picker / YYYY-MM-DD"
  message and creates no cycle, while the same calendar day expressed as `2026-06-28` would parse;
  the server never silently reinterprets `28.06.2026` as 6 August or any other day

#### Scenario: A past-or-today deadline is rejected at creation

- **GIVEN** the HR manager is on the create form and today is `2026-06-28`
- **WHEN** the submitted deadline is `2026-06-28` (today) or any earlier date
- **THEN** the create action rejects it with an inline "deadline must be in the future" message and
  creates no cycle, so no cycle is ever born already `expired`; only a strictly-future deadline
  (`2026-06-29` or later) is accepted

#### Scenario: An out-of-range or oversized deadline is rejected

- **GIVEN** the HR manager is on the create form
- **WHEN** the submitted deadline is absurdly far in the future (more than 365 days ahead, e.g.
  `9999-12-31`) or the deadline / id field carries an oversized string beyond its allowed length
- **THEN** the Zod parse rejects it at the boundary with an inline message and creates no cycle,
  never persisting an out-of-range value or surfacing a raw 500

#### Scenario: Unknown or archived subject or unknown template is refused

- **GIVEN** the HR manager submits a subject id that does not exist or is archived, or a template id
  that does not exist
- **WHEN** the create action runs
- **THEN** it refuses to create the cycle and returns a calm inline error, leaving the database
  unchanged

#### Scenario: An unauthenticated create request is refused and writes nothing

- **GIVEN** a create-cycle request arrives without a valid (or refreshable) HR session
- **WHEN** the create action or route is hit
- **THEN** the request is refused — redirected to sign-in with the intended path as `next` for a page
  load, or rejected for a direct action call — and no cycle, token, or snapshot is written

### Requirement: Launching a cycle mints a hard-to-guess token and sets status collecting

The system SHALL, on launch, generate a unique link token that is hard to guess (high-entropy,
non-sequential, not derived from the subject or any personal data) and set the cycle status to
`collecting`. The token generation SHALL be pure, framework-free, and unit-tested in `lib/`; the
token SHALL be unique across all cycles. The token SHALL carry no personal data and SHALL NOT be
enumerable. Launch SHALL be reachable only by an authenticated HR session; an unauthenticated
request SHALL be refused and write nothing. Launch SHALL apply only to a cycle that has not yet been
launched; launching a cycle that is already launched (status `collecting`, `done`, or `expired`)
SHALL be refused as a no-op that neither rotates the existing token nor re-snapshots, so a token is
never silently invalidated (FR-CYCLE-02, NFR-SEC-01, TC-PURE-01, BC-PRIVACY-02).

#### Scenario: Launch generates a unique token and sets collecting

- **GIVEN** a created cycle that has not yet been launched
- **WHEN** the HR manager launches it
- **THEN** the cycle is assigned a unique token and its status becomes `collecting`

#### Scenario: Tokens are high-entropy and non-enumerable

- **WHEN** many cycles are launched and their tokens are compared
- **THEN** every token is unique, contains no subject id, name, email, or sequential counter, and
  cannot be derived or guessed from another token, verified by unit tests over the framework-free
  token generator

#### Scenario: Token uniqueness is enforced at the data layer

- **WHEN** a token collision would occur on launch
- **THEN** the system detects the collision and regenerates rather than overwriting an existing
  cycle's token, so each token resolves to exactly one cycle

#### Scenario: Relaunching an already-launched cycle is refused as a no-op

- **GIVEN** a cycle that has already been launched (status `collecting`, `done`, or `expired`) and
  therefore already holds a token and a snapshot
- **WHEN** a launch is attempted on it again
- **THEN** the action is refused with a calm inline message and is a no-op: the existing token is
  neither rotated nor regenerated, the snapshot is unchanged, and the status is unchanged

#### Scenario: An unauthenticated launch request is refused and writes nothing

- **GIVEN** a launch request arrives without a valid (or refreshable) HR session
- **WHEN** the launch action or route is hit
- **THEN** the request is refused — redirected to sign-in with the intended path as `next` for a page
  load, or rejected for a direct action call — and no token is minted, no snapshot is written, and
  the cycle status is unchanged

### Requirement: The chosen template is snapshotted into the cycle at launch

The system SHALL, at launch, copy the chosen template (its name, methodology tag, and the full
ordered question list with each question's stable id, order, text, type, required flag, and `scale`
anchors) into an immutable snapshot stored on the cycle. After launch, the cycle SHALL read its
questions from this snapshot only; later edits, reseeds, or deletion of the source template SHALL
NOT change the launched cycle's questions. The snapshotting logic SHALL be pure and unit-tested in
`lib/` (FR-CYCLE-03, TC-PURE-01, TC-VALID-01).

#### Scenario: Snapshot is frozen at launch

- **GIVEN** a cycle launched from a template with a known ordered question list
- **WHEN** the cycle is later opened
- **THEN** its questions match the template exactly as it was at launch, read from the cycle's own
  snapshot rather than the live template

#### Scenario: Later template changes never alter a launched cycle

- **GIVEN** a launched cycle whose source template is then edited, reseeded, or deleted
- **WHEN** the cycle is reopened
- **THEN** its questions, order, types, required flags, and anchors are unchanged from launch time

#### Scenario: Snapshot shape is validated

- **WHEN** the snapshot is written at launch and read back
- **THEN** it parses against the snapshot Zod schema (template name, methodology, ordered questions
  with stable ids and anchors), so a malformed snapshot is caught at the boundary rather than
  surfacing downstream

### Requirement: Cycle status lifecycle is collecting, done, or expired

The system SHALL keep each cycle's status as exactly one of `collecting`, `done`, or `expired`. A
cycle SHALL move to `done` when its response is complete (every required question in the snapshot
has a valid answer). A cycle SHALL be treated as `expired` when its deadline has passed while the
response is still incomplete; an expired cycle SHALL NOT be auto-promoted to `done`. Because creation
rejects any past-or-today deadline (see "HR creates a cycle"), a cycle SHALL always start
`collecting` with a strictly-future deadline and SHALL only reach `expired` after that deadline later
elapses — it SHALL never be born `expired`. The completion
and expiry rules SHALL be pure, framework-free, and unit-tested in `lib/` (FR-CYCLE-04, TC-PURE-01).

#### Scenario: Completing the response sets done

- **GIVEN** a `collecting` cycle whose snapshot has required questions
- **WHEN** the respondent supplies a valid answer to every required question
- **THEN** the cycle status becomes `done`

#### Scenario: Past deadline while incomplete is expired

- **GIVEN** a `collecting` cycle whose deadline is in the past and whose required questions are not
  all answered
- **WHEN** the status is evaluated
- **THEN** the cycle is `expired` and is not shown as `done`

#### Scenario: A completed cycle stays done past its deadline

- **GIVEN** a cycle that reached `done` before its deadline
- **WHEN** the deadline later passes
- **THEN** the cycle remains `done` and does not flip to `expired`

#### Scenario: Status is always one of the three values

- **WHEN** any cycle's status is read
- **THEN** it is exactly one of `collecting`, `done`, or `expired`, never null or any other value

### Requirement: Cycles list shows subject, methodology, deadline, progress, and status

The system SHALL render a cycles list for the signed-in HR manager where each row shows the subject
employee's name, the cycle's methodology tag, the deadline expressed as days remaining, answered /
total progress, and the status; clicking a row SHALL open that cycle's detail. Status SHALL be
communicated by a text label, not by color alone. The list SHALL define explicit empty, loading, and
error states and SHALL be reachable only by an authenticated HR session (FR-CYCLE-05, FR-SHELL-03,
NFR-A11Y-02, NFR-SEC-01).

#### Scenario: A populated list shows all five columns per row

- **GIVEN** the HR manager is signed in and one or more cycles exist
- **WHEN** the cycles list loads
- **THEN** each row shows the subject name, methodology tag, deadline as days remaining, answered /
  total progress, and a text status label, and clicking the row opens that cycle

#### Scenario: Days remaining reflects the deadline relative to today

- **GIVEN** a cycle with a deadline in the future and another already past its deadline
- **WHEN** the list renders
- **THEN** the future cycle shows a positive days-remaining count while the past one is shown as
  overdue / expired rather than a negative count presented as time left

#### Scenario: Empty, loading, and error states are explicit

- **GIVEN** the HR manager opens the cycles list
- **WHEN** there are no cycles, the data is still loading, or the load fails
- **THEN** the screen shows a dedicated empty state, a loading state, and a calm error state
  respectively, never a blank area or a raw stack trace

#### Scenario: The list requires an authenticated HR session

- **GIVEN** a request to the cycles list without a valid (or refreshable) session
- **WHEN** the route is hit
- **THEN** the request is redirected to sign-in with the intended path as `next`, and no cycle data
  is rendered

## Exclusions

- Cycle **creation deadline** is a calendar date only; time-of-day scheduling, timezone pickers, and
  reminder notifications are intentionally out of scope in MVP.
- A cycle has **exactly one respondent and one response** in MVP; multi-reviewer 360°, reviewer
  relations, and coverage minimums are intentionally unsupported.
- Cycle **editing after launch** (changing template, subject, or deadline) and **manual status
  override** are intentionally unsupported; the snapshot and lifecycle are authoritative.
- **Cancelling, deleting, or reopening** a cycle is not in MVP scope.
- **Respondent link delivery** (`/respond/[token]`, copy-link, expired-token page) is owned by the
  `link` capability; **answer capture, progress detail, and AI summary** are owned by `respond`,
  `form`, `ai-interview`, `results`, and `report` — not by `cycles`.
- Background jobs that flip status on a schedule are out of scope; status is derived/evaluated on
  read (no cron in MVP).
