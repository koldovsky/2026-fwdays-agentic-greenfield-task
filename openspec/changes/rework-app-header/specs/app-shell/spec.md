## MODIFIED Requirements

### Requirement: Application shell
The system SHALL render a top bar (logo, session area) and a main content area as
a single-page app. The marketing nav links (Features, Pricing) SHALL appear only
on the landing page, not on app-shell routes. When a user is signed in, the top
bar SHALL show the user's name in the header row alongside the account menu.
In-page anchor navigation SHALL account for the sticky header height so a linked
section is not hidden behind the bar. Implements FR-SHELL-01, NFR-I18N-01,
NFR-OBS-02.

#### Scenario: Shell present on load
- **WHEN** the app loads any primary route
- **THEN** the top bar with logo and a session area and a main content area are visible

#### Scenario: Marketing nav is landing-only
- **WHEN** the top bar renders on an app-shell route (e.g. `/tailor` or `/account/*`)
- **THEN** the Features/Pricing marketing anchors are not shown, so they cannot navigate the user off the app; on the landing page those anchors are shown

#### Scenario: Signed-in identity in the header
- **WHEN** a signed-in user views any route with the top bar
- **THEN** their name is shown in the header row next to the account menu

#### Scenario: Anchor clears the sticky header
- **WHEN** a user follows an in-page anchor link (e.g. `/#pricing`)
- **THEN** the target section is scrolled into view below the sticky header, not hidden behind it
