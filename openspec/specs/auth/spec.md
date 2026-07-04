# auth

## Purpose

Identity and access control for Notely: registration, login, session persistence, route
protection, and the security constraints (password hashing, input validation, CSRF) that
back every authenticated data operation. Covers FR-001, FR-002, FR-003, SEC-001, SEC-002,
SEC-003.

## Requirements

### Requirement: Email and password registration (FR-001)
The system SHALL allow a new user to register using an email address and password. Email SHALL be unique across users; password SHALL be hashed before storage and SHALL never be persisted or logged in plaintext.

#### Scenario: Successful registration
- **WHEN** a visitor submits the registration form with a valid, unused email and a password meeting the minimum complexity rules
- **THEN** a new `User` record is created with a bcrypt hash of the password, a session is created for the new user, and the user is redirected to the dashboard

#### Scenario: Duplicate email
- **WHEN** a visitor submits the registration form with an email that already belongs to an existing user
- **THEN** no new `User` record is created and a field-level error is returned indicating the email is already in use

#### Scenario: Invalid input rejected before persistence
- **WHEN** a visitor submits the registration form with a malformed email or a password that fails validation rules
- **THEN** the server rejects the submission with field-level validation errors and no `User` record is created

### Requirement: Email and password login (FR-002)
The system SHALL allow a registered user to authenticate using their email address and password.

#### Scenario: Successful login
- **WHEN** a registered user submits their correct email and password
- **THEN** the submitted password verifies against the stored bcrypt hash, a session is created, and the user is redirected to the dashboard

#### Scenario: Incorrect password
- **WHEN** a user submits a registered email with an incorrect password
- **THEN** authentication fails, no session is created, and a generic invalid-credentials error is returned that does not reveal whether the email exists

#### Scenario: Unknown email
- **WHEN** a user submits an email with no matching `User` record
- **THEN** authentication fails with the same generic invalid-credentials error used for an incorrect password

### Requirement: Session persistence across refresh (FR-003)
The system SHALL maintain an authenticated user's session across browser refreshes and new tabs within the same browser, until the session expires or the user logs out.

#### Scenario: Session survives refresh
- **WHEN** an authenticated user refreshes the page or opens the application in a new tab within the session's validity window
- **THEN** the user remains authenticated without re-entering credentials

#### Scenario: Logout ends the session
- **WHEN** an authenticated user activates logout
- **THEN** the session cookie is cleared and subsequent requests to protected routes are treated as unauthenticated

#### Scenario: Expired session requires re-authentication
- **WHEN** a user's session cookie is present but past its expiration
- **THEN** the user is treated as unauthenticated and redirected to login when accessing a protected route

### Requirement: Route protection for authenticated areas
Unauthenticated requests SHALL be redirected away from protected dashboard routes, and authenticated users SHALL be redirected away from the login and registration routes.

#### Scenario: Unauthenticated access to dashboard
- **WHEN** a request with no valid session cookie is made to any route under the dashboard route group
- **THEN** the request is redirected to the login page before dashboard content is rendered

#### Scenario: Authenticated access to login or register
- **WHEN** a request with a valid session cookie is made to the login or registration route
- **THEN** the request is redirected to the dashboard

#### Scenario: Data access without a verified session is rejected
- **WHEN** a Server Action or route handler that touches user data is invoked without a valid, verified session
- **THEN** the action is refused and no data is read or written, regardless of what the optimistic route redirect allowed through

### Requirement: Password hashing (SEC-001)
Passwords SHALL be hashed using bcrypt before being stored, and SHALL never be stored, logged, or transmitted in plaintext after submission.

#### Scenario: Password stored as a bcrypt hash
- **WHEN** a user registers or changes their password
- **THEN** the value persisted to `User.passwordHash` is a bcrypt hash, and the plaintext password is not retained after the request completes

### Requirement: Input validation on client and server (SEC-002)
Registration and login input SHALL be validated on the client for immediate feedback and independently re-validated on the server before any authentication or persistence logic runs.

#### Scenario: Server rejects invalid input even if client validation is bypassed
- **WHEN** a registration or login request reaches the server with input that fails schema validation (e.g., malformed email, empty password)
- **THEN** the server rejects the request with validation errors before attempting to query or write to the database

### Requirement: CSRF protection on authentication actions (SEC-003)
State-changing authentication operations (register, login, logout) SHALL verify the request originates from the application's own origin before taking effect.

#### Scenario: Cross-origin submission rejected
- **WHEN** a register, login, or logout action is invoked with a request whose origin does not match the application's expected origin
- **THEN** the action is refused and no session is created, changed, or destroyed

#### Scenario: Same-origin submission proceeds
- **WHEN** a register, login, or logout action is invoked from the application's own origin
- **THEN** the action proceeds through normal validation and authentication logic
