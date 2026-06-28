## MODIFIED Requirements

### Requirement: Condition-driven background layer

The system SHALL render a fullscreen fixed-position layer behind all page content whose visual state reflects the current weather condition and time of day for the active location. The layer SHALL have `pointer-events: none` and `aria-hidden="true"` and SHALL never obstruct user interaction. Rain particle animations SHALL render as near-vertical falling streaks that clearly read as rain, not as diagonal banding or textural noise.

#### Scenario: Background renders for a rain condition

- **WHEN** the active location's forecast returns a rain or thunderstorm weather code (WMO 51–67, 80–82, 95–99)
- **THEN** the background SHALL display a rain gradient and animated rain-particle overlay where individual streaks fall vertically (straight down, with at most a slight natural drift) and are visually distinct from one another — not rendered as continuous diagonal bands

#### Scenario: Rain particles do not show diagonal banding

- **WHEN** the rain particle overlay is active
- **THEN** the particle pattern SHALL NOT produce repeating diagonal stripe artifacts across the viewport at any viewport width or height

#### Scenario: Rain particles respect prefers-reduced-motion

- **WHEN** the user's OS or browser has `prefers-reduced-motion: reduce` enabled
- **THEN** the rain particle overlay animation is disabled and only the rain gradient background is shown (no moving elements)

#### Scenario: Background renders for a clear daytime condition

- **WHEN** the active location's forecast returns weather code 0 and the current time is between sunrise and sunset
- **THEN** the background SHALL display a clear-day gradient with no particles

#### Scenario: Background renders for a clear nighttime condition

- **WHEN** the active location's forecast returns weather code 0 and the current time is before sunrise or at/after sunset
- **THEN** the background SHALL display a clear-night gradient with no particles

#### Scenario: Background shows neutral state before forecast data is available

- **WHEN** no forecast data has been loaded yet (initial page load before location is selected)
- **THEN** the background SHALL render a neutral default gradient with no particles
