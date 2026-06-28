## ADDED Requirements

### Requirement: Condition-driven background layer

The system SHALL render a fullscreen fixed-position layer behind all page content whose visual state reflects the current weather condition and time of day for the active location. The layer SHALL have `pointer-events: none` and `aria-hidden="true"` and SHALL never obstruct user interaction.

#### Scenario: Background renders for a clear daytime condition

- **WHEN** the active location's forecast returns weather code 0 and the current time is between sunrise and sunset
- **THEN** the background SHALL display a clear-day gradient with no particles

#### Scenario: Background renders for a clear nighttime condition

- **WHEN** the active location's forecast returns weather code 0 and the current time is before sunrise or at/after sunset
- **THEN** the background SHALL display a clear-night gradient with no particles

#### Scenario: Background renders for a rain condition

- **WHEN** the active location's forecast returns a rain or thunderstorm weather code (WMO 51–67, 80–82, 95–99)
- **THEN** the background SHALL display a rain gradient and animated rain-particle overlay

#### Scenario: Background renders for a snow condition

- **WHEN** the active location's forecast returns a snow weather code (WMO 71–77, 85–86)
- **THEN** the background SHALL display a snow gradient and animated snowflake-particle overlay

#### Scenario: Background renders for a cloudy condition

- **WHEN** the active location's forecast returns a partly-cloudy or overcast weather code (WMO 1–3, 45, 48)
- **THEN** the background SHALL display the appropriate day or night gradient with an animated cloud-drift overlay

#### Scenario: Background shows neutral state before forecast data is available

- **WHEN** no forecast data has been loaded yet (initial page load before location is selected)
- **THEN** the background SHALL render a neutral default gradient with no particles

### Requirement: Day/night determination from location data

The system SHALL determine daytime vs nighttime using the `sunrise` and `sunset` values from the active location's Open-Meteo forecast response, not from the user's device clock timezone.

#### Scenario: Day/night uses forecast sunrise and sunset

- **WHEN** the active location's forecast provides `daily.sunrise[0]` and `daily.sunset[0]`
- **THEN** the background state SHALL treat the period between those two timestamps as daytime and all other times as nighttime

#### Scenario: Stale data graceful fallback

- **WHEN** sunrise/sunset data is unavailable or malformed
- **THEN** the background SHALL default to the daytime variant

### Requirement: Reduced-motion accessibility

The system SHALL respect the `prefers-reduced-motion: reduce` media preference. When set, all CSS and JS animations SHALL be disabled and the background SHALL render a static gradient only.

#### Scenario: Static gradient with prefers-reduced-motion enabled

- **WHEN** the user's OS or browser has `prefers-reduced-motion: reduce` enabled
- **THEN** the background SHALL display a static gradient appropriate to the current condition with no particle or cloud-drift animations running

#### Scenario: Full animation without reduced-motion preference

- **WHEN** the user's OS or browser does NOT have `prefers-reduced-motion: reduce` enabled
- **THEN** all condition-appropriate animations SHALL run normally

### Requirement: Interaction non-blocking

The background layer SHALL never block pointer events or keyboard focus traversal for any element rendered above it.

#### Scenario: Click-through on interactive elements

- **WHEN** the user clicks on a button, input, or link overlaid on the background
- **THEN** the click event SHALL reach the target element unimpeded and the background SHALL not receive the event

### Requirement: Pure condition-mapping utility

The system SHALL implement a pure function `getWeatherState(code: number, sunrise: string, sunset: string, nowIso: string): WeatherState` in `lib/weather/conditions.ts` that is free of framework imports and DOM globals. The function SHALL be 100% covered by Vitest unit tests.

#### Scenario: Deterministic output for known WMO codes

- **WHEN** `getWeatherState` is called with a known WMO code, valid sunrise/sunset strings, and a specific ISO timestamp
- **THEN** it SHALL return the same `WeatherState` value on every invocation with the same inputs

#### Scenario: Rain code mapping

- **WHEN** WMO code 61 (moderate rain) is passed with a daytime timestamp
- **THEN** `getWeatherState` SHALL return `'rain'`

#### Scenario: Snow code mapping

- **WHEN** WMO code 73 (moderate snow) is passed with a nighttime timestamp
- **THEN** `getWeatherState` SHALL return `'snow'`

#### Scenario: Unknown WMO code fallback

- **WHEN** an unrecognised WMO code is passed
- **THEN** `getWeatherState` SHALL return `'clear-day'` or `'clear-night'` depending on the time, as a safe default

### Requirement: z-index layering

The background layer SHALL sit below all page content in the stacking context, enforced via documented CSS custom property `--z-bg`.

#### Scenario: Background does not cover navigation or forecast panel

- **WHEN** the page renders both the animated background and any interactive element
- **THEN** the interactive element SHALL appear visually above the background at all viewport sizes
