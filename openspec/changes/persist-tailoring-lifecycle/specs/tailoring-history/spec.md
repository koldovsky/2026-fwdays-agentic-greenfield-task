# tailoring-history (delta)

## ADDED Requirements

### Requirement: Tailoring row created at run start for all logged-in users

The system SHALL create a `tailorings` row with `status = 'pending'` immediately
after a logged-in user's generation request is authenticated and the
job-description row is inserted, before any LLM call is made. This applies to
both the one-shot route (`/api/tailor`) and the wizard generation route
(`/api/tailor/generate`), for all logged-in users regardless of plan. Anonymous
runs SHALL NOT create a row. The row creation is best-effort: a failure to create
the pending row SHALL be logged server-side and SHALL NOT block the tailoring run
or alter the result the user receives (NFR-OBS-01). Implements FR-TAILOR-04,
FR-HISTORY-01, NFR-OBS-01.

#### Scenario: Pending row exists before LLM call

- **WHEN** a logged-in user submits a tailoring request
- **THEN** a `tailorings` row with `status = 'pending'` exists in the database before
  the first LLM token is requested
- **AND** the row carries the extracted job title (or null) and the job-description
  foreign key, but no CV text or PII beyond the owning user id (NFR-SEC-01)

#### Scenario: Anonymous run leaves no row

- **WHEN** an anonymous visitor completes a tailoring
- **THEN** no `tailorings` row is created at any point during that run

#### Scenario: Persistence failure at start does not break the run

- **WHEN** the database insert for the pending row throws before the LLM call
- **THEN** the tailoring run proceeds normally, the user receives their result,
  and the failure is logged server-side only

### Requirement: Tailoring row transitions to complete on a successful result

The system SHALL update the `pending` tailoring row to `status = 'complete'` when
the generation run emits a terminal `result` event, atomically upsetting the
checklist items and bullets in the same transaction. The update SHALL run after
the result has been streamed to the client, is best-effort, and SHALL NOT delay,
alter, or fail the result the user already received (NFR-OBS-01, FR-TAILOR-03).
Implements FR-TAILOR-04, FR-HISTORY-01, NFR-OBS-01.

#### Scenario: Row is complete after a successful run

- **WHEN** the generation route emits a `result` event for a logged-in user
- **THEN** the corresponding `tailorings` row transitions to `status = 'complete'`
  and its checklist items and bullets are persisted as children

#### Scenario: Completion write failure does not harm the result

- **WHEN** the database update to `complete` throws after the result has streamed
- **THEN** the user still has their complete, honesty-checked result, and the failure
  is logged server-side without surfacing to the client

### Requirement: Tailoring row transitions to failed on an unrecoverable error

The system SHALL update the `pending` tailoring row to `status = 'failed'` when
the generation run ends without producing a result event (LLM error, parse
failure, stream abort). The update is best-effort; failure to write the status is
logged server-side and does not block error reporting to the client. Implements
FR-TAILOR-03, NFR-OBS-01.

#### Scenario: Row is failed after a run that produced no result

- **WHEN** the generation route exits without emitting a `result` event for a
  logged-in user
- **THEN** the corresponding `tailorings` row transitions to `status = 'failed'`

#### Scenario: Failed-status write failure is silent to the user

- **WHEN** the database update to `failed` itself throws
- **THEN** the calm failure event is still sent to the client, and the write error
  is logged server-side only

### Requirement: Repository contract for lifecycle persistence

The tailoring repository SHALL expose two new methods alongside the existing `save`:

- `createPending(userId, jobDescriptionId, jobTitle): Promise<string>` — inserts a
  `status = 'pending'` row and returns its `id`.
- `updateStatus(id, status, payload?)` — sets the row's status; when status is
  `'complete'` and a payload is supplied, upserts checklist items and bullets in
  the same transaction, all-or-nothing.

The existing `save` method SHALL remain, delegating to `createPending` +
`updateStatus('complete', payload)` for backward compatibility. All methods
depend only on the `Queryable` port (TC-PURE-01, no framework imports).
Implements FR-TAILOR-04, FR-HISTORY-01, TC-PURE-01.

