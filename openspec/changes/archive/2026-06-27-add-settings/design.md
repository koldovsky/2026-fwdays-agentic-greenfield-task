## Context

Settings are the only user-tunable input to the engine. They must persist locally
(no backend, BC-PRIVACY-01) and feed the engine on every change. Per the architecture
rule, persistence stays thin in `src/storage/`, while the `Settings` type itself lives
in `lib/types.ts` (owned by `reminder-engine`).

## Goals / Non-Goals

**Goals:**
- One small read/write/merge module over `localStorage`.
- Defaults applied transparently when storage is empty or partial.
- A calm Settings view wired so edits recompute the next reminder.

**Non-Goals:**
- No engine logic here — recompute calls into `computeNextReminder`.
- No cross-device sync, no migrations beyond default-merge.

## Decisions

- **Default-merge on read.** `loadSettings()` reads the key, parses, and merges over
  defaults so missing/added fields are safe. Rationale: forward-compatibility and FR-SETTINGS-03.
  Alternative (throw on missing) rejected — first-run must never error.
- **Validate `"HH:MM"` and ranges on write.** Reject malformed times; clamp interval/snooze to
  sane minimums. Keeps bad data out of the engine.
- **State holds the single source of truth in React;** `saveSettings` persists on change and the
  view recomputes via the engine (FR-SETTINGS-04). Storage is a side effect, not the state owner.

## Risks / Trade-offs

- [Corrupt/old JSON in localStorage] → wrap parse in try/catch, fall back to defaults.
- [SSR has no `localStorage`] → access only in client components / effects (Next.js App Router).
