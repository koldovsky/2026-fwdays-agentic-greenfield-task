# results

## Purpose

This capability is how the signed-in HR manager reads what a respondent has produced: the
cycles list and cycle detail show live answered / total progress with a thin progress bar; the
cycle detail renders each answer per question (the signature five-dot scale with its numeral for
`scale`, plain text for `open`); and, where the respondent used the AI interview, HR can open the
raw dialog for a question on demand. All of this stays inside the authenticated cabinet and is
never exposed to the respondent. Live progress is delivered by polling, not sockets
(FR-PROGRESS-01..03, TC-AI-04, BC-PRIVACY-01, NFR-SEC-01).

## Requirements

### Requirement: Live answered / total progress with a thin progress bar

The system SHALL show each cycle's live progress as answered / total questions plus a thin
progress bar, in both the cycles list (per row) and the cycle detail. "Answered" SHALL count the
required questions in the cycle's snapshot that currently hold a valid answer; "total" SHALL be
the required-question count of the snapshot. A `scale` answer is valid when it holds one of the
question's defined anchors. An `open` answer is valid when its text, after trimming leading and
trailing whitespace, is non-empty; an empty string or a whitespace-only answer (spaces, tabs,
newlines only) SHALL NOT be counted as answered. Progress SHALL be refreshed by polling the server at
an interval, never by a WebSocket or any socket transport. The progress bar SHALL be accompanied
by the numeric answered / total label so progress is never communicated by the bar's fill alone
(FR-PROGRESS-01, TC-AI-04, NFR-A11Y-02).

#### Scenario: List and detail both show answered / total and a bar

- **GIVEN** the HR manager is signed in and a cycle has some but not all required questions answered
- **WHEN** the cycles list and that cycle's detail render
- **THEN** both show an answered / total count (for example 3 / 8) and a thin progress bar whose
  fill matches that ratio

#### Scenario: Progress reflects new answers via polling, not sockets

- **GIVEN** the HR manager has the cycle detail open while the respondent submits one more answer
- **WHEN** the next poll interval elapses
- **THEN** the answered count and bar update to the new value without a page reload and without any
  WebSocket connection being opened

#### Scenario: A whitespace-only open answer does not count as answered

- **GIVEN** a cycle whose snapshot has a required `open` question for which the recorded answer is an
  empty string or contains only whitespace (spaces, tabs, or newlines)
- **WHEN** its progress renders
- **THEN** that question is counted as not answered, so it does not increment the answered count and
  the bar fill excludes it

#### Scenario: A fully answered cycle shows complete progress

- **GIVEN** a cycle whose every required snapshot question has a valid answer
- **WHEN** its progress renders
- **THEN** answered equals total (for example 8 / 8) and the bar is full

#### Scenario: A cycle with no answers yet shows zero progress

- **GIVEN** a launched cycle for which the respondent has answered no questions
- **WHEN** its progress renders
- **THEN** it shows 0 / total with an empty bar, never a blank area or a negative or NaN count

### Requirement: Cycle detail shows each answer per question by type

The system SHALL render the cycle detail as the ordered list of the cycle's snapshot questions,
each shown with its question text and the respondent's answer. A `scale` answer SHALL render as
the signature five-dot scale with the chosen anchor's numeral; an `open` answer SHALL render as
text. An oversized `open` answer SHALL be shown in full (its complete text reachable by the HR
reader, for example via wrapping or scrolling) and SHALL NOT be silently clipped or hidden behind
an unrecoverable truncation. A required question that has not yet been answered SHALL be shown as an explicit unanswered
state, not as a missing row or an empty value mistaken for an answer. The detail SHALL define
explicit empty, loading, and error states (FR-PROGRESS-02, NFR-A11Y-02).

#### Scenario: Scale answer renders as five-dot scale with numeral

- **GIVEN** a cycle whose snapshot has a `scale` question the respondent answered with a valid anchor
- **WHEN** the cycle detail renders that question
- **THEN** it shows the signature five-dot scale with the selected anchor and its numeral, matching
  the answer recorded for that question

#### Scenario: Open answer renders as text

- **GIVEN** a cycle whose snapshot has an `open` question the respondent answered in their own words
- **WHEN** the cycle detail renders that question
- **THEN** it shows the respondent's text as written, without truncating it into an unreadable value

#### Scenario: A long open answer is shown in full, not clipped

- **GIVEN** a cycle whose snapshot has an `open` question answered with a very long free-text response
- **WHEN** the cycle detail renders that question
- **THEN** the full text is reachable by the HR reader (wrapped or scrollable within its container) and
  is never silently clipped or cut off so that some of the answer cannot be read

#### Scenario: An unanswered question is shown as unanswered

