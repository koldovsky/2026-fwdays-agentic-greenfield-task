## Why

An applicant builds up sensitive, hard-to-recreate state — NMT scores, benefit
toggles, chosen elective, filters, a saved shortlist, and per-application statuses
— that must survive a page reload without a login (FR-STATE-01). Because those
scores and benefits are sensitive, the state must live only on the device
(`localStorage`, no backend — TC-STORAGE-01), with no third-party analytics on
score/benefit data (BC-PRIVACY-01) and minimal collection (NFR-PRIV-01). In a
Next.js 16 App Router world the read path must also be SSR-safe: no `window` on the
server and no hydration mismatch. This change backfills the spec for the storage
layer that already lives in `app/lib/storage.ts`, `app/lib/profileStore.ts`,
`app/hooks/useProfile.ts`, and `app/lib/status.ts`.

## What Changes

- Add a versioned `localStorage` persistence layer (`app/lib/storage.ts`, key
  `prokhidnyi.v1`) with typed `loadState` / `saveState` / `clearState` over the full
  `PersistedState` (scores, benefits, elective, field/city filters, saved shortlist
  with status + priority, and the compare list).
- Add an external profile store (`app/lib/profileStore.ts`) consumed via
  `useSyncExternalStore` with a stable server snapshot of defaults, hydrating from
  `localStorage` on first client subscription — SSR-safe, no hydration mismatch, no
  setState-in-effect. All mutations persist and notify subscribers.
- Add the `useProfile` hook (`app/hooks/useProfile.ts`) exposing the current
  profile plus module-stable action handlers (`setScore`, `setElective`,
  `toggleBenefit`, `toggleField`, `toggleCity`, `toggleSave`, `toggleCompare`,
  `advanceStatus`, `isSaved`, `inCompare`).
- Add the application-status progression (`app/lib/status.ts`): Saved → Submitted →
  Under review → Recommended → Enrolled, cycling from the last back to the first.
- Handle absent/corrupt storage by falling back to fresh defaults, and make writes
  non-fatal under quota/private-mode failures. All state stays on-device; no network
  calls and no analytics on sensitive fields.

## Capabilities

### New Capabilities
- `state-persistence`: the client-only, versioned `localStorage` layer, the
  SSR-safe external profile store + `useProfile` hook, and the application-status
  progression that let scores, filters, the shortlist, and statuses survive a
  reload without a backend.

### Modified Capabilities
<!-- None — Wave 1 foundation; consumed by `score-input`/`shortlist`, changes no existing spec. -->

## Impact

- **Code:** `app/lib/storage.ts` (versioned read/write/clear + `PersistedState`),
  `app/lib/profileStore.ts` (external store + mutations), `app/hooks/useProfile.ts`
  (hook + action API), `app/lib/status.ts` (status stages + `nextStatus`).
- **Requirements traced:** FR-STATE-01, TC-STORAGE-01, NFR-PRIV-01, BC-PRIVACY-01.
- **Downstream:** consumed by `score-input` and `shortlist` (any state that must
  survive reload); no backend, no cross-device sync (Phase 3).
