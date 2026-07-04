## ADDED Requirements

### Requirement: Persist a tailoring for paid users
The system SHALL persist a completed tailoring — its extracted job title, match
score, checklist items, and generated bullets — for a logged-in user with an
active paid entitlement, so it can be listed and re-opened later. The
persistence SHALL run after the result has been delivered to the client and
SHALL be best-effort: a persistence failure SHALL be logged server-side only and
SHALL NOT alter, delay, or fail the result the user already received (NFR-OBS-01,
FR-TAILOR-03). Anonymous and free-tier runs SHALL persist nothing.
Implements FR-TAILOR-04, FR-HISTORY-01.

#### Scenario: Paid run is stored
- **WHEN** a paid, logged-in user completes a tailoring
- **THEN** a tailoring record with its job title, match score, checklist, and bullets is saved for that user

#### Scenario: Free run is not stored
- **WHEN** an anonymous or free-tier user completes a tailoring
- **THEN** no tailoring record is persisted, and the user still sees the current-session result

#### Scenario: A save failure never harms the result
- **WHEN** persistence throws after a successful run
- **THEN** the user still receives the complete result, and the failure is logged server-side without surfacing to the client

### Requirement: Extract job title from a job description
The system SHALL derive a human-readable job title from job-description text
using a deterministic, framework-free pure function (TC-PURE-01), returning
`null` when no plausible title can be found. The extracted title SHALL be stored
with the tailoring and shown in the history list.
Implements FR-HISTORY-01.

#### Scenario: Title is extracted
- **WHEN** a job description naming a role is processed
- **THEN** a concise job title is returned and stored with the tailoring

#### Scenario: No title available
- **WHEN** a job description has no discernible role title
- **THEN** the function returns `null` and the history list falls back to a neutral label

### Requirement: List a user's tailoring history
The system SHALL expose an endpoint returning the authenticated user's tailoring
summaries (id, job title, match score, creation date), newest first. The
endpoint SHALL be scoped to the caller's own records only, and SHALL be gated to
paid users (free/anonymous callers receive no history).
Implements FR-HISTORY-01, FR-TAILOR-04.

#### Scenario: Paid user lists their history
- **WHEN** a paid, logged-in user requests their history
- **THEN** the response lists only their own past tailorings, newest first, each with job title, match score, and date

#### Scenario: History is per-user
- **WHEN** the list is built
- **THEN** it contains no tailoring belonging to any other user

### Requirement: Re-open a stored tailoring
The system SHALL expose an endpoint returning one full stored tailoring
(checklist + bullets) by id, and a history detail view that re-opens it in the
result view in read/edit mode. Access SHALL be **owner-scoped**: a request for a
tailoring the caller does not own SHALL return `404` (not `403`), so the
existence of another user's record is not disclosed (NFR-SEC-02).
Implements FR-HISTORY-02.

#### Scenario: Owner re-opens their tailoring
- **WHEN** a paid user opens one of their past tailorings
- **THEN** its stored checklist and bullets are shown in the result view in read/edit mode

#### Scenario: Cross-user access is not disclosed
- **WHEN** a user requests a tailoring id owned by a different user
- **THEN** the response is `404` and reveals nothing about whether that id exists

### Requirement: History entry point in the account menu
The signed-in account menu SHALL provide a History destination linking to the
history list. It SHALL be a real link (no dead `href="#"` stub); the paid gate is
enforced by the history route/view, which surfaces the upgrade paywall for a
free user rather than a broken link.
Implements FR-HISTORY-01, FR-SHELL-01.

#### Scenario: Signed-in user reaches history from the menu
- **WHEN** a signed-in user opens the account menu
- **THEN** a History link is present and navigates to the history list
