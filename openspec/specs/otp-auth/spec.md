# otp-auth Specification

## Purpose

Passwordless authentication for the single "user" role (FR-AUTH-01…04,
NFR-SEC-01/02, TC-AUTH-01, ADR-0004): registration and login by phone via a
6-digit SMS OTP with server-side TTL/attempt/rate limits, a durable
server-side session in an httpOnly cookie with explicit logout, a global
auth guard protecting every non-public API endpoint, a minimal profile
(optional name), and TurboSMS delivery with a mandatory dev fallback.

## Requirements

### Requirement: OTP can be requested for a normalized phone number

The API SHALL expose an endpoint that requests an OTP for a phone number
(FR-AUTH-01). The phone SHALL be validated and normalized to `+380…` format;
invalid numbers SHALL be rejected with a clear validation error. On success
the system SHALL generate a 6-digit code with TTL ≤ 5 minutes (FR-AUTH-02),
store only its hash (NFR-SEC-01), and hand it to the SMS delivery layer.
Requesting a new code SHALL invalidate any previous active code for that
phone (the code is single-use and only the latest one is valid).

#### Scenario: Valid phone receives a code

- **WHEN** an OTP is requested for a valid Ukrainian phone number
- **THEN** the response is success, and a 6-digit code with TTL ≤ 5 minutes exists for the normalized `+380…` phone, stored as a hash only

#### Scenario: Invalid phone is rejected

- **WHEN** an OTP is requested for a malformed phone number
- **THEN** the response is a `400`-style validation error and no code is created or sent

#### Scenario: New request supersedes the previous code

- **WHEN** a second OTP is requested for the same phone (after the 60s window) and the first code is then submitted
- **THEN** the first code is rejected as invalid; only the latest code can verify

### Requirement: OTP sending is rate-limited server-side

The backend SHALL enforce OTP send limits regardless of UI behavior
(FR-AUTH-03, NFR-SEC-02): at most 1 SMS per phone per 60 seconds and at most
5 SMS per phone per 24 hours. Exceeding a limit SHALL return an
understandable error to the user and SHALL NOT send an SMS.

#### Scenario: Second request within 60 seconds is refused

- **WHEN** an OTP is requested for a phone that already received a code less than 60 seconds ago
- **THEN** the response is a rate-limit error with a human-readable Ukrainian message and no SMS is sent

#### Scenario: Sixth request within 24 hours is refused

- **WHEN** a phone has already been sent 5 codes within the last 24 hours and another OTP is requested
- **THEN** the response is a rate-limit error and no SMS is sent

### Requirement: OTP verification logs the user in and creates the account on first login

The API SHALL expose an endpoint that verifies a phone + code pair
(FR-AUTH-01). A correct, unexpired, unused code SHALL log the user in: the
first successful login for a phone SHALL create the account (`user` row with
the normalized phone); subsequent logins SHALL reuse the existing account.
A used or expired code SHALL never verify (FR-AUTH-02).

#### Scenario: First login creates an account

- **WHEN** a phone that has no account verifies a correct code
- **THEN** a `user` record is created for the normalized phone and the response establishes an authenticated session

#### Scenario: Repeat login reuses the account

- **WHEN** a phone with an existing account verifies a correct code
- **THEN** no new `user` record is created and the session belongs to the existing account

#### Scenario: Expired code is rejected

- **WHEN** a correct code is submitted after its TTL has passed
- **THEN** verification fails with a clear error and no session is created

#### Scenario: Code cannot be reused

- **WHEN** a code that already verified successfully is submitted again
- **THEN** verification fails and no new session is created

### Requirement: Failed verification attempts are limited

The system SHALL allow at most 5 failed verification attempts per code
(FR-AUTH-02, enforced server-side per NFR-SEC-02). After the 5th failed
attempt the code SHALL be invalidated; further attempts — including with the
correct code — SHALL fail with an error telling the user to request a new
code.

#### Scenario: Wrong code increments attempts but code stays valid

- **WHEN** a wrong code is submitted fewer than 5 times and then the correct code is submitted
- **THEN** the correct submission succeeds

#### Scenario: Fifth failed attempt invalidates the code

- **WHEN** a wrong code is submitted for the 5th time and the correct code is submitted afterwards
- **THEN** the correct submission fails with an error indicating a new code must be requested

### Requirement: Session is a durable httpOnly cookie with explicit logout

A successful verification SHALL establish a server-side session referenced by
an opaque token in an `httpOnly` + `Secure` + `SameSite=Lax` cookie
(NFR-SEC-01; `Secure` applies where the origin is HTTPS, i.e. production).
The session SHALL last at least 30 days or until explicit logout
(FR-AUTH-04). The API SHALL expose a logout endpoint that invalidates the
server-side session and clears the cookie.

