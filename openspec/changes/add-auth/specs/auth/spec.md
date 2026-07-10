## ADDED Requirements

### Requirement: Email and password sign-up and sign-in
The system SHALL let a user create an account with email + password and later
sign in with the same credentials. Passwords SHALL be stored only as a salted
hash, never in plaintext or in logs. On invalid credentials the system SHALL
return a calm Ukrainian error and SHALL NOT reveal whether the email exists.
Implements FR-AUTH-01, NFR-SEC-01.

#### Scenario: Successful sign-up then sign-in
- **WHEN** a visitor submits a valid email and password to sign up, then signs in with the same credentials
- **THEN** an account is created with a hashed password and an authenticated session is established

#### Scenario: Invalid credentials
- **WHEN** a user submits a wrong password or an unknown email
- **THEN** sign-in fails with a calm generic message that does not disclose whether the email is registered

### Requirement: Google OAuth sign-in
The system SHALL let a user sign in with Google OAuth. A Google identity that
matches an existing account by verified email SHALL link to it rather than
creating a duplicate. Implements FR-AUTH-02, TC-STACK-07.

#### Scenario: First Google sign-in creates account
- **WHEN** a new user completes the Google OAuth flow
- **THEN** an account is created from the verified Google profile and an authenticated session is established

#### Scenario: Google links to existing email
- **WHEN** a user with an existing email+password account signs in with Google using the same verified email
- **THEN** the Google identity is linked to the existing account, not duplicated

### Requirement: Password reset via email link
The system SHALL provide a password-reset flow: a user requests reset by email,
receives a single-use time-limited link, and sets a new password. Requesting
reset SHALL return the same response whether or not the email exists. Implements
FR-AUTH-03.

#### Scenario: Reset completes
- **WHEN** a user requests a reset and follows the emailed single-use link within its validity window
- **THEN** they can set a new password and the link cannot be reused

#### Scenario: Unknown email does not leak
- **WHEN** a reset is requested for an unregistered email
- **THEN** the response is identical to the registered case and no account information is disclosed

### Requirement: Session and sign-out
The system SHALL expose a server-side helper that resolves the current user in
route handlers, server actions, and views, and SHALL let a user sign out to
destroy the session. User IDs and account metadata SHALL NOT be included in LLM
request payloads. Implements FR-AUTH-01, NFR-SEC-02.

#### Scenario: Current user resolves server-side
- **WHEN** a signed-in user requests a protected route
- **THEN** the server resolves their identity from the session without exposing the user ID to any LLM call

#### Scenario: Sign-out clears session
- **WHEN** a signed-in user signs out
- **THEN** the session is destroyed and subsequent requests are treated as anonymous

### Requirement: Anonymous access preserved
The system SHALL allow a signed-out visitor to complete one full tailoring
without authenticating; sign-in SHALL only be required at the export/paywall
boundary. Implements FR-ONBOARD-01.

#### Scenario: Anonymous reaches result without auth
- **WHEN** a signed-out visitor uploads a CV and runs one tailoring
- **THEN** they reach the result view without signing in, and sign-in is prompted only at export
