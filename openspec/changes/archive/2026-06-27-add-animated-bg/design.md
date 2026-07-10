# Design — add-animated-bg

## Goals / Non-goals

**Goals**

- Reflect WMO weather code as clear, overcast, rain, or snow treatments.
- Use today's sunrise/sunset for the active location to pick day/night palette.
- Cap particle count for low-end mobile performance.
- Degrade to static gradient when reduced motion is requested.

**Non-goals**

- Syncing the header clock to location timezone.
- Full-screen WebGL or heavy canvas shaders.

## Key Decisions

| Decision | Alternatives | Trade-off |
|----------|--------------|-----------|
| Reuse `fetchForecast` cache | Duplicate API module | Shares in-memory cache with forecast panel |
| Pure visual resolver in `lib/animated-bg/` | Inline Tailwind in component | Keeps `@trace FR-ANIM-*` unit tests framework-free |
| Canvas particles only when motion allowed | Always animate | Honors FR-ANIM-03 |
| Background mounted from `WeatherExplorer` | Page-level state lift | Gets active location without new global store |

## Error Handling

- No location selected: calm default clear-day gradient.
- Forecast fetch failure: keep last good visual or default gradient; no console noise.
