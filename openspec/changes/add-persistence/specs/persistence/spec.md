## ADDED Requirements

### Requirement: Postgres schema and data layer
The system SHALL persist users, CV profiles, job descriptions, tailorings,
checklist items, bullets, subscriptions, and usage counters in PostgreSQL,
accessed through a typed repository layer that maps rows to the existing entity
pure models. Schema changes SHALL be applied via versioned migrations. Implements
TC-STACK-05.

#### Scenario: Entities round-trip through the store
- **WHEN** a tailoring with its checklist items and bullets is saved and later loaded by id
- **THEN** the loaded aggregate equals what was saved, mapped back into the entity pure models

#### Scenario: Schema applied by migration
- **WHEN** migrations run against an empty database
- **THEN** all MVP tables and their foreign keys exist and the app connects successfully

### Requirement: CV text encrypted at rest
The system SHALL store CV text (and other PII columns) encrypted at rest and SHALL
NOT write CV plaintext to logs. Implements NFR-SEC-01, BC-PRIVACY-02.

#### Scenario: Stored CV is ciphertext
- **WHEN** a CV profile is saved
- **THEN** the CV text column holds ciphertext, decryptable only with the app key, and no log line contains the plaintext

### Requirement: Persisted CV profiles reused across tailorings
The system SHALL store a signed-in user's parsed CV profile against their account
and reuse it across subsequent tailorings without re-upload. Deleting a CV profile
SHALL cascade-delete all tailorings derived from it. Implements FR-CV-04, FR-CV-05.

#### Scenario: Profile reused
- **WHEN** a signed-in user who already has a stored CV profile starts a new tailoring
- **THEN** the stored profile is used without requiring re-upload

#### Scenario: Delete cascades
- **WHEN** the user deletes their stored CV profile
- **THEN** the profile and every tailoring derived from it are permanently removed

### Requirement: Tailoring history persisted
The system SHALL persist each tailoring (job title from the JD, match score, date)
for signed-in paid users and let them re-open a past tailoring in read/edit mode.
Free users SHALL see only the current session result. Implements FR-TAILOR-04,
FR-HISTORY-01, FR-HISTORY-02.

#### Scenario: Paid user sees history
- **WHEN** a signed-in paid user opens their history
- **THEN** past tailorings are listed with date, extracted job title, and match score, and selecting one re-opens the result view

#### Scenario: Free user has no persisted history
- **WHEN** a free user completes a tailoring and reloads later
- **THEN** no prior tailoring is listed; only the current session result is available

### Requirement: GDPR export and deletion
The system SHALL let a user export all their stored data (CV profile + tailoring
history) as JSON, and permanently delete their account and all associated data
with deletion propagating within 24 hours. Implements NFR-GDPR-01, NFR-GDPR-02.

#### Scenario: Export as JSON
- **WHEN** a signed-in user requests a data export
- **THEN** they receive a JSON document containing their CV profile and tailoring history

#### Scenario: Account deletion propagates
- **WHEN** a signed-in user requests account deletion
- **THEN** the account and all associated rows are permanently removed, propagating within 24 hours, with nothing recoverable afterward
