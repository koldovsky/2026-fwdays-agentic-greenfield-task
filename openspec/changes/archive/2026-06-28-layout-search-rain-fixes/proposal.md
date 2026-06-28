## Why

The weather information page forces users to scroll vertically to see the map, the search bar retains stale input after a city is selected (breaking the "fresh search" mental model), and the rain particle animation renders as diagonal streaks across the full viewport rather than falling particles — all three degrade usability and visual polish on the primary interaction flow.

## What Changes

- **Container width**: Remove the 1240 px max-width cap; expand to fill the available viewport (e.g. `max-w-screen-2xl` or uncapped) so information and map get more horizontal room.
- **Page layout on the weather info view**: Replace the current vertically-stacked layout with two rows — row 1: search bar (full width); row 2: forecast/info block (≈70 % width) + map panel (≈30 % width), side-by-side. The combined height of both rows fits within the viewport, eliminating vertical scroll.
- **Search bar reset after city selection**: After the user selects a suggestion, the input value is cleared and the suggestion list is hidden. This applies on both the hero/home page and the weather-info page — every search is a discrete, zero-to-zero interaction.
- **Rain animation fix**: Replace the current full-viewport diagonal stripe rendering with correct vertical rain-drop particles that fall naturally within the background layer bounds.

## Capabilities

### New Capabilities

_(none — all three changes are behaviour/visual corrections to existing capabilities)_

### Modified Capabilities

- `app-shell`: Layout of the weather-info view changes from a vertically-stacked single column to a two-row, two-column layout (search | info+map). Container max-width constraint is removed or enlarged. Responsive breakpoints for the two-column split need updating (FR-SHELL-02).
- `city-search`: After a city is selected the input SHALL be cleared and the suggestion list SHALL be hidden. This modifies the post-selection behaviour requirement (currently the spec only says the list is "dismissed" but does not specify input clearing). Applies on home page (hero) and info page alike.
- `animated-bg`: Rain particle animation is corrected so particles fall vertically (or with a slight natural drift) within the fixed background layer rather than rendering as diagonal stripes across the viewport.

## Impact

- **`app/components/`** — layout wrapper component(s) and the weather-info page/layout will be edited to restructure the grid.
- **`app/components/CitySearch` (or equivalent)** — post-selection handler clears input value and hides the dropdown.
- **`app/components/AnimatedBackground` (or equivalent)** — rain particle CSS/JS animation corrected.
- **`app/globals.css` / `app/design-system/`** — any container max-width tokens or utilities updated.
- No API routes, `lib/` pure functions, or external dependencies are affected.
- No breaking changes to URL schema or data contracts.

## Non-goals

- No changes to the forecast data fetched or displayed.
- No changes to the map tile provider or Leaflet configuration.
- No new breakpoints beyond adjusting the two-column split trigger.
- No changes to the comfort score algorithm or i18n strings (beyond any minor label adjustments if layout requires reflow).
- No backend or Route Handler changes.
