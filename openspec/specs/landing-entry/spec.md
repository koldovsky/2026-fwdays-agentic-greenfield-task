# landing-entry Specification

## Purpose
TBD - created by archiving change github-battle-mvp. Update Purpose after archive.
## Requirements
### Requirement: Mode toggle
The landing screen SHALL offer a mode toggle with two modes: **Explore** (single
user) and **Compare** (two users). (FR-LAND-01)

#### Scenario: Switch modes
- **WHEN** the visitor selects the Compare mode
- **THEN** the landing screen shows the Compare inputs and action, replacing the Explore layout

### Requirement: Mode-specific inputs
Explore mode SHALL show one username input with an "Explore" action; Compare mode
SHALL show two username inputs with a "Compare" action. (FR-LAND-02)

#### Scenario: Explore inputs
- **WHEN** Explore mode is active
- **THEN** one username input and an "Explore" action are shown

#### Scenario: Compare inputs
- **WHEN** Compare mode is active
- **THEN** two username inputs and a "Compare" action are shown

### Requirement: Username trimming
Username inputs SHALL accept a free-form GitHub login and trim leading/trailing
whitespace before use. (FR-LAND-03)

#### Scenario: Whitespace trimmed
- **WHEN** the visitor enters `  octocat  ` and submits
- **THEN** the value is trimmed to `octocat` before validation and navigation

### Requirement: Pre-navigation existence validation
On submit, each entered username SHALL be validated for existence via
`GET /users/{username}` before any navigation. (FR-LAND-04)

#### Scenario: Valid user navigates
- **WHEN** the visitor submits an existing username
- **THEN** the app validates it via the API and only then navigates to the corresponding route

### Requirement: Not-found flagging blocks navigation
If a username returns HTTP 404, its input SHALL be highlighted with a red border and
an inline "User not found" message, and navigation SHALL be blocked. (FR-LAND-05)

#### Scenario: Nonexistent user flagged
- **WHEN** the visitor submits a username that returns 404
- **THEN** its input shows a red border and "User not found", and no navigation occurs

### Requirement: Parallel battle validation
In Battle mode both usernames SHALL be validated in parallel; only the input(s) that
failed are flagged, and both must resolve before navigation. (FR-LAND-06)

#### Scenario: One of two fails
- **WHEN** the visitor submits a valid and an invalid username in Battle mode
- **THEN** both are validated in parallel, only the invalid input is flagged, and navigation is blocked

#### Scenario: Both valid
- **WHEN** both battle usernames resolve as existing
- **THEN** the app navigates to `/battle/{user1}/{user2}`

### Requirement: Empty input guard
An empty required input SHALL block submission with an inline "Enter a username"
hint, making no navigation and no API call. (FR-LAND-07)

#### Scenario: Empty submit
- **WHEN** the visitor submits with a required input empty
- **THEN** an "Enter a username" hint appears and no API call or navigation occurs

### Requirement: Pending submit state
While validation is in flight, the submit action SHALL show a pending state and be
disabled to prevent duplicate submits. (FR-LAND-08)

#### Scenario: Disabled while validating
- **WHEN** validation is in flight after submit
- **THEN** the submit action is disabled and shows a pending state until validation resolves

### Requirement: Centered landing hero and inline entry
The landing hero SHALL be center-aligned with three tiers — an italic serif
eyebrow, a display headline, and a standfirst — and the active mode's username
input(s) SHALL sit on an inline row with the submit action rendered as the
primary button with a trailing arrow. Styling SHALL use design-system tokens and
remain near-iconless and sentence case (BC-BRAND-01/03).

#### Scenario: Centered hero
- **WHEN** the landing page renders
- **THEN** the eyebrow, headline, standfirst, mode toggle, and entry row are horizontally centered

#### Scenario: Inline explore entry
- **WHEN** Explore mode is active
- **THEN** the username input and the submit action appear together on one row

