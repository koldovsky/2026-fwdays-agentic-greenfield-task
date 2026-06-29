## MODIFIED Requirements

### Requirement: Single light "paper" theme
The system SHALL render the app in a single light "paper" theme per the «Поливайко» design system, with NO light/dark theme toggle (FR-SHELL-02a). This requirement SUPERSEDES the former persisted light/dark theme toggle (FR-SHELL-02, superseded 2026-06-30 by the design-system scope change): the light/dark machinery — the theme provider, the toggle control, the persisted preference, and the pre-hydration no-flash script — is REMOVED. The app SHALL NOT read or write any persisted theme preference. The UI SHALL pass automated accessibility (axe) checks in the paper theme (NFR-A11Y-01) and text and interactive elements SHALL meet WCAG 2.1 AA contrast in the paper theme (NFR-A11Y-02). The «Поливайко» tokens and components themselves are defined in the design-system capability (FR-DS-01..06).

#### Scenario: App renders in the paper theme
- **WHEN** the app is loaded
- **THEN** the shell renders in the single light "paper" theme (warm paper background per the «Поливайко» design system) and the document's rendered theme is the paper theme on first paint (FR-SHELL-02a)

#### Scenario: No theme toggle is present
- **WHEN** the Owner inspects the shell controls
- **THEN** no light/dark theme toggle control is present, and there is no theme preference to persist (FR-SHELL-02a, superseding FR-SHELL-02)

#### Scenario: No theme machinery remains in the app
- **WHEN** the application shell is rendered
- **THEN** it requires no theme provider, exposes no theme-toggle control, and runs no pre-hydration theme script (FR-SHELL-02a)

#### Scenario: Theme is stable across reload
- **WHEN** the Owner reloads the app
- **THEN** the app re-renders in the same single paper theme without reading or writing any persisted theme preference (FR-SHELL-02a)

#### Scenario: Contrast in the paper theme
- **WHEN** the settled plant list and plant detail screens are inspected in the paper theme
- **THEN** text and interactive elements meet WCAG 2.1 AA contrast and axe reports no violations (NFR-A11Y-01, NFR-A11Y-02)
