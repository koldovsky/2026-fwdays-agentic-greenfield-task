## ADDED Requirements

### Requirement: Light and dark theme tokens

The application SHALL define CSS custom properties for light and dark themes aligned with project design tokens, including background, foreground, muted, card, border, primary, accent, and destructive colors. Tailwind utility classes MUST map to these tokens via `@theme inline`.

#### Scenario: Light theme tokens active

- **WHEN** the light theme is active
- **THEN** page background, text, and component surfaces use the light palette defined in DESIGN.md

#### Scenario: Dark theme tokens active

- **WHEN** the dark theme is active
- **THEN** page background, text, and component surfaces use the dark palette defined in DESIGN.md

### Requirement: Theme toggle in header

The application SHALL provide a theme toggle control in the header that switches between light and dark themes without a full page reload.

#### Scenario: User toggles theme

- **WHEN** the user activates the theme toggle
- **THEN** the visual theme switches immediately across header, main, and footer
- **THEN** the chosen theme persists across page reloads

### Requirement: System preference default

Before the user makes an explicit theme choice, the application MUST default to the operating system's `prefers-color-scheme` preference.

#### Scenario: First visit with dark system preference

- **WHEN** the user has not previously chosen a theme and the system prefers dark mode
- **THEN** the application renders in dark theme on first load

#### Scenario: First visit with light system preference

- **WHEN** the user has not previously chosen a theme and the system prefers light mode
- **THEN** the application renders in light theme on first load
