# app-shell (delta)

## ADDED Requirements

### Requirement: Visitor-selectable locale
The app SHALL resolve a visitor locale from a `locale` cookie, defaulting to
Ukrainian when the cookie is absent or invalid (Ukrainian-first, NFR-I18N-01). The
resolved locale SHALL set the document `<html lang>` and SHALL be passed to every
localized view so the whole app renders in one language. A `LanguageSwitch`
control in the top bar SHALL let the visitor switch between Ukrainian and English;
switching persists the choice in the cookie and refreshes the current view. No
locale prefix is added to URLs. Implements NFR-I18N-01, FR-SHELL-01, BC-BRAND-01.

#### Scenario: Default locale is Ukrainian
- **WHEN** a visitor with no `locale` cookie loads any page
- **THEN** the page renders in Ukrainian and `<html lang>` is `uk`

#### Scenario: Switching language persists and applies app-wide
- **WHEN** the visitor selects English in the language switch
- **THEN** the `locale` cookie is set to `en`, the view refreshes in English, and `<html lang>` becomes `en`
- **AND** subsequent navigation stays in the chosen language until it is changed again

#### Scenario: The switch is accessible
- **WHEN** the language switch is rendered
- **THEN** it is keyboard operable, has an accessible name, and a visible focus style (NFR-A11Y-01)
