## Context

The dashboard is the first screen a user sees after authenticating. It must feel grounding and low-friction: metrics front-and-center, a short list of alternative actions, and a rotating story for motivation. The app already has a partially-built `app/page.tsx` that renders `<ProgressLoggingPanel>` — the dashboard extends and owns that route, composing panels around it.

The stack is Next.js (App Router), Zustand for local state, and TanStack Query for server-synchronized data. The `progress-logging` Zustand slice (`store/progress-logging.ts`) already owns streak, lifetime count, and user stories. The tone-engine slice (`store/tone-engine.ts`) owns `activeToneMode`. The STOP button is mounted in the root layout via `emergency-intercept`.

## Goals / Non-Goals

**Goals:**
- Render metrics panel (streak + lifetime) by reading from the `progress-logging` Zustand slice — no independent server fetch.
- Render a Top 3 alternative tasks panel with tone-aware hardcoded copy (MVP: no task management).
- Render a rotating success story, cycling user stories if any exist or falling back to 3 universal recovery stories.
- All user-facing copy is tone-aware via `tone-engine`.
- Route is protected: unauthenticated users redirect to sign-in.
- Offline-resilient: metrics come from Zustand (already persisted); tasks are static; fallback stories are static.

**Non-Goals:**
- User task creation or management (no CRUD for alternative tasks — deferred post-MVP).
- Server-driven story refresh on an interval (MVP: stories rotate on mount/manual advance).
- Personalised story recommendations (deferred post-MVP).
- Dashboard analytics or engagement metrics.

## Decisions

### D1 — Top 3 tasks: static, tone-aware copy for MVP

**Decision:** Hardcode 3 alternative-to-binging tasks as static strings keyed by tone mode, living in `lib/dashboard/copy.ts`. Do not create a database table or TanStack Query hook for tasks.

**Rationale:** No requirements scope task creation or management in MVP. Building a Supabase table and CRUD API for data that never changes during MVP is pure overhead. Hardcoded copy kept alongside the tone-engine pattern (`lib/<cap>/copy.ts`) is easy to replace with a real data source post-MVP without touching component logic.

**Alternative considered:** Fetching tasks from a Supabase `AlternativeTasks` table via TanStack Query. Rejected — no requirement for user-created tasks in MVP; the schema and API work would add scope without user-visible value.

---

### D2 — Metrics panel reads Zustand only, no own query

**Decision:** `<MetricsPanel>` reads `currentStreak`, `lifetimeDays`, and `todayCheckedIn` directly from the `progress-logging` Zustand slice. It issues no TanStack Query fetch of its own.

**Rationale:** The `progress-logging` spec explicitly requires: "Dashboard reads counters without fetching independently." Owning a second fetch would duplicate the query, create cache invalidation surface, and violate the data-ownership boundary. The slice is hydrated by `progress-logging` on app load; the dashboard benefits automatically.

**Alternative considered:** `useQuery` in `MetricsPanel` for streak data. Rejected — violates the progress-logging data ownership contract.

---

### D3 — Story rotation: client-side cycling, no timer

**Decision:** On mount, pick a random starting index into the available stories array (user stories if any exist, universal fallback array otherwise). Advance index manually via a "Next story" button (or swipe gesture on mobile). No auto-rotation timer.

**Rationale:** Auto-rotation timers create layout shift and can feel jarring during a vulnerable moment. Manual advancement gives the user control. Picking a random start means the same story doesn't always show first. FR-DASH-04 says "rotating" but does not mandate automated rotation.

**Alternative considered:** Timed auto-rotation (e.g., every 8 s). Rejected — accessible focus management for timed carousels is complex and the emotional context makes interruption-driven UX undesirable.

---

### D4 — Route protection: middleware redirect, not component-level guard

**Decision:** Protect `/` via Next.js middleware (`middleware.ts`) that checks the Supabase session cookie and redirects to `/sign-in` if absent.

**Rationale:** Middleware runs before the page renders, preventing any flash of authenticated content. Component-level guards (checking session in `useEffect`) cause a render-then-redirect flash that looks broken and leaks the dashboard layout to unauthenticated users momentarily.

**Alternative considered:** `redirect()` in a server component. Valid, but middleware is the idiomatic Next.js App Router pattern for auth and centralises protection for all future protected routes without per-page repetition.

---

### D5 — Component decomposition

Three focused components under `components/dashboard/`:

| Component | Responsibility |
|---|---|
| `MetricsPanel` | Reads Zustand; renders streak + lifetime counters with tone-aware labels |
| `TopTasksPanel` | Renders static top-3 alternative tasks from `lib/dashboard/copy.ts` |
| `StoryCarousel` | Reads user stories from Zustand; falls back to universal stories; manages rotation index |

`app/page.tsx` composes these three beneath the existing `<ProgressLoggingPanel>` import.

## Risks / Trade-offs

- **Metrics flash on cold load** → If TanStack Query hasn't hydrated the Zustand slice yet, counters show `0`. Mitigation: the `progress-logging` spec requires persisted Zustand state so last-known values render on first paint, avoiding the flash.
- **Static tasks feel generic** → The 3 hardcoded tasks won't match every user's situation. Mitigation: acceptable for MVP; task personalisation is explicitly deferred. Universal tasks (e.g., "Take a 5-minute walk", "Text someone you trust", "Drink a glass of water") cover the most common alternatives.
- **Universal fallback stories may feel repetitive** → Users who never write stories will always see the same 3. Mitigation: the stories include a CTA to write a personal story, nudging users toward contributing their own.
