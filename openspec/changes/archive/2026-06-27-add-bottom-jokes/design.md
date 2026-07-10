# Design — add-bottom-jokes

## Goals / Non-goals

**Goals**

- Keep jokes in pure `lib/bottom-jokes/` with deterministic selection.
- Rotate joke by location coordinates and calendar date.
- Show Open-Meteo and OSM credits with outbound links.

**Non-goals**

- Fetching jokes from the network.
- Personalised humour or tracking which joke was shown.

## Key Decisions

| Decision | Alternatives | Trade-off |
|----------|--------------|-----------|
| Footer mounted from `WeatherExplorer` | Read URL in isolated footer | Updates when client location changes without full reload |
| Static Ukrainian joke list in code | CMS | Matches BC-PRIVACY-01 and workshop offline demo |
| Simple string hash seed | crypto random | Reproducible unit tests and daily stability |

## Error Handling

- Missing location uses a neutral default seed; joke still renders.
- Credits always visible even when no city is selected.
