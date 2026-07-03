## Context

Applicant state (scores, benefits, elective, filters, shortlist, compare list) must
survive reload without login (FR-STATE-01), stay on-device only (TC-STORAGE-01,
BC-PRIVACY-01), and hydrate without SSR/hydration mismatch in Next.js App Router.

## Goals / Non-Goals

**Goals:**
- Versioned `localStorage` key `prokhidnyi.v1` with typed load/save/clear.
- External store + `useSyncExternalStore` with stable server defaults.
- `useProfile` hook exposing all mutations.
- Five-stage application status progression in `app/lib/status.ts`.
- Graceful fallback on absent/corrupt/quota-blocked storage.

**Non-Goals:**
- Backend sync, accounts, or cross-device state.
- Encrypting localStorage (MVP trusts device boundary per BC-PRIVACY-01).

## Decisions

### D1 — `useSyncExternalStore` over `useEffect` hydrate
Avoids setState-in-effect and guarantees server/client first paint match.

### D2 — Validate shape on load
Coerce or reset invalid fields (`saved`, `compare`, `scores`) so malformed payloads
cannot crash render.

### D3 — Module-stable action handlers
Mutations are defined once on the store module so child components don't recreate
callbacks every render.

## Risks / Trade-offs

- **Quota / private mode** → writes are non-fatal; reads fall back to defaults.
- **Schema evolution** → version key allows future migrations.
