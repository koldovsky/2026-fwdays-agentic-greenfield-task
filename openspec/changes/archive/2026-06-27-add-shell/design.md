# Design — add-shell

## Goals / Non-goals

**Goals**

- Render a static, server-component home page shell with no client JavaScript.
- Replace create-next-app starter copy with Ukrainian-first Weather Explorer copy.
- Provide visible regions for future search, forecast, and map slices.
- Use Sky Calm colors and breakpoints from `DESIGN.md`.

**Non-goals**

- Live clock (`FR-CLOCK-01`) beyond a static placeholder.
- Real city search, geocoding, forecast data, map, comfort badges, or animations.
- Theme persistence or cookies.

## Key Decisions

| Decision | Alternatives | Trade-off |
|----------|--------------|-----------|
| Server component only | Client component for future search | Zero hydration cost now; search slice can replace placeholder later |
| Shell copy in `lib/shell/` | Inline all copy in `app/page.tsx` | Testable, traceable copy without React imports in `lib/` |
| Placeholder panels for forecast/map | Hide future regions until data exists | Makes responsive shell visible and testable before API slices |

## Data Model

No database or external data. Static copy lives in `lib/shell/shell-content.ts`
and is consumed by the home page.

## Error Handling

No user-input or external API errors in this slice. Search and API error states
are deferred to `add-city-search` and `add-forecast`.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Shell implies geolocation or default city | Copy explicitly says the user chooses a city and no default forecast is shown |
| UI text drifts from Ukrainian-first tone | Unit test asserts no exclamation marks and no default city copy |
| Layout hides future regions | Responsive grid has named placeholder panels for search, forecast, and map |
