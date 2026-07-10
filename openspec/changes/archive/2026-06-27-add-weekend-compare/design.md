# Design — add-weekend-compare

## Goals / Non-goals

**Goals**

- Keep pin/compare state in the shared WeatherExplorer client wrapper.
- Reuse existing forecast normalization and comfort helpers.
- Fetch forecasts for pinned cities in parallel when compare mode is on.
- Preserve calm inline loading/error copy.

**Non-goals**

- Persisting pins across reloads.
- Compare beyond the upcoming weekend days.

## Key Decisions

| Decision | Alternatives | Trade-off |
|----------|--------------|-----------|
| Compare mode replaces day-card grid | Split panel | Matches FR-COMPARE-02 wording and keeps layout readable |
| Pin dedupe by coordinate key | Dedupe by geocoding id | Works for Nominatim synthetic ids and map clicks |
| Pure pin/compare helpers in `lib/weekend-compare/` | Inline component logic | Keeps `@trace FR-COMPARE-*` unit tests framework-free |

## Error Handling

- Compare mode with zero pins: show calm hint to pin a city first.
- Partial forecast failures: inline message per column; other columns remain visible.
