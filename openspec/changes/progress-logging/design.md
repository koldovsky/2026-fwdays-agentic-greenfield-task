## Context

`progress-logging` is the data-ownership layer for streak and lifetime metrics. The `dashboard` capability renders these numbers (FR-DASH-02) but holds no logic — it reads from a shared Zustand slice. Two user actions feed the system:

1. **Daily check-in** — a one-per-calendar-day checkbox that marks the day binge-free and increments both the streak counter and the lifetime count.
2. **Success story entry** — a narrative text field, multiple submissions allowed per day.

The two actions are fully decoupled per FR-LOG-01: completing a success story does not log a binge-free day, and vice versa.

The app stack is Next.js App Router, Zustand (local state), TanStack Query (data sync), Supabase + Prisma (backend persistence). The capability must be tone-aware and offline-resilient (NFR-OFFLINE-01).

## Goals / Non-Goals

**Goals:**
- Single daily check-in (idempotent within a calendar day) that increments streak and lifetime counters.
- Streak reset logic: if yesterday has no check-in entry, the current streak resets to 0 before the new day's entry is recorded.
- Multiple success story entries per calendar day.
- Zustand slice exposing `currentStreak`, `lifetimeDays`, and `todayCheckedIn` so `dashboard` can render FR-DASH-02 without coupling.
- Optimistic UI updates via TanStack Query mutations; background sync to Supabase on reconnection.
- All user-facing copy (button labels, prompts, confirmations) wired through the tone-engine's `activeToneMode`.
- Offline-first: mutations queue locally and sync when online.

**Non-Goals:**
- Automatic check-in on wizard completion (wizard completion ≠ binge-free day — kept decoupled by design).
- Editing or deleting past check-in entries (MVP scope).
- Editing or deleting past success stories (MVP scope).
- Push notifications or reminders for daily check-in (post-MVP).
- Server-side streak calculation as primary source of truth (client calculates from stored log; server stores raw rows).

## Decisions

### D1 — Zustand slice: progress state exposed to dashboard

**Decision:** Create `store/progress-logging.ts` with a Zustand slice holding `currentStreak`, `lifetimeDays`, `todayCheckedIn`, and `stories: SuccessStory[]`. Persist the slice to `localStorage` so counters are available instantly on load before TanStack Query hydrates from the server.

**Rationale:** Same pattern as the `steppDraft` slice — `zustand/middleware/persist` handles hydration, SSR safety, and offline availability automatically. `dashboard` imports from this slice, keeping the data ownership boundary clean (progress-logging writes, dashboard reads).

**Alternative considered:** Server state only via TanStack Query, no Zustand. Rejected — counters would show 0 on first render until the fetch resolves, causing a jarring flash.

---

### D2 — Daily check-in idempotency: ISO date gate on client + server

**Decision:** Store `lastCheckedInDate: string | null` (ISO date, e.g. `"2026-07-05"`) in the Zustand slice and in the database. The UI disables the check-in affordance when `lastCheckedInDate === today`. The API route enforces the same constraint server-side (unique constraint on `userId + date` in the `BingeFreeLog` table).

**Rationale:** Client-side gate gives instant feedback without a round-trip. Server-side unique constraint is the safety net for concurrent sessions. Storing the date (not a boolean) enables streak calculation across days.

**Alternative considered:** Boolean `todayCheckedIn` flag only. Rejected — doesn't support streak calculation or multi-device conflict resolution.

---

### D3 — Streak calculation: client-derived, server log is source of truth

**Decision:** On app load, TanStack Query fetches all `BingeFreeLog` rows for the user (sorted descending by date). The client calculates `currentStreak` by counting consecutive days backward from today. `lifetimeDays` is the total row count. The Zustand slice is seeded from this calculation.

**Rationale:** Simple to implement, correct by construction. Raw log rows in Supabase are the authoritative record; the streak is always re-derivable. Avoids storing a mutable counter that can drift under offline/multi-device conditions.

**Alternative considered:** Storing streak as an integer column that increments/decrements on write. Rejected — mutable aggregates diverge under network partitions and require compensating transactions.

---

### D4 — Success stories: separate table, multiple per day

**Decision:** Success stories are stored in a `SuccessStory` table (separate from `BingeFreeLog`) with columns `id`, `userId`, `content: text`, `createdAt`. No unique constraint on `userId + date` — multiple entries per day are allowed per FR-LOG-03.

**Rationale:** Decoupled from the daily check-in table per FR-LOG-01. Clean schema that mirrors the product intent (stories are milestone records, not daily quotas).

**Alternative considered:** Storing stories as a JSONB array on the `BingeFreeLog` row. Rejected — couples the two actions in the DB layer, makes per-story querying awkward.

---

### D5 — TanStack Query: optimistic mutations + offline queue

**Decision:** Use `useMutation` for check-in and story submission with `onMutate` optimistic updates against the Zustand slice. TanStack Query's retry and `networkMode: 'offlineFirst'` handles queuing mutations when offline.

**Rationale:** Consistent with TC-STACK-03 and the offline-pwa requirement. Optimistic updates keep the UI responsive regardless of connectivity.

**Alternative considered:** Manual `fetch` calls with local state fallback. Rejected — duplicates retry/backoff logic that TanStack Query provides.

---

### D6 — Copy: tone-keyed constant maps in `lib/progress-logging/copy.ts`

**Decision:** Hardcode all progress-logging copy (check-in button label, story prompt, confirmation messages, streak display strings) in `lib/progress-logging/copy.ts` as a map keyed by `ToneMode`. Components read copy via a `useProgressCopy()` hook, matching the pattern in `lib/emergency-intercept/copy.ts`.

**Rationale:** TC-TEXT-01, BC-BRAND-01 (no `!` in calm mode). Consistent with the established tone-engine pattern — trivial to swap a dynamic source post-MVP.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Streak calculation is O(n) over all log rows | For MVP, a user's log will be small (< 365 rows). Cache the calculated value in Zustand; only recalculate on mutation or page load. |
| Clock skew between devices causes duplicate check-in on same calendar day | Server enforces unique constraint on `userId + date`; client shows the constraint error gracefully ("Already logged today"). |
| `localStorage` unavailable | Zustand slice falls back to in-memory state (same pattern as `emergency-intercept`); counters reset on reload but UX still functions. |
| Success story data privacy | Stories are personal health data — Supabase Row Level Security (RLS) policies must restrict reads to `auth.uid() = userId`. |
