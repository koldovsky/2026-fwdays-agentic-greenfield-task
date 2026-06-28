## MODIFIED Requirements

### Requirement: Single-page shell with top bar and main content area

The application SHALL render a single-page shell composed of a top bar and a main content area. The top bar MUST contain the Надворі logo/wordmark and a theme indicator reflecting the active `data-theme`. The main content area MUST host the product regions as named slots that downstream capabilities mount into. When an active location is present, the main content area SHALL be constrained to the viewport height so that no vertical scroll is required — all content fits within the visible window. (FR-SHELL-01)

#### Scenario: Shell renders on first load

- **WHEN** a user opens the homepage
- **THEN** a top bar with the logo/wordmark and a theme indicator is visible
- **AND** a main content area is rendered below it
- **AND** named placeholder slots exist for the search, forecast, and map regions

#### Scenario: No vertical scroll when a city is active

- **WHEN** a city is selected and the weather info view is visible
- **THEN** the entire page content fits within the viewport height with no vertical scrollbar
- **AND** the search row and the info+map row are both fully visible without scrolling

#### Scenario: Theme indicator reflects active theme

- **WHEN** the document `data-theme` attribute is `light` or `dark`
- **THEN** the top-bar theme indicator reflects that theme
- **AND** all shell colors are drawn from semantic design tokens, never raw ramps

---

### Requirement: Responsive layout at 768 px and 1280 px breakpoints

The shell layout SHALL adapt at the 768 px and 1280 px breakpoints. When an active location is present, the layout SHALL use a two-row structure on screens wider than 768 px: row 1 is a full-width search bar; row 2 is a two-column split with the forecast/info block occupying approximately 70 % of the width and the map panel occupying approximately 30 % of the width. Below 768 px, all regions stack in a single column. (FR-SHELL-02)

#### Scenario: Mobile single-column

- **WHEN** the viewport width is below 768 px
- **THEN** the search bar, forecast block, and map stack in a single column

#### Scenario: Two-row two-column desktop layout

- **WHEN** the viewport width is at least 768 px and an active location is set
- **THEN** row 1 shows the search bar spanning the full container width
- **AND** row 2 shows the forecast/info block at approximately 70 % width and the map panel at approximately 30 % width, side by side

---

### Requirement: Wider page container

The main content container SHALL use a maximum width of at least 1536 px (`max-w-screen-2xl`) rather than the previous 1240 px cap, giving the forecast and map panels sufficient horizontal room on modern wide-screen viewports. (FR-SHELL-01)

#### Scenario: Content fills wide-screen viewport

- **WHEN** the viewport width is 1440 px or wider
- **THEN** the main content area extends beyond 1240 px and the forecast+map columns each have noticeably more width than at the previous cap

#### Scenario: Content does not stretch on ultra-wide viewports

- **WHEN** the viewport width exceeds 1536 px
- **THEN** the container is centered with symmetric horizontal margins and does not grow beyond `max-w-screen-2xl`
