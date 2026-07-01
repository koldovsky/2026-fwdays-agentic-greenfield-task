## ADDED Requirements

### Requirement: Email and password sign-up

The system SHALL let a person create an account with an email and a password. The
password MUST be validated against a minimum-strength policy by a shared, framework-free
validator, and the email MUST be unique. (FR-AUTH-01)

#### Scenario: Successful sign-up

- **WHEN** a new email and a password meeting the strength policy are submitted to sign-up
- **THEN** an account is created for that email
- **AND** the response issues an access token and a refresh token for the new session

#### Scenario: Weak password rejected

- **WHEN** a password that fails the minimum-strength policy is submitted to sign-up
- **THEN** the request is rejected with a validation error
- **AND** no account is created

#### Scenario: Duplicate email rejected

- **WHEN** sign-up is attempted with an email that already has an account
- **THEN** the request is rejected
- **AND** no second account is created for that email

### Requirement: Email and password sign-in

The system SHALL authenticate a user by email and password and, on success, issue a
short-lived access JWT and a rotating refresh token. Invalid credentials MUST be rejected
without revealing which factor was wrong. (FR-AUTH-02, TC-STACK-04)

#### Scenario: Valid credentials issue tokens

- **WHEN** a correct email and password are submitted to sign-in
- **THEN** the response contains a short-lived access JWT and a refresh token

#### Scenario: Invalid credentials rejected

- **WHEN** an unknown email or a wrong password is submitted to sign-in
- **THEN** the request is rejected with an authentication error and no tokens are issued
- **AND** the error does not disclose whether the email exists

### Requirement: Google sign-in provisions and returns an account

The system SHALL let a user sign in with Google using OAuth 2.0 with PKCE. The first
Google sign-in for an email SHALL provision an account; subsequent sign-ins SHALL return
the same account. The API key/secret MUST stay server-side. (FR-AUTH-03, TC-STACK-04)

#### Scenario: First Google sign-in provisions an account

- **WHEN** a user completes Google sign-in with an email that has no account
- **THEN** an account is provisioned for that email with Google as a provider
- **AND** the response issues an access token and a refresh token

#### Scenario: Returning Google sign-in reuses the account

- **WHEN** a user completes Google sign-in with an email that already has a Google-linked account
- **THEN** the existing account is returned rather than a new one being created

### Requirement: One account per verified email across providers

A verified email used with both password and Google SHALL resolve to a single account,
never two. (FR-AUTH-04)

#### Scenario: Google sign-in links to an existing password account

- **WHEN** a user who signed up with email + password later signs in with Google using the same verified email
- **THEN** the Google identity is linked to the existing account
- **AND** no duplicate account is created

### Requirement: Refresh tokens rotate and reuse is rejected

Each use of a refresh token SHALL issue a new access + refresh pair and invalidate the
presented refresh token. Presenting an already-used (rotated) refresh token MUST be
rejected. (NFR-SEC-01, TC-STACK-04)

#### Scenario: Refresh rotates the pair

- **WHEN** a valid, unused refresh token is presented to the refresh endpoint
- **THEN** a new access token and a new refresh token are issued
- **AND** the presented refresh token is invalidated

#### Scenario: Reused refresh token is rejected

- **WHEN** a refresh token that has already been rotated is presented again
- **THEN** the request is rejected and no tokens are issued

### Requirement: Sign-out revokes the refresh token

Signing out SHALL revoke the user's refresh token server-side so it can no longer mint
access tokens. (FR-AUTH-05)

#### Scenario: Refresh no longer works after sign-out

- **WHEN** a user signs out and then presents that session's refresh token to the refresh endpoint
- **THEN** the request is rejected because the token was revoked

### Requirement: Protected endpoints require a valid access token

Requests to protected endpoints without a valid access token SHALL be rejected with HTTP
401, and the client SHALL route back to the auth screen. (FR-AUTH-06)

#### Scenario: Missing or invalid token returns 401

- **WHEN** a request to a protected endpoint is made without a token or with an invalid/expired one
- **THEN** the API responds with 401 Unauthorized

#### Scenario: Client redirects to auth on 401

- **WHEN** the mobile app receives a 401 from a protected endpoint and cannot refresh the session
- **THEN** the app clears the session and routes to the auth screen

### Requirement: Passwords are hashed, never stored or returned in plaintext

Passwords SHALL be hashed with argon2 (or bcrypt) before storage; plaintext passwords MUST
never be persisted or returned by the API. (NFR-SEC-01)

#### Scenario: Stored credential is a hash

- **WHEN** an account is created or its password changed
- **THEN** only a salted argon2 hash is stored, never the plaintext password

#### Scenario: API never returns a password

- **WHEN** any auth or user endpoint returns account data
- **THEN** no password or password hash appears in the response
