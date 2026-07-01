# Authentication and Authorization Specification

## Purpose

Provide secure local sign-in, session lifecycle, route protection, and role-based mutation guards for the prototype. Covers FR-1 through FR-7 and NFR-1 through NFR-4.

## Requirements

### Requirement: Server-side sign-in

The system SHALL authenticate active users against the user repository and never expose stored credentials (FR-1, FR-3).

#### Scenario: Valid credentials
- **GIVEN** the active seeded Admin user `test`
- **WHEN** `test` submits the password `test`
- **THEN** authentication succeeds without returning password data to the browser

#### Scenario: Invalid credentials
- **GIVEN** a username or password that does not match an active user
- **WHEN** the login form is submitted
- **THEN** the page displays an inline invalid-credentials message and does not disclose which field failed

### Requirement: Session lifecycle

The system SHALL issue an HTTP-only, SameSite=Lax session cookie on login and clear it on logout (FR-2, FR-5, NFR-2).

#### Scenario: Login and logout
- **GIVEN** valid credentials
- **WHEN** login succeeds and the user later logs out
- **THEN** the user first reaches `/dashboard`, then the cookie is invalidated and the user returns to `/login`

### Requirement: Protected routes

The system SHALL redirect unauthenticated protected-page requests to `/login` (FR-4).

#### Scenario: Missing session
- **GIVEN** no valid session cookie
- **WHEN** a protected route is requested
- **THEN** the response redirects to `/login` with the requested destination preserved

### Requirement: Role enforcement

Every server mutation SHALL revalidate the session, role, and submitted data (FR-6, FR-7, NFR-3).

#### Scenario: Staff master-data mutation
- **GIVEN** an authenticated Staff user
- **WHEN** the user attempts a supplier or inventory-master mutation
- **THEN** the operation returns a forbidden result and persists no change

#### Scenario: Staff operational mutation
- **GIVEN** an authenticated Staff user with valid input
- **WHEN** the user creates an order, receives goods, or executes manufacturing
- **THEN** the operation is authorized

The demo credentials are local-evaluation fixtures and are intentionally unsuitable for production (NFR-4).

