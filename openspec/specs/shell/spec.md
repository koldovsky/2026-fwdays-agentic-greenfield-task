# shell Specification

## Purpose
TBD - created by archiving change github-battle-mvp. Update Purpose after archive.
## Requirements
### Requirement: Application routes
The app SHALL expose three routes: `/` (landing), `/stats/[username]`, and
`/battle/[user1]/[user2]`, implemented with the Next.js App Router. (FR-SHELL-01)

#### Scenario: Landing route
- **WHEN** a visitor opens `/`
- **THEN** the landing screen renders with no user data fetched

#### Scenario: Stats route
- **WHEN** a visitor opens `/stats/octocat`
- **THEN** the single-user stats view for `octocat` renders

#### Scenario: Battle route
- **WHEN** a visitor opens `/battle/torvalds/gaearon`
- **THEN** the two-user battle view for those logins renders

### Requirement: Responsive layout
The layout SHALL be single-column on mobile and lay battle content out in
side-by-side columns at viewport widths ≥ 768 px. (FR-SHELL-02)

#### Scenario: Mobile width
- **WHEN** the battle view is viewed below 768 px wide
- **THEN** the two users stack in a single column

#### Scenario: Tablet/desktop width
- **WHEN** the battle view is viewed at or above 768 px wide
- **THEN** the two users appear side-by-side

### Requirement: Header and footer
The shell SHALL show a header with the product name/logo that links home, and a
footer that credits the GitHub REST API with a hyperlink. (FR-SHELL-03, BC-BRAND-02)

#### Scenario: Header links home
- **WHEN** a visitor clicks the header logo from any route
- **THEN** they navigate to `/`

#### Scenario: Footer credit
- **WHEN** any route renders
- **THEN** the footer shows a hyperlinked credit to the GitHub REST API

### Requirement: Theme toggle with dark default
The shell SHALL provide a theme toggle switching light/dark, defaulting to dark, with
every color expressed as a semantic token so a single `.dark` class re-themes the
whole app. (FR-SHELL-04)

#### Scenario: Dark by default
- **WHEN** a visitor first loads the app
- **THEN** the dark theme is active

#### Scenario: Toggle to light
- **WHEN** the visitor activates the theme toggle
- **THEN** the app switches to the light theme via the semantic tokens with no un-themed colors

### Requirement: Header home navigation control
The header SHALL provide an explicit, labeled control that navigates to the
landing page (`/`) from any sub-route. On the landing page itself the control
SHALL be omitted to avoid a redundant self-link; the logo remains the home
affordance there (FR-SHELL-03). The control SHALL have a visible focus style and
an accessible name (NFR-A11Y-01).

#### Scenario: Home control on a sub-route
- **WHEN** a visitor is on `/stats/{username}` or `/battle/{user1}/{user2}`
- **THEN** the header shows a labeled home control that navigates to `/` when activated

#### Scenario: Home control hidden on the landing page
- **WHEN** a visitor is on `/`
- **THEN** the explicit home control is not shown

#### Scenario: Keyboard accessible
- **WHEN** the home control receives keyboard focus
- **THEN** it shows a visible focus style and exposes an accessible name

