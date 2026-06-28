# Capabilities & order of implementation

Last updated: 2026-06-27

This document splits [requirements.md](requirements.md) into the capabilities we
implement with OpenSpec, and fixes the **order of implementation**. Each capability
maps to one OpenSpec change under `openspec/changes/`, and each change carries its own
`proposal.md`, `specs/<capability>/spec.md`, `design.md`, and `tasks.md`. See
[product-brief.md](product-brief.md) for intent and `DESIGN.md` for the visual system.

## Capabilities

The PRD already names six capability buckets. Each becomes one OpenSpec change:

| #   | Capability                | OpenSpec change       | Requirements covered              | Pure / testable?                                  |
| --- | ------------------------- | --------------------- | --------------------------------- | ------------------------------------------------- |
| 1   | `reminder-engine`         | `add-reminder-engine` | FR-REMIND-01…05, AC-REMIND-01…09  | ✅ fully pure (`lib/`)                            |
| 2   | `settings` (storage core) | `add-settings`        | FR-SETTINGS-02…03                 | partial (pure defaults/validation + thin storage) |
| 3   | `shell` (+ settings view) | `add-app-shell`       | FR-SHELL-01…03, FR-SETTINGS-01/04 | no (UI)                                           |
| 4   | `notify`                  | `add-notify`          | FR-NOTIFY-01…05                   | no (browser APIs)                                 |
| 5   | `stats`                   | `add-stats`           | FR-STATS-01…05, AC-STATS-01…02    | `aggregateStats` pure; rest UI/IndexedDB          |
| 6   | `pwa`                     | `add-pwa`             | FR-PWA-01…03                      | no                                                |

### Cross-cutting constraints (not standalone capabilities)

The `NFR-*`, `TC-*`, and `BC-*` rows are not capabilities — they are constraints
folded into the relevant change's spec and design:

- `TC-PURE-01` → governs `reminder-engine` and `stats` (logic stays in `lib/`).
- `NFR-MOTION-01`, `NFR-A11Y-01/02` → governs `shell` and `stats` (UI).
- `BC-NOTIFY-01` → governs `notify` (permission only on explicit action).
- `TC-STACK-03` → `settings` (localStorage) and `stats` (Dexie).
- `TC-STACK-05`, `NFR-PERF-01` → `pwa` (Serwist, installability).
- `BC-CALM-01`, `BC-PRIVACY-01`, `TC-STACK-02`, `TC-FONT-01` → apply app-wide.

## Order of implementation

Ordered by dependency — each step builds only on what is already shipped:

1. **`reminder-engine`** — the spine. Pure, zero-dependency, fully unit-testable.
   Defines the shared `Settings` type in `lib/types.ts` and the deterministic
   `computeNextReminder` / `computeSnooze`. The acceptance table (AC-REMIND-01…09)
   is the test oracle, including the maker≠checker mutation gate. Build first.
2. **`settings`** — split in practice: the **storage core** (`localStorage`
   persistence under `break-reminder:settings`, calm first-run defaults, validation)
   shipped with `add-settings`. The **Settings view** (editable fields, recompute-on-
   change, FR-SETTINGS-01/04) was relocated into `add-app-shell` because it needs the
   shell's DESIGN.md tokens and nav. Consumes the engine's `Settings` type.
3. **`shell`** — the single-screen PWA: layout, quiet nav (main / Settings / Stats),
   first-run intro, the breathing-ring signature with reduced-motion support, **and
   the Settings view** (folded in from `settings`). First visible app.
4. **`notify`** — Notification API + in-app due-break card, permission-on-action,
   two actions ("Took a break" / "Snooze {n} min"), optional sound. Needs the
   engine's due-time and the settings flags; emits the action signals stats records.
5. **`stats`** — the notify actions write `BreakEvent`s to IndexedDB (Dexie); the
   pure `aggregateStats` (AC-STATS-01…02) drives a calm, reactive bar chart. Needs
   notify to exist first (producer → consumer).
6. **`pwa`** — manifest + Serwist service worker, last, wrapping the finished shell
   for installability and offline. Nothing depends on it.

### Why this shape

- **Pure cores first** (1, and the pure slice of 5) — lock the deterministic,
  fully-testable logic before any UI exists.
- **Producers before consumers** — `notify` emits the events that `stats` reads.
- **Packaging last** — `pwa` caches a completed shell.

## Dependency graph

```
reminder-engine ──► settings ──► shell ──► notify ──► stats
                         │           ▲                  ▲
                         └───────────┘                  │
                                     shell ─────────────┘ (hosts Stats view)
                                     shell ──► pwa (caches the finished shell)
```

## Status

- ✅ `reminder-engine` — implemented, archived; living spec at `openspec/specs/reminder-engine/`.
- ✅ `settings` — storage core + view (the view shipped with `shell`); living spec at `openspec/specs/settings/` (4 reqs).
- ✅ `shell` (incl. relocated settings view) — implemented, archived, browser-verified; living spec at `openspec/specs/shell/`.
- ✅ `notify` — implemented, archived, browser-verified; living spec at `openspec/specs/notify/` (5 reqs).
- ✅ `stats` — implemented, archived, browser-verified; living spec at `openspec/specs/stats/` (4 reqs).
- ✅ `pwa` — implemented, archived, browser-verified; living spec at `openspec/specs/pwa/` (3 reqs).

**All six capabilities are implemented and archived — the project is feature-complete.**

All active changes pass `openspec validate --all --strict`. Track live progress in
[current-state.md](current-state.md); start the next change with `/opsx:apply`.
