# Animated Background Specification

## Purpose

The animated-bg capability renders a full-viewport decorative sky behind app content,
driven by the active location's weather and local day/night cycle.

## Requirements

### Requirement: Condition-driven background

The system SHALL render a full-viewport background that reflects the active location's
current weather condition with gradients and ambient particles (`FR-ANIM-01`).

#### Scenario: Clear weather uses a sky gradient

- **GIVEN** the active location's today weather code indicates clear skies
- **WHEN** the background renders
- **THEN** the visitor sees a soft sky gradient treatment
- **AND** optional ambient cloud drift when motion is allowed

#### Scenario: Rain or snow adds particles

- **GIVEN** the active location's today weather code indicates rain or snow
- **WHEN** the background renders with motion allowed
- **THEN** semi-transparent rain or snow particles appear over the base gradient

### Requirement: Location sunrise and sunset drive day/night

The system SHALL choose daytime versus nighttime palette from today's sunrise and
sunset for the active location, not from the visitor's clock alone (`FR-ANIM-02`).

#### Scenario: Night palette after location sunset

- **GIVEN** the current time at the active location is after today's sunset
- **WHEN** the background resolves its palette
- **THEN** a nighttime gradient is used

### Requirement: Reduced motion static fallback

The system SHALL render a static gradient only when `prefers-reduced-motion: reduce`
is set (`FR-ANIM-03`).

#### Scenario: Reduced motion disables particles

- **GIVEN** the visitor prefers reduced motion
- **WHEN** the background renders
- **THEN** only the static gradient is shown
- **AND** particle animation loops do not run

### Requirement: Non-blocking decorative layer

The background SHALL never intercept pointer events (`FR-ANIM-04`).

#### Scenario: Background does not block clicks

- **GIVEN** the animated background is visible
- **WHEN** the visitor interacts with search, forecast, or map controls
- **THEN** clicks pass through to the interactive content
