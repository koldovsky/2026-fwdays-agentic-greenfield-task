# auth

## Purpose

Sign-in for the single configured HR account so every cabinet screen sits behind
authentication. A short-lived access token plus a rotating refresh token are delivered only in
`httpOnly`/`Secure`/`SameSite` cookies; the access token refreshes transparently; sign-out and
rotation invalidate the prior refresh token; unauthenticated cabinet requests redirect to
sign-in. Credentials live in the database (`HrUser`), pure token/credential logic is
framework-free and unit-tested, inbound data is Zod-validated, and only the JWT signing key
lives in env (FR-AUTH-01..05, NFR-SEC-01/-02, TC-PURE-01, TC-VALID-01).

## Requirements

### Requirement: Single configured HR account, no self-registration

The system SHALL support exactly one HR account in the MVP, whose credentials are stored in the
database (an `HrUser` record holding the email and a hashed password) and provisioned by an
administrator out-of-band, and SHALL NOT provide any self-registration, password-reset, or
additional-account flow. The plaintext password SHALL never be stored, logged, or shipped to the
client; only the stored hash is compared, using a constant-time check (FR-AUTH-02, NFR-SEC-02).

#### Scenario: Credentials come from the HrUser record, provisioned by an admin

- **WHEN** the system needs to authenticate the HR manager
- **THEN** it looks up the `HrUser` record by the submitted email and compares the submitted
  password against that record's stored password hash, with no self-registration or
  account-creation path exposed to users (the account is created by an administrator)

#### Scenario: Wrong credentials are rejected without enumeration

- **WHEN** a sign-in attempt has a wrong email or wrong password
- **THEN** sign-in fails with a single generic message that does not reveal which field was
  wrong, and no token or cookie is issued

### Requirement: Access + refresh tokens delivered only in httpOnly cookies

The system SHALL issue a short-lived access token and a longer-lived refresh token on successful
sign-in, and SHALL deliver both **only** in cookies marked `httpOnly`, `Secure`, and `SameSite`.
Neither token SHALL be readable by client-side JavaScript, placed in `localStorage`/`sessionStorage`,
or carried in a URL. The pure token logic (sign, verify, generate, hash) SHALL live in
framework-free `lib/` and be unit-tested (FR-AUTH-03, FR-AUTH-04, TC-PURE-01).

#### Scenario: Both tokens are set as httpOnly cookies on sign-in

- **WHEN** the HR manager signs in with valid credentials
- **THEN** the response sets an access-token cookie and a refresh-token cookie, both `httpOnly`,
  `Secure` (in production), and `SameSite`, and returns no token in the body, the URL, or any
  client-readable storage

#### Scenario: Tokens are not exposed to the client

- **WHEN** client-side JavaScript inspects `document.cookie`, `localStorage`, the URL, and the
  page source after sign-in
- **THEN** neither the access token nor the refresh token is present in any of them

#### Scenario: Token logic is pure and verifiable

- **WHEN** the access token is signed and then verified, and a tampered or expired token is verified
- **THEN** a valid token verifies to its payload while a tampered, wrong-key, or expired token is
  rejected, exercised by unit tests over framework-free `lib/` code with no `next/*`, `react`, or
  DOM imports

### Requirement: Transparent access-token refresh via the refresh token

The system SHALL refresh an expired access token transparently using a still-valid refresh token,
without requiring the HR manager to sign in again, and SHALL issue a new access token (and a
rotated refresh token) in the process (FR-AUTH-03).

#### Scenario: Expired access token is refreshed silently

- **WHEN** a cabinet request arrives with an expired access token but a valid, non-revoked refresh
  token
- **THEN** the system issues a fresh access token and a rotated refresh token, sets them as cookies,
  and delivers the requested cabinet page without an explicit sign-in step

#### Scenario: Refresh without a valid refresh token fails to sign-in

- **WHEN** a cabinet request has no valid access token and no live refresh token
- **THEN** the system does not issue new tokens and redirects to the sign-in page

### Requirement: Sign-out and rotation invalidate the prior refresh token

The system SHALL maintain server-side state for issued refresh tokens (storing only a hash of each)
so that a prior refresh token can be invalidated. On sign-out and on every refresh-token rotation,
the system SHALL invalidate the prior refresh token so it cannot be reused; a presented refresh
token that is revoked, rotated-away, or expired SHALL be rejected and the session cleared
(FR-AUTH-05).

#### Scenario: Rotation kills the old refresh token

- **WHEN** a refresh token is used and a new one is issued, and then the old refresh token is
  presented again
- **THEN** the old token is rejected as revoked and the session is cleared (redirect to sign-in),
  with no new tokens issued

#### Scenario: Sign-out revokes the current session

- **WHEN** the HR manager signs out
- **THEN** the current refresh token is marked revoked server-side and both cookies are cleared, so
  the refresh token cannot mint further access tokens

#### Scenario: Only a hash of the refresh token is stored

- **WHEN** the refresh-token store is read
- **THEN** it holds a one-way hash of each refresh token (never the raw token), an expiry, and a
  revocation flag

### Requirement: Cabinet routes require authentication

The system SHALL require a valid session before serving any cabinet screen, and SHALL redirect an
unauthenticated cabinet request to the sign-in page, preserving the originally requested path so
the user returns there after signing in. Redirect targets SHALL be validated as same-origin
relative paths to prevent open redirects (FR-AUTH-01, NFR-SEC-01).

#### Scenario: Unauthenticated cabinet request redirects to sign-in

- **WHEN** a request without a valid (or refreshable) session targets a cabinet route
- **THEN** the system redirects to the sign-in page carrying the intended path as `next`, and does
  not render the cabinet screen

#### Scenario: Public and respondent routes are not guarded

- **WHEN** the sign-in page, the auth API endpoints, or a `/respond/[token]` route is requested
- **THEN** the auth guard does not redirect them to sign-in

#### Scenario: Redirect target cannot be hijacked

- **WHEN** a `next` parameter contains an absolute URL, a scheme, or a protocol-relative `//host`
- **THEN** the system ignores it and falls back to the default cabinet path

### Requirement: Minimal sign-in page styled with the Kolo360 tokens

The system SHALL present a minimal sign-in page styled with the Kolo360 design tokens, with the
email and password fields, Ukrainian-first strings, and explicit empty, loading, and error states.
Inputs SHALL be validated with Zod at the server boundary (FR-AUTH-04, FR-SHELL-03, TC-VALID-01,
NFR-I18N-01).

#### Scenario: Sign-in form renders with token styling and a11y

- **WHEN** the sign-in page is loaded while unauthenticated
- **THEN** it shows the Kolo360-styled form (wordmark, email + password, submit) with Ukrainian
  labels, accessible names, and a visible accent focus ring

#### Scenario: Submit shows loading then error or success

- **WHEN** the form is submitted
- **THEN** it shows a loading state while the request is in flight, an inline generic error on
  invalid credentials, and on success redirects to the requested cabinet path

#### Scenario: Sign-in input is validated at the boundary

- **WHEN** the sign-in action receives the submitted form data
- **THEN** it parses the email and password with a Zod schema before any credential check, and the
  TypeScript type is inferred from that schema
