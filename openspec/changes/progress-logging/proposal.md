## Why

Users need a lightweight, low-friction way to mark a binge-free day and record a success story — without those two actions being coupled. Without this capability, the streak and lifetime counters that anchor the dashboard's motivational value (FR-DASH-02) have no data source.

## What Changes

- Introduce a daily binge-free check-in UI: a single checkbox, one submission allowed per calendar day, that increments the user's current streak and total lifetime count.
- Introduce a success story entry flow: a separate action that records a narrative success entry; multiple entries allowed per day.
- Expose streak and lifetime counter data via a Zustand slice so the `dashboard` capability can render FR-DASH-02 without owning the logic.
- Persist logs to Supabase (via Prisma) and cache them locally through TanStack Query for offline resilience (NFR-OFFLINE-01).
- All user-facing copy is tone-aware via the existing `tone-engine` infrastructure.

## Capabilities

### New Capabilities
- `progress-logging`: Daily binge-free check-in (one per day, increments streak + lifetime), success story entry flow (multiple per day), streak/lifetime counter logic and Zustand slice.

### Modified Capabilities

## Impact

- **New files**: Zustand store slice for progress state, TanStack Query hooks for check-in and story mutations, Supabase-backed API routes, Prisma schema additions (`BingeFreeLog`, `SuccessStory` tables).
- **Dashboard dependency**: `dashboard` reads streak/lifetime from the Zustand slice; no data ownership change.
- **No breaking changes** to existing capabilities (`emergency-intercept`, `tone-engine`).
- **Offline**: local-first caching via TanStack Query with background sync when reconnected.