- **GIVEN** a `collecting` cycle with at least one snapshot question not yet answered
- **WHEN** the cycle detail renders
- **THEN** that question appears with an explicit "not answered yet" state rather than being omitted
  or shown with a fabricated value

#### Scenario: Empty, loading, and error states are explicit

- **GIVEN** the HR manager opens a cycle detail
- **WHEN** the answers are still loading, the cycle has no answers yet, or the load fails
- **THEN** the screen shows a dedicated loading state, an empty state, and a calm error state
  respectively, never a blank area or a raw stack trace / 500

### Requirement: HR can view the raw AI interview dialog per question on demand

The system SHALL, for a question whose answer was produced via the AI interview, let the HR
manager open the raw dialog for that question on demand from the cycle detail. The dialog SHALL be
fetched and shown only when HR requests it, not rendered eagerly for every question. A question
that was answered via the form (no AI dialog) SHALL NOT offer a dialog view. The raw dialog SHALL
be visible only inside the authenticated cabinet and SHALL never be exposed to the respondent or
any unauthenticated request (FR-PROGRESS-03, BC-PRIVACY-01, NFR-SEC-01).

#### Scenario: Dialog is available on demand for an AI-answered question

- **GIVEN** a cycle whose respondent used the AI interview, with a question that has a recorded dialog
- **WHEN** the HR manager requests the raw dialog for that question
- **THEN** the question's raw conversation is shown to HR on demand, sourced from the stored dialog

#### Scenario: No dialog view for a form-answered question

- **GIVEN** a question answered through the form, with no AI dialog recorded
- **WHEN** the cycle detail renders that question
- **THEN** no raw-dialog view is offered for it, and requesting one returns nothing rather than an
  unrelated cycle's or question's dialog

#### Scenario: Dialog is never exposed outside the cabinet

- **GIVEN** a stored AI dialog for a cycle's question
- **WHEN** the respondent's session, an unauthenticated request, or a different cycle's token tries
  to read it
- **THEN** the dialog is not returned; only the authenticated HR session for that cycle can view it

#### Scenario: Dialog request requires an authenticated HR session

- **GIVEN** a request to view a raw dialog without a valid (or refreshable) HR session
- **WHEN** the request is made
- **THEN** it is redirected to sign-in with the intended path as `next` (or refused for an API call),
  and no dialog content is returned

### Requirement: Results screens require an authenticated HR session

The system SHALL serve the cycles list, cycle detail, progress polling endpoint, and raw-dialog
view only to an authenticated HR session, and SHALL NOT leak one cycle's progress, answers, or
dialog to a request scoped to another cycle. A request from an authenticated HR session for a
nonexistent or malformed cycle id, or for a nonexistent or malformed question id on the
progress-polling or raw-dialog endpoint, SHALL resolve to a calm not-found response, never a stack
trace or a 500. Answers and AI dialogs SHALL be visible to HR only;
the respondent SHALL never see results screens (FR-PROGRESS-01..03, FR-LINK-03, NFR-SEC-01,
NFR-OBS-01, BC-PRIVACY-01).

#### Scenario: Unauthenticated access redirects to sign-in

- **GIVEN** a request to the cycles list or a cycle detail without a valid (or refreshable) session
- **WHEN** the route is hit
- **THEN** the request is redirected to sign-in with the intended path as `next`, and no progress,
  answer, or dialog data is rendered

#### Scenario: No cross-cycle data leak

- **GIVEN** an authenticated HR session viewing one cycle
- **WHEN** the progress or dialog endpoint is queried with another cycle's id or a mismatched token
- **THEN** only data belonging to the requested, authorised cycle is returned, never another cycle's
  answers or dialog

#### Scenario: A nonexistent or malformed id resolves to a calm not-found

- **GIVEN** an authenticated HR session that requests the progress-polling or raw-dialog endpoint with
  a cycle id or question id that does not exist or is malformed (for example not a valid id format)
- **WHEN** the request is made
- **THEN** the request resolves to a calm not-found response with no answer, progress, or dialog
  content, and never returns a stack trace or a 500

## Exclusions

- This capability is **read-only**: HR viewing progress and answers does not edit, re-score, or
  override any answer; answer capture is owned by `respond` / `form` / `ai-interview`, and the
  status lifecycle is owned by `cycles`.
- The **AI summary report** (drafting and rendering the grounded summary) is owned by `report`, not
  `results`.
- Live progress uses **polling only**; a WebSocket / socket-server push channel is intentionally
  unsupported in MVP (TC-AI-04).
- **Respondent-facing** views of progress, answers, or dialogs are intentionally unsupported; all
  results stay inside the authenticated HR cabinet (BC-PRIVACY-01).
- **Exporting** results (CSV, PDF, print views) and **comparing** cycles side by side are out of
  MVP scope.
