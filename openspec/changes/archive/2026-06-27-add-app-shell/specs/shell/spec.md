## ADDED Requirements

### Requirement: Single-screen shell with quiet navigation
The system SHALL present a single-screen PWA with a main "next break" view, plus
Settings and Stats views reachable from a quiet navigation (backs FR-SHELL-01).

#### Scenario: Navigate between views
- **WHEN** the user activates the nav control for Settings or Stats
- **THEN** that view is shown in the same calm shell, and the main view is reachable again

### Requirement: Mobile-first responsive layout
The system SHALL use a mobile-first responsive layout in which the breathing ring
remains the focal point down to small phone widths (backs FR-SHELL-02).

#### Scenario: Narrow viewport keeps the ring central
- **WHEN** the app is viewed at a small phone width
- **THEN** the breathing ring stays centered and legible as the focal element

### Requirement: First-run state
The system SHALL, on first run when no settings are saved, apply calm defaults and show
a short intro line instead of a blank or error state (backs FR-SHELL-03).

#### Scenario: First run shows intro
- **WHEN** the app loads with no saved settings
- **THEN** calm defaults are applied and a short intro line is displayed

### Requirement: Breathing-ring states honor reduced motion
The system SHALL render the breathing ring with idle, due, and disabled states per
DESIGN.md, and SHALL disable the breathing pulse and grow-ins when
`prefers-reduced-motion` is set, keeping the app fully usable (backs NFR-MOTION-01).

#### Scenario: Reduced motion disables the pulse
- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** the ring shows state changes instantly with no pulsing animation, and the countdown stays readable

#### Scenario: Due state uses the signal color
- **WHEN** the next reminder time is reached
- **THEN** the ring fills with the `signal` color (the one warm moment), otherwise it uses `accent` (idle) or `muted` (disabled)
