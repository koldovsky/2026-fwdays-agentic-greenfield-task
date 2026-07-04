## ADDED Requirements

### Requirement: PII redaction before events leave the process
The system SHALL scrub every outbound Sentry event and transaction so that no CV
or job-description plaintext, and no user-identifying metadata, is transmitted to
the third-party ingest endpoint: request bodies, event message, exception
values, breadcrumb data, and `extra`/`contexts` SHALL be redacted, and any user
identity (`event.user`, user-id fields) SHALL be stripped. Redaction SHALL be a
framework-free `shared/lib` module so it is unit-testable without a browser or
network.
Implements NFR-SEC-01, NFR-SEC-02, BC-PRIVACY-02.

#### Scenario: CV or JD plaintext is scrubbed
- **WHEN** an event carries a request body or field containing CV or job-description text (e.g. from `POST /api/tailor`, `/api/tailor/analyze`, `/api/tailor/generate`, `/api/cv/parse`)
- **THEN** the transmitted event contains none of that plaintext

#### Scenario: User ID is stripped
- **WHEN** an event carries `event.user` or a user-id field
- **THEN** the transmitted event contains no user identifier or identifying metadata

#### Scenario: Transactions are scrubbed too
- **WHEN** a transaction/span payload is sent via `beforeSendTransaction`
- **THEN** it is scrubbed of CV/JD plaintext and user identity by the same code path

### Requirement: Redaction fails open, never drops an event
The system SHALL treat redaction as fail-open: if scrubbing an event throws, the
event SHALL still be sent with a coarse redaction-failed placeholder body rather
than returned as `null`, so no error report is silently lost. The redaction hook
SHALL NOT return `null` for any input.
Implements NFR-OBS-01.

#### Scenario: Scrub path throws
- **WHEN** the redaction routine throws while processing an event
- **THEN** an event is still returned (never `null`) with a coarse redaction-failed placeholder and no original plaintext, so the error is not silently dropped

### Requirement: No PII collected by default
The system SHALL configure all Sentry runtimes (server, edge, client) with
`sendDefaultPii: false` and SHALL NOT rely on commented-out `dataCollection`
opt-outs; the redaction hook, not a comment, is the enforcement point. Default
attachment of request bodies and user context SHALL be off.
Implements NFR-SEC-02, BC-PRIVACY-02.

#### Scenario: Default PII collection disabled in every runtime
- **WHEN** any of the server, edge, or client Sentry configs initializes
- **THEN** `sendDefaultPii` is `false` and no default request-body or user-context attachment occurs

### Requirement: DSN and sample rates come from environment
The system SHALL source the Sentry DSN and trace sample rate from environment
via lazy accessors in `src/shared/config/env.ts` (matching the existing
throw-or-default pattern) with no DSN literal in source. When the DSN is unset,
telemetry SHALL be silently disabled rather than error. The production
`tracesSampleRate` SHALL be less than 1.0; full-rate tracing is permitted only
outside production.
Implements NFR-SEC-02, NFR-OBS-02.

#### Scenario: No hardcoded DSN
- **WHEN** the Sentry configs initialize
- **THEN** the DSN is read from environment (not a literal), and an unset DSN disables telemetry without throwing

#### Scenario: Production trace sampling is capped
- **WHEN** the app runs in production
- **THEN** `tracesSampleRate` is a value less than 1.0 sourced from environment

### Requirement: Error telemetry is a documented tracker exception
The system SHALL document the observability posture — what Sentry receives, what
is scrubbed, and that this is bug/error telemetry only (no analytics, no
fingerprinting, no third-party tracker on any page) — so error reporting is an
explicit, reviewable exception to the no-tracker rule rather than an unstated
default.
Implements BC-PRIVACY-01, BC-PRIVACY-02.

#### Scenario: Posture is documented
- **WHEN** a reviewer audits privacy against BC-PRIVACY-01
- **THEN** an in-repo note describes exactly what Sentry receives and what is scrubbed, and confirms no analytics/fingerprinting is added
