## MODIFIED Requirements

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

## ADDED Requirements

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
