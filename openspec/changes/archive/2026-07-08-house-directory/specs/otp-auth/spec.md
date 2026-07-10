# otp-auth Specification (delta)

## MODIFIED Requirements

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
