# OpenSpec Capabilities — TinyStart

Last updated: 2026-07-10 (task detail autosave, motivation input, Cancel — see changelog in `APP_SPEC.md` §21)

This document splits [`requirements.md`](requirements.md) into **OpenSpec capabilities** — bounded domains you implement as separate `openspec/changes/` proposals. Each capability maps to a stable folder under `openspec/specs/<name>/spec.md`.

Refer to [`APP_SPEC.md`](APP_SPEC.md) §16 for development phases and [`AGENTS.md`](../AGENTS.md) for agent workflow.

## Conflict-resolution policy (from `AGENTS.md`)

- Visual design wins from [`design.md`](design.md).
- Scope / behavior wins from [`requirements.md`](requirements.md).
- Where they disagree, this document explicitly names the winner and marks the losing requirement `dropped` or `deferred`.

---

## Markers in `requirements.md`

| Marker | Meaning | OpenSpec use |
|--------|---------|--------------|
| `(capability \`name\`)` | Bounded feature domain | One spec folder: `openspec/specs/<name>/spec.md` |
| `P1` (only on `daily-recap`) | Post-MVP — implement last | Defer that change until all P0 capabilities ship |
| No `P1` | Implicit **P0** | Core MVP — ship before `daily-recap` |

**Shell & navigation** (lines 26–33) has no capability marker — treat it as cross-cutting capability **`shell`**.

---

## Capability inventory

### 0. `shell` — no marker, required first

| IDs | Description | Owner notes |
|-----|-------------|-------------|
| FR-SHELL-01 | Routes: `/`, `/tasks/[id]`, `/focus/[taskId]`, `/recap` (P1) | `shell` scaffolds route files; `/tasks/new` route (from `FR-CAPTURE-01`) is owned by `quick-capture`. `/tasks` list and `/settings` from `APP_SPEC.md` §8 are **out of scope for MVP** — do not create the routes. |
| FR-SHELL-02 | MVP navigation: Home, Focus, Task detail | — |
| FR-SHELL-03 | Responsive layout; focus usable on mobile | Baseline layout in `shell`; each UI capability re-verifies its own responsive layout. |
| ~~FR-SHELL-04~~ | ~~Dark mode follows `prefers-color-scheme`~~ | **Dropped for MVP.** Conflicts with [`design.md`](design.md) §2 ("Light theme only. Do not follow `prefers-color-scheme` for MVP"). Update `requirements.md` status to `dropped`; revisit in V1. |

**A11y baseline (applied per capability, not deferred):** every UI change ships with keyboard order, visible focus rings, screen-reader labels, and `prefers-reduced-motion` respect (`NFR-A11Y-01`, `NFR-A11Y-02`, `NFR-A11Y-03`). See "A11y & test acceptance per capability" below.

