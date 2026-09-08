## ADDED Requirements

Requirement text is authoritative in [`docs/requirements.md`](../../../../docs/requirements.md);
each requirement below cites its stable FR/NFR id and restates the behavior in SHALL form as the
OpenSpec contract. Scenarios map one-to-one to the acceptance tests in
[`backend/tests/test_auth.py`](../../../../backend/tests/test_auth.py).

### Requirement: Email and password registration (FR-AUTH-01)
The system SHALL register a new account from an email and password when the email is not already
registered, and SHALL reject a registration whose email is already registered (case-insensitive).

#### Scenario: New email is registered
- **GIVEN** no account exists for `user@example.com`
- **WHEN** the client POSTs `/api/auth/register` with that email and a password
- **THEN** the system creates a `users` row and responds `201`

#### Scenario: Duplicate email is rejected
- **GIVEN** an account already exists for `user@example.com`
- **WHEN** the client POSTs `/api/auth/register` with `USER@example.com`, differing only in case
- **THEN** the system responds `409` and creates no second account, because `email` is `CITEXT` and uniquely constrained

### Requirement: Email and password login (FR-AUTH-02)
The system SHALL authenticate a user and establish a server-side session when a submitted email and
password match a stored credential, and SHALL reject the attempt otherwise.

#### Scenario: Valid credentials establish a session
- **GIVEN** a registered account
- **WHEN** the client POSTs `/api/auth/login` with the correct email and password
- **THEN** the system inserts a `user_sessions` row, sets an `HttpOnly; SameSite=None` session cookie carrying the opaque token, and issues a CSRF token

#### Scenario: Wrong password is rejected
- **GIVEN** a registered account
- **WHEN** the client POSTs `/api/auth/login` with the wrong password
- **THEN** the system responds `401` and sets no session cookie

### Requirement: Logout ends the session (FR-AUTH-03)
The system SHALL log the user out, ending the authenticated session.

#### Scenario: Logout clears the session
- **GIVEN** an authenticated session
- **WHEN** the client POSTs `/api/auth/logout`
- **THEN** the system deletes the `user_sessions` row, clears the cookie, and the old cookie no longer authorizes any protected request

### Requirement: Protected resources require a valid session (FR-AUTH-06)
The system SHALL reject any request to a protected resource that lacks a valid authenticated
session, and SHALL return the current user for a valid session.

#### Scenario: Missing or invalid session is rejected
- **GIVEN** no valid session cookie (absent, expired, or invalid)
- **WHEN** the client GETs `/api/auth/me`
- **THEN** the system responds `401`

#### Scenario: Valid session returns the current user
- **GIVEN** an authenticated session for a user
- **WHEN** the client GETs `/api/auth/me`
- **THEN** the system responds `200` with that user's `id`, `email`, `timezone`, and `coach_language`

### Requirement: Per-user data isolation (FR-AUTH-07)
The system SHALL isolate data per user so that an authenticated user can read and write only their
own data, never another user's.

#### Scenario: Each user sees only their own account
- **GIVEN** active sessions for user A and user B
- **WHEN** each session GETs `/api/auth/me`
- **THEN** each response contains only the calling user's account and never the other user's data

### Requirement: Passwords are stored hashed (NFR-SEC-01)
The system SHALL persist passwords only as salted bcrypt hashes (cost factor 12), never as plaintext
or reversibly encrypted values.

#### Scenario: Stored password is a bcrypt hash
- **GIVEN** a newly registered account
- **WHEN** the stored `users.password_hash` is inspected
- **THEN** it is a bcrypt hash (`$2b$...`) and the plaintext appears nowhere in the row or logs

### Requirement: Session cookies use protective attributes and CSRF (NFR-SEC-02)
The system SHALL authenticate using session cookies (not URL-embedded tokens) that carry standard
protective attributes, and SHALL require a CSRF double-submit token on every mutating request.

#### Scenario: Session cookie carries protective attributes
- **GIVEN** a successful login
- **WHEN** the response `Set-Cookie` header is inspected
- **THEN** the session cookie is `HttpOnly`, `SameSite=None`, `Path=/`, with an env-driven `Secure` flag, and carries the opaque 256-bit token rather than a URL-embedded token

#### Scenario: Mutating request without a CSRF header is rejected
- **GIVEN** an authenticated session
- **WHEN** the client sends a mutating request without the CSRF double-submit header
- **THEN** the system rejects the request

### Requirement: Per-user isolation is enforced server-side (NFR-SEC-03)
The system SHALL enforce per-user isolation server-side, scoping every data query to the
authenticated user via the user_id-scoped repository pattern.

#### Scenario: Repository queries are scoped by user_id
- **GIVEN** the user_id-scoped repository layer established by this slice
- **WHEN** any repository method that touches a user's data executes
- **THEN** it takes `user_id` from the auth dependency and filters every query by it, the only exceptions being the auth-bootstrap methods that establish identity
