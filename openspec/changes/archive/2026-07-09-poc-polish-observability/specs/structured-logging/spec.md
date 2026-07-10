# structured-logging

Structured, PII-free API logging: request logs, error logs, OTP send events.
Implements **NFR-OBS-01** (logs part; the health part lives in
`app-skeleton`) under the log-content constraints of **NFR-SEC-01**.

## ADDED Requirements

### Requirement: Every API request is logged as a structured entry

The API SHALL log one structured entry per handled `/api/*` request,
containing at least the HTTP method, the request path without the query
string, the response status code, and the request duration in milliseconds
(NFR-OBS-01). Requests for SPA static assets SHALL NOT produce request log
entries. In production (`NODE_ENV=production`) log entries SHALL be
single-line JSON; in development the human-readable format is kept.

#### Scenario: Successful request produces one log line

- **WHEN** a client calls `GET /api/tickets` and receives a 200 response
- **THEN** exactly one request log entry is emitted with method `GET`, path
  `/api/tickets`, status `200`, and a non-negative duration

#### Scenario: Rejected and missing requests are still logged

- **WHEN** an unauthenticated client calls a guarded endpoint (401) or any
  client calls a non-existent `/api/*` route (404)
- **THEN** a request log entry with the actual response status is emitted
  (guard rejections and route misses are not invisible)

#### Scenario: Query string never reaches the log

- **WHEN** a client calls `GET /api/tickets?q=Іваненко`
- **THEN** the request log entry contains the path `/api/tickets` and no part
  of the query string (search text may contain personal names, FR-LIST-03)

#### Scenario: SPA asset requests are not logged

- **WHEN** a browser loads `/` or a static asset served by the SPA fallback
- **THEN** no request log entry is emitted for it

### Requirement: Server errors are logged with stack traces

The API SHALL log every unhandled error (5xx outcome) as a structured
error-level entry that includes the error message and stack trace
(NFR-OBS-01). The error entry is in addition to the request log entry for the
failed request.

#### Scenario: Unhandled exception is captured

- **WHEN** a request handler throws an unexpected (non-`HttpException`) error
- **THEN** the client receives a 500 response and a structured error-level
  log entry with the stack trace is emitted

### Requirement: Logs are free of PII and secrets

Log entries SHALL NOT contain full phone numbers, OTP codes, session or
cookie token values, request/response bodies, or user-entered free text
(NFR-SEC-01, NFR-OBS-01). Phone numbers appear only masked. Exception fixed
by ADR-0004: the dev SMS sender logs the full phone and the OTP code as the
designed non-production fallback (its whole purpose is showing the developer
which code went to which number) and SHALL remain unselectable when
`NODE_ENV=production`.

#### Scenario: OTP send is logged without phone or code

- **WHEN** an OTP SMS is sent (or fails to send) in `turbosms` mode
- **THEN** the emitted log entries contain at most a masked phone and never
  the OTP code

#### Scenario: Login request leaves no PII in request logs

- **WHEN** a client calls `POST /api/auth/request-otp` with a phone in the
  body
- **THEN** the request log entry contains only method, path, status and
  duration — no body fields

### Requirement: OTP send outcomes are observable in logs

The API SHALL log each OTP SMS send attempt outcome (success or failure,
with provider error details on failure) as a structured entry with at most a
masked phone (NFR-OBS-01). The failure logging fixes behavior shipped in
S-02 as a spec-level requirement; success logging is added by this slice.

#### Scenario: Successful send is logged with a masked phone

- **WHEN** TurboSMS accepts an OTP SMS send
- **THEN** a log entry is emitted containing at most the masked phone and
  never the OTP code

#### Scenario: Failed provider send is diagnosable

- **WHEN** TurboSMS rejects a send (HTTP or response-code failure)
- **THEN** an error-level entry is emitted with the HTTP status and provider
  response code, and the phone appears only masked