**Cross-cutting requirements** (each row has an explicit owner so it can't fall through the cracks):

| Prefix | IDs | Owner |
|--------|-----|-------|
| Technical | TC-STACK-01, TC-STACK-02, TC-STACK-03, TC-DEPLOY-01 | `shell` (change #1) |
| Data types & persistence | TC-DATA-01, TC-STACK-04, TC-PURE-01 | `storage` (change #2) |
| Tests | TC-STACK-05 | Split per capability — see "A11y & test acceptance" below |
| DX gate | NFR-DX-01 | `shell` sets up scripts; every change must keep the gate green |
| Browser | NFR-BROWSER-01 | Verified in the a11y/perf pass (Phase 2, change #8) |
| Offline | NFR-OFFLINE-01 | **Deferred / non-blocking.** MVP does not ship a service worker. Revisit in V1 as PWA nice-to-have. |
| Privacy | NFR-PRIV-01, BC-PRIVACY-01 | `storage` |
| Brand & UX | BC-BRAND-01, BC-UX-01..05 | All UI capabilities; called out per capability below |
| Scope guardrail | BC-SCOPE-01 | Project-wide — every change proposal must justify against `requirements.md` out-of-scope list |
| Demo acceptance | BC-DEMO-01 | Phase 2 sign-off (after change #8, before `daily-recap`) |

---

### 1. `storage` — `(capability \`storage\`)`

| IDs | Description |
|-----|-------------|
| FR-STORAGE-01 | Tasks, steps, sessions, daily stats in `localStorage` / IndexedDB |
| FR-STORAGE-02 | Data survives refresh; abstracted behind `lib/storage` |
| FR-STORAGE-03 | Focus session serialization contract (active/paused) survives navigation and refresh |

**Also owns:**
- `TC-DATA-01` — canonical `Task`, `TaskStep`, `FocusSession`, `DailyStats` types (`APP_SPEC.md` §12).
- `TC-STACK-04` — `localStorage` persistence abstraction (`lib/storage`) for future DB swap.
- `TC-PURE-01` — pure-logic layer inside `lib/storage`: no `next/*` imports in the storage module.
- **Snooze clearing helper** — a read-side utility that treats a task with `snoozedUntil <= now` as un-snoozed. Timezone: interpret snooze boundary in the user's **local** timezone (calendar day). Consumed by `today-home` recommendation (`FR-HOME-05`, `FR-HOME-07`).
- **`DailyStats` aggregation contract** — pure functions over `FocusSession[]` returning `DailyStats` per local calendar day. Writer is `completion`; reader is `today-home`.
- `NFR-PRIV-01`, `BC-PRIVACY-01` — no PII leaves the device.

**Non-owner:** the resume prompt UI for a paused session lives in `focus-session`; `storage` only owns serialization.

**Depends on:** `shell`  
**Blocks:** all data features

---

### 2. `quick-capture` — `(capability \`quick-capture\`)`

| IDs | Description |
|-----|-------------|
| FR-CAPTURE-01 | One-line task add from Home or `/tasks/new` |
| FR-CAPTURE-02 | Optional energy tag: low, medium, high |

**Also owns (from `today-home`, MVP delta only):**

| ID | MVP delta owned here | Full delta owned by `today-home` |
|----|----------------------|----------------------------------|
| FR-HOME-03 | Inline quick-add input renders on Home | (no change — same input) |
| FR-HOME-04 | Empty-state illustration + onboarding line on Home | Time-aware greeting + hero card wrapping |

**Routes owned:** `/tasks/new` (from `FR-CAPTURE-01`).

**Motivation capture:** motivation is **not** part of quick-capture. `FR-MOTIVATION-01` is captured on task detail (`/tasks/[id]`) only. `APP_SPEC.md` §7 Flow A ("optional add why it matters" after quick add) is realized by navigating to task detail immediately after capture, not by embedding a motivation input in the quick-add form.

**Depends on:** `storage`

---

### 3. `motivation-bridge` — `(capability \`motivation-bridge\`)`

| IDs | Description |
|-----|-------------|
| FR-MOTIVATION-01 | Optional textarea on task detail: "Why does this matter to me?" — free-form multi-word text; no trim-on-keystroke |
| FR-MOTIVATION-02 | Motivation snippet on Home hero card when set |

**Depends on:**
- `storage` — persistence of `Task.motivation`.
- `task-breakdown` — hosts the input on task detail (`FR-MOTIVATION-01`).
- `today-home` — renders the snippet on the hero card (`FR-MOTIVATION-02`). This half is only visible once the full hero card ships in Phase 2.

**Delivery:** shipped inside the `add-task-breakdown` OpenSpec change (no standalone `add-motivation-bridge/`). A dedicated `openspec/specs/motivation-bridge/spec.md` still exists for traceability.

---

### 4. `task-breakdown` — `(capability \`task-breakdown\`)`

| IDs | Description |
|-----|-------------|
| FR-TASK-01 | Task detail: title, motivation, energy, steps, actions (Start focus, Mark complete, Archive, Cancel) |
| FR-TASK-02 | Add 3–7 ordered sub-steps manually |
| FR-TASK-03 | Reorder, delete, mark steps complete |
| FR-TASK-04 | All edits autosave (1200ms debounce; title/motivation flush on blur) |
| FR-TASK-05 | Card shows "Step 1 of N" after breakdown |
| FR-TASK-06 | Task status: active, completed, archived |
| FR-TASK-07 | Cancel reverts to page-open snapshot, aborts pending autosave, navigates Home |

**Depends on:** `storage`, `quick-capture`  
**Blocks:** `focus-session`

---

### 5. `focus-session` — `(capability \`focus-session\`)`

| IDs | Description |
|-----|-------------|
| FR-FOCUS-01 | Start focus with 2, 5, 15, or 25 min presets |
| FR-FOCUS-02 | Extend session by +5 minutes |
| FR-FOCUS-03 | "Too hard? Shrink it" — first sub-step + 2-min mode |
| FR-FOCUS-04 | Full-screen: current step, X of Y, countdown, minimal footer |
| FR-FOCUS-05 | Controls: Pause, +5 min, End; no side nav or badges |
| FR-FOCUS-06 | Paused state persists; resume prompt on return |
| FR-FOCUS-07 | Only current sub-step highlighted; advance on Done |
| FR-FOCUS-08 | Start focus in ≤2 clicks from landing |

**Related NFR / BC:** NFR-PERF-01, NFR-PERF-02, BC-UX-01, BC-UX-03, BC-UX-04

**Also owns:**
- **Resume-prompt UI** for `FR-FOCUS-06` (paused state persists; user sees resume prompt on return). Persistence contract itself is owned by `storage` (`FR-STORAGE-03`).
- Timer state machine tests (`TC-STACK-05`).

**Depends on:** `storage`, `task-breakdown`  
**Blocks:** `completion`

---

### 6. `completion` — `(capability \`completion\`)`

| IDs | Description |
|-----|-------------|
| FR-COMPLETE-01 | Timer end: soft celebration, duration, CTAs |
| FR-COMPLETE-02 | If all steps done, offer to mark task complete |
| FR-COMPLETE-03 | Completed sessions update daily minutes on Home |

**Also owns:**
- Writer side of the `DailyStats` aggregation defined in `storage`. On session end, appends to today's `DailyStats` (local calendar day).

**Depends on:** `focus-session`, `storage`  
**Feeds:** `today-home` micro recap (`FR-HOME-06`)

---

### 7. `today-home` — `(capability \`today-home\`)`

| IDs | MVP delta (inside `add-quick-capture`) | Full delta (inside `add-today-home`) |
|-----|----------------------------------------|--------------------------------------|
| FR-HOME-01 | — | Time-aware greeting + hero card |
| FR-HOME-02 | — | Hero: title, step preview, motivation snippet, CTAs |
| FR-HOME-03 | Inline quick-add renders on Home | (unchanged) |
| FR-HOME-04 | Empty-state illustration + onboarding line | (unchanged) |
| FR-HOME-05 | — | "Not today" snoozes until tomorrow (local day); no overdue styling |
| FR-HOME-06 | — | Micro recap strip: "Today: X min focused" (reads `DailyStats`) |
| FR-HOME-07 | **Minimal fallback:** show "oldest active task not snoozed" as the recommended task, to enable `APP_SPEC.md` §7 Flow B during Phase 1 demo. | Full priority algorithm: pinned/last active → active with incomplete steps → oldest active not snoozed → empty prompt. |

**Also owns:**
- Reader side of `DailyStats` aggregation (contract from `storage`, writer in `completion`).
- Snooze reset consumption — reads via `storage` snooze helper; no separate cron.

**Depends on:** `storage`, `quick-capture`, `task-breakdown`, `motivation-bridge`, `completion`

**Split rule:** the "MVP delta" column above is delivered inside the `add-quick-capture` change (see phase plan). Everything in the "Full delta" column is delivered inside `add-today-home` (Phase 2). Do not duplicate the same FR ID text — each delta references the ID and states which slice it delivers.

---

### 8. `daily-recap` — `(capability \`daily-recap\`, **P1**)`

| IDs | Description |
|-----|-------------|
| FR-RECAP-01 | `/recap`: minutes focused, tasks touched, steps completed |
| FR-RECAP-02 | Forgiving language; no red metrics or guilt |
| FR-RECAP-03 | Optional reflection tags (music, breakdown, tiny start, etc.) |

**Explicitly out of scope:** the "banner after 3+ sessions" mentioned in `APP_SPEC.md` §7 Flow D is **not** an MVP or P1 requirement — no matching `FR-*` in `requirements.md`. Users reach `/recap` via direct navigation only. Add a new `FR-RECAP-*` if the banner is later prioritized.

**Depends on:** `storage`, `completion`  
**Implement last** — explicit `P1` marker in `requirements.md`.

---

## Non-functional requirements by capability

| IDs | Primary capability | Notes |
|-----|-------------------|-------|
| NFR-PERF-01, NFR-PERF-02 | `focus-session` | Focus start < 1 s; landing → focus < 30 s |
| NFR-OFFLINE-01 | **Deferred** | Not shipped in MVP. Revisit in V1 (PWA nice-to-have per `requirements.md`). |
| NFR-PRIV-01 | `storage` | No PII analytics; data on device |
| NFR-A11Y-01, NFR-A11Y-02, NFR-A11Y-03 | **every UI capability** | Ship a11y as part of each capability's DoD, not as a polish pass. See "A11y & test acceptance" below. |
| NFR-BROWSER-01 | `shell` (setup) + Phase 2 verification | Latest Chrome/Firefox/Safari/Edge smoke-tested during a11y/perf pass. |
| NFR-DX-01 | every change | Lint + typecheck + test + build must stay green on each PR. |

---

## A11y & test acceptance per capability

Every capability's OpenSpec change must include the rows below in its `spec.md` acceptance section. Do **not** defer a11y or tests to a separate "polish" change.

| Capability | A11y acceptance (per change) | Tests to add (`TC-STACK-05`) |
|------------|------------------------------|-------------------------------|
| `shell` | Skip-to-content, keyboard focus order across routes, `prefers-reduced-motion` honored globally. | Route smoke test (renders `/`, `/tasks/[id]`, `/focus/[taskId]`). |
| `storage` | n/a (headless). | Unit tests for CRUD, snooze helper, `DailyStats` aggregation, session serialization round-trip. |
| `quick-capture` | Input has visible focus ring + label; empty-state illustration has non-decorative `alt`. | Unit tests for task creation, `/tasks/new` action, energy-tag validation. |
| `task-breakdown` | Reorder is keyboard-operable; step checkboxes have accessible names; motivation textarea labeled; Cancel is keyboard-reachable (ghost). | Unit tests for add/reorder/delete/complete step, autosave, motivation persistence (including multi-word text with spaces). |
| `focus-session` | Timer + progress announced via `aria-live` polite; controls reachable by keyboard; no red-flash near end (`BC-UX-01`). | Timer state machine unit tests: presets, pause, extend +5, end, resume-after-nav, "shrink it" mode. |
| `completion` | Celebration copy readable by screen reader; CTAs keyboard-reachable. | Unit tests for `DailyStats` writer: minutes rounding, calendar-day boundary. |
| `today-home` | Hero CTA is the single primary action per screen (`BC-UX-03`); snooze does not use color-only cues. | Unit tests for recommendation priority (`FR-HOME-07`) with fixtures covering all 4 branches. |
| `daily-recap` (P1) | Metric labels are text, not color; reflection tags are keyboard-toggleable. | Unit tests for daily aggregation reader (uses `DailyStats` fixtures). |

---

## Business / UX constraints by capability

| IDs | Primary capability |
|-----|-------------------|
| BC-BRAND-01 | all UI capabilities |
| BC-UX-01 | `focus-session` |
| BC-UX-02 | `today-home`, `focus-session` |
| BC-UX-03 | `today-home`, `focus-session` |
| BC-UX-04 | `focus-session`, `today-home` |
| BC-UX-05 | `today-home` |
| BC-PRIVACY-01 | `storage` |
| BC-SCOPE-01 | project-wide |
| BC-DEMO-01 | Phase 2 sign-off (after change #8, before `daily-recap`) |

---

## Implementation order

Use the recommended OpenSpec change order below. The capability-marker sequence in `requirements.md` reflects the user journey, not build dependencies — do not read it as a build order.

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0 — Foundation                                        │
│  1. shell          routes, layout, design tokens            │
│  2. storage        types + lib/storage + persistence +      │
│                    snooze helper + DailyStats contract      │
├─────────────────────────────────────────────────────────────┤
│ Phase 1 — Core loop (MVP acceptance criteria)               │
│  3. quick-capture  + minimal Home delta:                    │
│                    FR-HOME-03 (quick-add), FR-HOME-04       │
│                    (empty state), FR-HOME-07 fallback       │
│                    ("oldest active not snoozed") so         │
│                    APP_SPEC Flow B is demonstrable          │
│  4. task-breakdown (+ motivation-bridge in same change)     │
│  5. focus-session                                           │
│  6. completion                                              │
├─────────────────────────────────────────────────────────────┤
│ Phase 2 — Polish                                            │
│  7. today-home     full hero, full FR-HOME-07 priority,     │
│                    snooze UI (FR-HOME-05), micro recap      │
│                    (FR-HOME-06)                             │
│  8. a11y/perf/browser pass                                  │
│                    verifies NFR-A11Y-*, NFR-PERF-*,         │
│                    NFR-BROWSER-01, BC-UX-*, BC-DEMO-01      │
├─────────────────────────────────────────────────────────────┤
│ Phase 3 — P1 (marker: P1)                                   │
│  9. daily-recap    only capability with explicit P1         │
└─────────────────────────────────────────────────────────────┘
```

**Rules from markers:**

1. Split on `(capability \`…\`)` → 8 named capabilities + `shell`.
2. Anything **without `P1`** → P0; ship before `daily-recap`.
3. **`P1`** on `daily-recap` → change #9.
4. **`storage`** → always change #2, regardless of document position.
5. **`FR-HOME-*`** rows split between change #3 (MVP delta) and change #7 (full delta) as tabulated in the `today-home` section.

---

## OpenSpec folder map

```
openspec/
  specs/
    shell/spec.md
    storage/spec.md
    quick-capture/spec.md        # also carries MVP delta of FR-HOME-03, -04, -07 (fallback)
    task-breakdown/spec.md
    motivation-bridge/spec.md    # traceability only — delivered in add-task-breakdown
    focus-session/spec.md
    completion/spec.md
    today-home/spec.md           # full delta of FR-HOME-01, -02, -05, -06, -07
    daily-recap/spec.md          # P1 — propose after MVP loop ships
  changes/
    add-shell/
    add-storage/
    add-quick-capture/           # ships motivation-bridge? NO. Ships FR-HOME MVP delta? YES.
    add-task-breakdown/          # ships motivation-bridge (no separate add-motivation-bridge/)
    add-focus-session/
    add-completion/
    add-today-home/              # ships full FR-HOME-* delta
    add-daily-recap/             # last
```

Each `spec.md` should use **GIVEN / WHEN / THEN** scenarios referencing stable requirement IDs (`FR-FOCUS-01`, etc.) for traceability back to `requirements.md`. When a single ID is split across two changes, each `spec.md` must state which slice it delivers (see `FR-HOME-*` split in the `today-home` section).

---

## MVP acceptance checklist → capabilities

| Acceptance criterion | Capability |
|---------------------|------------|
| Create task with title (quick-capture), then optionally add motivation on task detail (`/tasks/[id]`) | `quick-capture` → `task-breakdown` (+ `motivation-bridge`) |
| Add and reorder at least 3 sub-steps | `task-breakdown` |
| Start focus with 2/5/15/25 min presets | `focus-session` |
| Focus view shows only current step and timer | `focus-session` |
| Pause, extend (+5 min), and end session | `focus-session` |
| Completed sessions update daily minutes on Home | `completion` (writer) + `today-home` (reader) |
| Data persists across browser refresh | `storage` |
| Responsive and keyboard-accessible | Every UI capability (a11y is DoD per change, not a polish pass) |

---

## Suggested first OpenSpec changes

| # | Change folder | Proposal focus |
|---|---------------|----------------|
| 1 | `add-shell` | Routes (`/`, `/tasks/[id]`, `/focus/[taskId]`, `/recap`), layout shell, Tailwind tokens from `design.md`, DX gate scripts. **Does not** ship `/tasks`, `/tasks/new`, `/settings`, or `prefers-color-scheme`. |
| 2 | `add-storage` | `Task`, `TaskStep`, `FocusSession`, `DailyStats` types + `lib/storage` + snooze helper + `DailyStats` aggregation contract |
| 3 | `add-quick-capture` | Quick add + `/tasks/new` route + minimal Home delta (`FR-HOME-03/04` and `FR-HOME-07` fallback) |
| 4 | `add-task-breakdown` | Task detail, steps editor, motivation field (ships `motivation-bridge` in this change) |
| 5 | `add-focus-session` | Timer, presets, full-screen focus UI, resume-prompt UI, "shrink it" mode |
| 6 | `add-completion` | Celebration modal + `DailyStats` writer + daily minutes update |
| 7 | `add-today-home` | Full hero card, full recommendation priority, snooze, micro recap (reader of `DailyStats`) |
| 8 | *(a11y / perf / browser pass)* | Verifies `NFR-A11Y-*`, `NFR-PERF-*`, `NFR-BROWSER-01`, `BC-UX-*`, `BC-DEMO-01`. Not a new capability — may be a single verification proposal or absorbed into per-capability DoD. |
| 9 | `add-daily-recap` | `/recap` screen (P1). No banner trigger — MVP navigation only. |

---

*Derived from `docs/requirements.md` capability markers and `docs/APP_SPEC.md` §16 development phases.*