#### Scenario: Session survives a return visit

- **WHEN** an authenticated user returns the next day with the same cookie
- **THEN** requests are authenticated without a new OTP

#### Scenario: Logout ends the session

- **WHEN** the user calls logout and then retries an authenticated request with the old cookie
- **THEN** the retried request is rejected as unauthenticated

#### Scenario: Cookie attributes protect the token

- **WHEN** the session cookie is set in production
- **THEN** it carries `httpOnly`, `Secure`, and `SameSite=Lax` attributes

### Requirement: All non-public API endpoints require an authenticated session

Every `/api` endpoint SHALL require a valid session, except an explicit
public allowlist: the health endpoint and the OTP request/verify endpoints.
Requests without a valid session SHALL receive `401` with a JSON error body.
This guard is the foundation for owner-scoped access in later slices
(FR-ACCESS-01).

#### Scenario: Protected endpoint without session

- **WHEN** a request without a valid session cookie hits a protected endpoint
- **THEN** the response is `401` with a JSON error body

#### Scenario: Health stays public

- **WHEN** `GET /api/health` is requested without any cookie
- **THEN** the response is the normal health payload, not `401`

### Requirement: Current user profile with optional name

The API SHALL expose the current user (id, phone, optional name) to the SPA
and SHALL allow updating the optional profile name (PRD §4: name is an
optional profile field). The web app SHALL show a minimal profile with a
logout action.

#### Scenario: Authenticated user fetches profile

- **WHEN** an authenticated user requests the current-user endpoint
- **THEN** the response contains their id, normalized phone, and name (or null)

#### Scenario: User sets their name

- **WHEN** an authenticated user updates the profile name
- **THEN** the new name is persisted and returned on subsequent profile fetches

### Requirement: Login screen drives the phone → code flow

The SPA SHALL provide a login screen (Ukrainian UI): step 1 — phone input
with validation; step 2 — code input with a way to request a new code.
Rate-limit and attempt-limit errors from the API SHALL be shown as
understandable messages (FR-AUTH-03). Unauthenticated visitors of protected
routes SHALL be redirected to the login screen; after login the user lands in
the app. An already-authenticated user opening `/login` SHALL be redirected
to the home page instead of seeing the login form (S-02 review follow-up,
accepted 2026-07-08).

#### Scenario: Successful login via UI

- **WHEN** a user enters a valid phone, requests a code, and enters the correct code (from the dev log in local mode)
- **THEN** they are authenticated and see the app with their profile available

#### Scenario: Rate-limit error is understandable

- **WHEN** the user requests a code again within 60 seconds from the UI
- **THEN** the screen shows a human-readable Ukrainian message about the limit instead of a raw error

#### Scenario: Unauthenticated visitor is redirected to login

- **WHEN** an unauthenticated visitor opens a protected route
- **THEN** the SPA redirects them to the login screen

#### Scenario: Authenticated visitor is redirected away from login

- **WHEN** an authenticated user navigates to `/login`
- **THEN** the SPA redirects them to the home page without showing the phone/code form

### Requirement: SMS delivery goes through TurboSMS with a mandatory dev fallback

SMS delivery SHALL be isolated behind an `SmsSender` abstraction (ADR-0004,
TC-AUTH-01): in production it SHALL send via TurboSMS; outside production
(env switch) it SHALL NOT send SMS — the code is written to the application
log (and may be exposed in the dev-mode response) so e2e tests and local dev
cost nothing. Production SHALL refuse to start without a TurboSMS credential.

#### Scenario: Dev mode does not send SMS

- **WHEN** an OTP is requested while the app runs in dev mode
- **THEN** no external SMS call is made and the code is available from the application log

#### Scenario: Production without TurboSMS credential fails fast

- **WHEN** the app starts in production mode without the TurboSMS credential configured
- **THEN** startup aborts with a clear configuration error

### Requirement: Phones and codes never appear in logs in plain text

Application logs SHALL NOT contain OTP codes in plain text alongside
identifiable context, and SHALL NOT log full phone numbers in plain text
(NFR-SEC-01); the dev-mode code log line is the explicit, non-production
exception (ADR-0004). Stored codes SHALL be hashes only.

#### Scenario: Production logs are clean

- **WHEN** the OTP request/verify flow runs in production mode and logs are inspected
- **THEN** no plain-text OTP codes or full phone numbers appear in the log output

#### Scenario: Codes are stored hashed

- **WHEN** the `otp_code` table is inspected after a code is issued
- **THEN** only a hash of the code is stored, never the plain code
