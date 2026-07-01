# theming Specification

## Purpose
TBD - created by archiving change add-theming. Update Purpose after archive.
## Requirements
### Requirement: Select appearance (Light / Dark / System)

The app SHALL let a signed-in user choose between **Light**, **Dark**, and **System** (follow
the OS) from a control in settings. The default SHALL be **Dark**. "System" SHALL track the OS
appearance live. (FR-THEME-01)

#### Scenario: User switches appearance

- **WHEN** a user selects Light, Dark, or System from the appearance control
- **THEN** the app adopts that appearance
- **AND** "System" follows the current OS light/dark setting

#### Scenario: Default is Dark

- **WHEN** a user has never chosen an appearance
- **THEN** the app uses Dark

### Requirement: Appearance persists and applies immediately

The chosen appearance SHALL persist across app launches and SHALL apply **app-wide
immediately** — no restart. (FR-THEME-02)

#### Scenario: Choice survives a relaunch

- **WHEN** a user picks an appearance and later reopens the app
- **THEN** the previously chosen appearance is restored

#### Scenario: Change applies without restart

- **WHEN** a user changes the appearance
- **THEN** every screen re-colors immediately without reloading the app

### Requirement: All color comes from design tokens

Every color SHALL come from the centralized design tokens; there SHALL be no hardcoded colors
in components, so Light/Dark is a token swap rather than per-component work. (FR-THEME-03)

#### Scenario: A screen renders from tokens in both themes

- **WHEN** the appearance switches between Light and Dark
- **THEN** each screen re-colors purely from the token set, with no hardcoded color left behind

### Requirement: Palettes meet AA contrast in both themes

The color palette SHALL meet WCAG AA contrast for text and interactive elements in **both**
Light and Dark. (NFR-A11Y-02)

#### Scenario: Text is legible in each theme

- **WHEN** primary text and accent-on-surface are shown in Light and in Dark
- **THEN** their contrast ratios meet WCAG AA

### Requirement: Native surfaces follow the system appearance

Native surfaces (home-screen widget, Live Activity) SHALL follow the **system** appearance,
not the in-app override — a documented MVP simplification. (FR-THEME-04)

#### Scenario: A native surface ignores the in-app override

- **WHEN** the user sets an in-app override that differs from the OS appearance
- **THEN** any native surface still renders using the system appearance

