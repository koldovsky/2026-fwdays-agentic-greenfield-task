## Why

The product's job is not finished when the applicant sees a good list — it ends
when they commit to a shortlist and carry those applications through the season.
US-5 covers both halves: save the options worth applying to, and track each
application as it moves through the admissions stages. Because the season spans
weeks and multiple devices/sessions, the shortlist and its statuses must survive
a reload, and an empty list must guide a first-time user toward saving from their
recommendations rather than showing a dead end (`FR-LIST-01`, `FR-LIST-02`,
`FR-STATE-01`, `FR-UX-01`).

This slice adds the `shortlist` capability: a personal saved list with per-item
status tracking. It depends on `state-persistence` (for the localStorage-backed
store), `recommendations` (the ★ save entry point), and `program-data`; it may
feed selection into `comparison`.

## What Changes

- Add a saved-list view (`SavedList`) rendering the applicant's saved programs.
- Add/remove a program to/from the personal list via the ★ toggle on
  recommendation cards and in the detail modal (`FR-LIST-01`).
- Track a per-item application status advancing through the five stages
  Збережено → Подано → Розглядається → Рекомендовано → Зараховано, advanced by
  clicking the status badge and cycling back to the first stage after the last
  (`FR-LIST-02`).
- Persist the saved list and each item's status across reloads via the
  `state-persistence` store (`FR-STATE-01`).
- Render an empty-list state with a hint to save options from recommendations
  with the ★ button (`FR-UX-01`).

## Capabilities

### New Capabilities
- `shortlist`: the personal saved list — add/remove programs, per-item
  five-stage application-status tracking, persistence of list + statuses across
  reloads, and an empty-list hint pointing at the ★ save action.

### Modified Capabilities
<!-- None — new capability; it reads/writes the saved slice of the shared
persisted profile owned by state-persistence and consumes the recommendations
save entry point without changing them. -->

## Impact

- **Code:** `app/components/planner/SavedList.tsx`; consumes
  `app/lib/profileStore.ts` (`saved`, `toggleSave`, `advanceStatus`),
  `app/lib/status.ts` (`STATUSES`, `STATUS_MODIFIER`, `nextStatus`),
  `app/lib/storage.ts` (`SavedEntry`, persistence), `app/lib/programs.ts`, and
  `app/lib/format.ts`.
- **Requirements traced:** `FR-LIST-01`, `FR-LIST-02`, `FR-UX-01`, and
  `FR-STATE-01` (persistence via `state-persistence`); plus `NFR-A11Y-01`
  (status badge not color-only) and `BC-LANG-01` (Ukrainian copy) from
  `app-shell`.
- **Downstream:** the saved set may feed `comparison` selection. No backend; the
  store is `localStorage`-only per `TC-STORAGE-01` / `NFR-PRIV-01`.
