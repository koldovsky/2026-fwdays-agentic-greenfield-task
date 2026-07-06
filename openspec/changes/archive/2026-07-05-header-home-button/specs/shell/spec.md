## ADDED Requirements

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
