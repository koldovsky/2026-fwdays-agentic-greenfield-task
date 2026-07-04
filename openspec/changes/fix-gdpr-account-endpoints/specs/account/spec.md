## ADDED Requirements

### Requirement: GDPR data export
The system SHALL let a signed-in user export everything stored for them (user
record, CV profiles including decrypted CV text as the subject's own data, and
tailoring history) as a single JSON-serializable download. An anonymous caller
SHALL receive 401 and a caller whose user row no longer exists SHALL receive 404.
Implements NFR-GDPR-01, BC-PRIVACY-02.

#### Scenario: Signed-in user exports their data
- **WHEN** a signed-in user requests `GET /api/account/export`
- **THEN** the response is 200 with a JSON body of their data and a `Content-Disposition: attachment; filename="vouch-export.json"` header

#### Scenario: Anonymous caller is rejected
- **WHEN** an anonymous caller requests the export
- **THEN** the response is 401 and no data is assembled

#### Scenario: User row absent
- **WHEN** the session resolves to a user id that no longer has a row
- **THEN** the response is 404

### Requirement: GDPR account deletion
The system SHALL let a signed-in user permanently delete their account; the
deletion SHALL cascade to every child record (CV profiles, job descriptions,
tailorings, checklist items, bullets, credentials, OAuth accounts, subscription,
usage counters) via `ON DELETE CASCADE`, well within the 24-hour bound, and the
session cookie SHALL be cleared in the same response. An anonymous caller SHALL
receive 401. Implements NFR-GDPR-02, FR-CV-05.

#### Scenario: Signed-in user deletes their account
- **WHEN** a signed-in user requests `DELETE /api/account`
- **THEN** the user row and all child records are deleted, the response is 200, and both the plain and secure-prefixed Auth.js session cookies are cleared

#### Scenario: Anonymous caller is rejected
- **WHEN** an anonymous caller requests the deletion
- **THEN** the response is 401 and nothing is deleted

### Requirement: Calm coded error contract
Both GDPR account endpoints SHALL degrade any downstream failure (unconfigured
environment, database or foreign-key error, encryption-key failure, serialization
error) into a calm coded JSON error with status 500 — never an uncaught raw 500.
The response body SHALL contain only a stable machine code
(`deletion_failed` / `export_failed`) with no stack trace, error message, schema
detail, or key material. The cause SHALL be logged server-side only, with no user
id, CV text, or key material in the log line. Implements NFR-OBS-01, NFR-SEC-01,
NFR-SEC-02.

#### Scenario: Downstream throw on delete
- **WHEN** the delete service throws (e.g. a database or constraint error)
- **THEN** the response is 500 with body `{ "error": "deletion_failed" }` and no internal detail leaks to the caller

#### Scenario: Unset encryption key on export
- **WHEN** `CV_ENCRYPTION_KEY` is unset and the export path calls `getCvEncryptionKey()`
- **THEN** the response is 500 with body `{ "error": "export_failed" }` and the missing-key detail never reaches the caller
