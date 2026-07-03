# app-shell Specification

## Purpose
TBD - created by archiving change add-app-shell. Update Purpose after archive.
## Requirements
### Requirement: Bottom-tab navigation

When signed in, the app SHALL present bottom-tab navigation with four tabs —
**Timer**, **History**, **Stats**, and **Profile** — using the design system's tab bar. The
active tab SHALL be visually indicated, and switching tabs SHALL preserve each tab's state.
(FR-SHELL-01)

#### Scenario: Signed-in user sees and switches tabs

- **WHEN** a signed-in user opens the app
- **THEN** a bottom tab bar shows Timer, History, Stats, and Profile with the current tab marked active
- **AND** tapping a tab shows that tab's screen without signing the user out

### Requirement: The app is gated behind authentication

Unauthenticated users SHALL see only the auth screen; the tabbed app SHALL be reachable
only when signed in. Auth state changes SHALL move the user between the two without a manual
reload. While the session is being restored on launch, a loading state SHALL be shown rather
than either destination flashing. (FR-SHELL-02)

#### Scenario: Signed-out user sees only auth

- **WHEN** the app has no active session
- **THEN** only the auth screen is shown and the tabs are not reachable

#### Scenario: Signing in reveals the app

- **WHEN** a signed-out user completes sign-in
- **THEN** the app replaces the auth screen with the tabbed shell

#### Scenario: Signing out returns to auth

- **WHEN** a signed-in user signs out
- **THEN** the app returns to the auth screen and the tabs are no longer reachable

#### Scenario: Session restore shows a loading state

- **WHEN** the app launches and is still determining the session
- **THEN** a loading indicator is shown until the destination (auth or tabs) is resolved

### Requirement: First-run empty state

When a signed-in user has no time entries, the Timer tab SHALL show a first-run
empty state — hero copy plus a prominent "Start your first entry" affordance — instead of an
empty list. (FR-SHELL-03)

#### Scenario: New user sees the empty state

- **WHEN** a signed-in user with zero entries opens the Timer tab
- **THEN** a hero empty state with a prominent "Start your first entry" action is shown

#### Scenario: Empty state gives way to content

- **WHEN** the user has at least one entry
- **THEN** the Timer tab shows entries instead of the empty state

