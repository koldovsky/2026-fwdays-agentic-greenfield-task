## Why

Once authenticated, users need a grounding home screen that surfaces their recovery progress, reminds them of healthier alternatives, and delivers rotating motivation — without this landing view, the app has no coherent destination after sign-in and the streak/story data owned by `progress-logging` has nowhere to render.

## What Changes

- Introduce the authenticated landing page (`/`) that renders immediately after sign-in.
- Render streak and lifetime counters sourced from the `progress-logging` Zustand slice (FR-DASH-02 data ownership stays with `progress-logging`).
- Render the Top 3 prioritized alternative tasks panel (FR-DASH-03).
- Render a rotating motivational success story; fall back to 3 hardcoded universal recovery stories if the user has none (FR-DASH-04).
- All copy is tone-aware via `tone-engine`.
- The persistent STOP button (FR-STOP-01) remains mounted at the viewport bottom across this view.

## Capabilities

### New Capabilities
- `dashboard`: Authenticated landing screen — metrics panel (reads from `progress-logging` store), Top 3 tasks panel, rotating story display with universal fallbacks, tone-aware copy throughout.

### Modified Capabilities

## Impact

- **New files**: `app/page.tsx` (or route group), dashboard React components, TanStack Query hook for Top 3 tasks, universal fallback story data, Zustand selector for streak/lifetime.
- **Reads from**: `progress-logging` Zustand slice (streak, lifetime counter, user stories).
- **Depends on**: `tone-engine` (all user-facing copy).
- **No breaking changes** to existing capabilities.
- **Offline**: metrics and tasks are cached via TanStack Query; fallback stories are static and always available.