#### Scenario: createPending returns a stable id

- **WHEN** `createPending` is called with a valid userId and jobDescriptionId
- **THEN** a UUID is returned and a row with `status = 'pending'` exists for that id

#### Scenario: updateStatus complete upserts children atomically

- **WHEN** `updateStatus(id, 'complete', payload)` is called within a transaction
- **THEN** the row's status is `'complete'` and exactly the supplied checklist items
  and bullets exist as children; no partial child sets are possible

#### Scenario: save delegates to createPending + updateStatus

- **WHEN** `save` is called with a full `SaveTailoringInput`
- **THEN** the result is equivalent to calling `createPending` followed by
  `updateStatus('complete', payload)` in a transaction

### Requirement: Migration adds status column with lifecycle constraint

The database schema SHALL be extended with a non-nullable `status` column on
`tailorings` constrained to `('pending', 'complete', 'failed')`, defaulting to
`'pending'`. Existing rows SHALL be back-filled to `'complete'` in the same
migration (they were all persisted at completion). The migration is additive and
backward compatible; no row is deleted or restructured. Implements FR-TAILOR-04.

#### Scenario: Existing rows survive the migration

- **WHEN** migration `0005` runs against a database with existing `tailorings` rows
- **THEN** every pre-existing row has `status = 'complete'` and all child rows
  (checklist items, bullets) are intact

#### Scenario: Constraint rejects unknown status values

- **WHEN** an INSERT or UPDATE attempts to set `status` to a value not in
  `('pending', 'complete', 'failed')`
- **THEN** the database rejects the write with a constraint violation

### Requirement: Abandoned pending rows expire via TTL cleanup

The system SHALL provide a server-callable utility that marks `tailorings` rows
with `status = 'pending'` older than a configurable TTL (default 30 minutes) as
`status = 'failed'`. This prevents indefinite locks on free users' lifetime
budgets from browser-close or network-abandoned sessions. The utility SHALL depend
only on a `Queryable` port and SHALL be callable as a cron target or a one-off
maintenance invocation. Implements NFR-COST-02, FR-PAYWALL-01.

#### Scenario: Old pending rows are marked failed

- **WHEN** the cleanup utility runs with TTL = 30 minutes
- **THEN** every `tailorings` row with `status = 'pending'` and `created_at` older
  than 30 minutes before now is updated to `status = 'failed'`
- **AND** rows newer than the TTL are not touched

#### Scenario: Cleanup is safe to run concurrently

- **WHEN** the cleanup utility is called from two concurrent processes
- **THEN** no row is double-updated and no error is thrown (UPDATE WHERE is
  idempotent on already-failed rows)

### Requirement: History read path is open to all logged-in users

The `GET /api/tailoring` list and `GET /api/tailoring/[id]` detail routes SHALL
serve any authenticated user, removing the paid-only gate that existed in
`add-tailoring-history`. The list SHALL return only `status = 'complete'` rows,
newest first. Access is still owner-scoped: a request for a tailoring the caller
does not own SHALL return `404` (not `403`) so the existence of another user's
record is not disclosed (NFR-SEC-02). The export paywall (FR-PAYWALL-01) remains
unchanged and is enforced at the export step, not at history access. Implements
FR-HISTORY-01, FR-HISTORY-02, NFR-SEC-02.

#### Scenario: Free logged-in user lists their completed tailorings

- **WHEN** a free-tier logged-in user calls `GET /api/tailoring`
- **THEN** the response lists their own `complete` tailorings, newest first,
  with no paywall rejection

#### Scenario: History list excludes pending and failed rows

- **WHEN** a user has both complete and pending or failed tailorings
- **THEN** the list response contains only the complete rows

#### Scenario: Cross-user detail request returns 404

- **WHEN** an authenticated user requests the id of a tailoring owned by a
  different user
- **THEN** the response is `404` and reveals nothing about whether that id exists
  (NFR-SEC-02)
