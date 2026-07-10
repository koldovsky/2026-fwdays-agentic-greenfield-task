# Requirements — TinyStart

Last updated: 2026-07-10

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, tests,
PRs, and recordings reference these IDs to keep traceability intact.

Refer to [docs/product-brief.md](product-brief.md) for narrative context.
Refer to [docs/APP_SPEC.md](APP_SPEC.md) for detailed screen inventory, data
model, and development phases.

## ID conventions

| Prefix   | Meaning                    | Example                                      |
| -------- | -------------------------- | -------------------------------------------- |
| `FR-*`   | Functional Requirement     | `FR-FOCUS-01` — user starts a focus session  |
| `NFR-*`  | Non-Functional Requirement | `NFR-PERF-01` — focus start < 1 s            |
| `TC-*`   | Technical Constraint         | `TC-STACK-01` — Next.js 16 App Router        |
| `BC-*`   | Business / UX Constraint   | `BC-UX-01` — timer never flashes red         |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

## Functional requirements

### Shell & navigation

| ID          | Description                                                                                           | Status   |
| ----------- | ----------------------------------------------------------------------------------------------------- | -------- |
| FR-SHELL-01 | App routes: `/` (Today Home), `/tasks/[id]` (task detail), `/focus/[taskId]` (focus session), `/recap` (daily recap, P1) | shipped |
| FR-SHELL-02 | MVP navigation: Home, Focus (contextual), Task detail; full task list optional if time-constrained    | shipped |
| FR-SHELL-03 | Layout is responsive; focus mode usable on mobile web                                                 | shipped |
| FR-SHELL-04 | Dark mode follows system preference (`prefers-color-scheme`) — **dropped for MVP**, conflicts with `design.md` §2 (light-only). Revisit in V1. | dropped  |

### Today Home (capability `today-home`)

| ID          | Description                                                                                           | Status   |
| ----------- | ----------------------------------------------------------------------------------------------------- | -------- |
| FR-HOME-01  | Home shows time-aware greeting and a hero card with the recommended next task                         | shipped |
| FR-HOME-02  | Hero card displays task title, first step preview, motivation snippet (if set), primary CTA "Start focus", secondary actions "Break down" and "Not today" | shipped |
| FR-HOME-03  | Inline quick-add input on Home for one-line task capture                                              | shipped |
| FR-HOME-04  | Empty state: illustration + one-line onboarding ("Add your first task")                             | shipped |
| FR-HOME-05  | "Not today" snoozes the task until tomorrow without deletion; no overdue styling                      | shipped |
| FR-HOME-06  | Micro recap strip shows "Today: X min focused" on Home                                              | shipped |
| FR-HOME-07  | Recommendation priority: pinned/last active → active task with incomplete steps → oldest active not snoozed → empty prompt | shipped |

### Quick capture (capability `quick-capture`)

| ID            | Description                                                                                         | Status   |
| ------------- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-CAPTURE-01 | User adds a task in one line from Home or `/tasks/new`                                              | shipped |
| FR-CAPTURE-02 | Optional energy tag on task: low, medium, or high                                                   | shipped |

### Motivation bridge (capability `motivation-bridge`)

| ID               | Description                                                                                      | Status   |
| ---------------- | ------------------------------------------------------------------------------------------------ | -------- |
| FR-MOTIVATION-01 | Task detail includes optional textarea: "Why does this matter to me?" — free-form multi-word text; whitespace-only input clears the field; no trim-on-keystroke while editing | shipped |
| FR-MOTIVATION-02 | Motivation snippet visible on Home hero card when set                                              | shipped |

### Task detail & breakdown (capability `task-breakdown`)

| ID         | Description                                                                                          | Status   |
| ---------- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-TASK-01 | Task detail: editable title, motivation bridge, optional energy tag, sub-steps list, actions (Start focus, Mark complete, Archive, Cancel) | shipped |
| FR-TASK-02 | User can add 3–7 ordered sub-steps manually                                                          | shipped |
| FR-TASK-03 | User can reorder and delete sub-steps; mark individual steps complete                                | shipped |
| FR-TASK-04 | All edits autosave with 1200ms debounce (`AUTOSAVE_DEBOUNCE_MS`); title and motivation flush on blur; pending save cancelled when user taps Cancel; breakdown is never lost mid-edit | shipped |
| FR-TASK-07 | Cancel on task detail reverts the task to its page-open snapshot, aborts pending autosave, and navigates to Home | shipped |
| FR-TASK-05 | Task card shows "Step 1 of N" progress after breakdown                                             | shipped |
| FR-TASK-06 | Task status: active, completed, or archived                                                          | shipped |

### Focus session (capability `focus-session`)

| ID          | Description                                                                                          | Status   |
| ----------- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-FOCUS-01 | User starts focus from Home or task detail with timer presets: 2, 5, 15, or 25 minutes               | shipped |
| FR-FOCUS-02 | User can extend session by +5 minutes during focus                                                   | shipped |
| FR-FOCUS-03 | "Too hard? Shrink it" suggests first sub-step only + 2-minute mode for low-motivation flow             | shipped |
| FR-FOCUS-04 | Focus view is full-screen: current step (large typography), step X of Y, countdown timer, minimal footer with task title only | shipped |
| FR-FOCUS-05 | Controls: Pause, +5 min, End session; no side nav, task list, or notification badges visible         | shipped |
| FR-FOCUS-06 | Paused state persists if user navigates away; resume prompt on return                                | shipped |
| FR-FOCUS-07 | During session, only current sub-step is highlighted; advance on "Done" or step checkbox             | shipped |
| FR-FOCUS-08 | User can start focus in ≤2 clicks from landing (including preset selection)                          | shipped |

### Completion flow (capability `completion`)

| ID             | Description                                                                                        | Status   |
| -------------- | -------------------------------------------------------------------------------------------------- | -------- |
| FR-COMPLETE-01 | On timer end: soft celebration with affirming copy, session duration, CTAs (Keep going, Take a break, Done for now) | shipped |
| FR-COMPLETE-02 | If all steps done during session, offer to mark task complete                                      | shipped |
| FR-COMPLETE-03 | Completed sessions update daily minutes on Home micro recap strip                                  | shipped |

### Daily recap (capability `daily-recap`, P1)

| ID          | Description                                                                                          | Status   |
| ----------- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-RECAP-01 | `/recap` shows minutes focused, tasks touched, steps completed for the day                             | shipped |
| FR-RECAP-02 | Recap uses forgiving language; no red metrics or guilt dashboard                                     | shipped |
| FR-RECAP-03 | Optional reflection: single-tap tags for what helped (music, breakdown, tiny start, etc.)          | shipped |

### Persistence (capability `storage`)

| ID            | Description                                                                                        | Status   |
| ------------- | -------------------------------------------------------------------------------------------------- | -------- |
| FR-STORAGE-01 | Tasks, steps, sessions, and daily stats persist in `localStorage` (or IndexedDB) — no auth for MVP | shipped |
| FR-STORAGE-02 | Data survives browser refresh; storage abstracted behind `lib/storage` module for future DB swap   | shipped |
| FR-STORAGE-03 | Focus session state (active/paused) persists across navigation                                     | shipped |

## Non-functional requirements

| ID           | Description                                                                                          | Status   |
| ------------ | ---------------------------------------------------------------------------------------------------- | -------- |
| NFR-PERF-01  | First focus session start < 1 s on mid-range laptop                                                   | shipped |
| NFR-PERF-02  | User can go from landing → focus session in under 30 seconds                                           | shipped |
| NFR-OFFLINE-01 | App works offline after first load (PWA nice-to-have)                                                | shipped |
| NFR-PRIV-01  | No analytics requiring PII in MVP; all data stays on device                                            | shipped |
| NFR-A11Y-01  | WCAG 2.1 AA contrast minimum; full keyboard navigation; screen reader labels for timer and progress  | shipped |
| NFR-A11Y-02  | No color-only state indicators; visible focus indicators                                               | shipped |
| NFR-A11Y-03  | Motion respects `prefers-reduced-motion`                                                             | shipped |
| NFR-BROWSER-01 | Latest Chrome, Firefox, Safari, Edge supported                                                       | shipped |
| NFR-DX-01    | `npm run lint && npm run typecheck && npm test && npm run build` pass on clean checkout                | shipped |

## Technical constraints

| ID           | Description                                                                                          | Status   |
| ------------ | ---------------------------------------------------------------------------------------------------- | -------- |
| TC-STACK-01  | Next.js 16 App Router; TypeScript strict; React 19                                                     | accepted |
| TC-STACK-02  | Tailwind CSS 4; calm visual direction per APP_SPEC (soft neutrals + one accent)                      | accepted |
| TC-STACK-03  | State: React state + URL for focus session; consider `zustand` if complexity grows                   | shipped |
| TC-STACK-04  | Persistence via `localStorage` for MVP; abstract behind storage module                                 | accepted |
| TC-STACK-05  | Unit tests for core logic: task CRUD, recommendation, timer state machine in `lib/`                  | shipped |
| TC-DEPLOY-01 | Vercel (or static export) for deployment                                                             | shipped |
| TC-DATA-01   | Data model: Task, TaskStep, FocusSession, DailyStats as defined in APP_SPEC §12                      | accepted |
| TC-PURE-01   | `lib/` is framework-free where possible: no `next/*` in pure logic modules                           | shipped |

## Business / UX constraints

| ID            | Description                                                                                         | Status   |
| ------------- | --------------------------------------------------------------------------------------------------- | -------- |
| BC-BRAND-01   | Tone: warm, direct, non-patronizing; examples: "Ready for a tiny start?", "5 minutes counts."; avoid "You failed", "Be disciplined" | shipped |
| BC-UX-01      | Timer never flashes red aggressively; optional gentle pulse near end only                           | shipped |
| BC-UX-02      | Snooze / not today without deleting tasks; no shame UI for pause, extend, or abandon              | shipped |
| BC-UX-03      | Maximum 1 primary CTA per screen; user starts focus in ≤2 clicks from landing                       | shipped |
| BC-UX-04      | One thing at a time: default view shows single active task; hide rest during focus                  | shipped |
| BC-UX-05      | No infinite scroll on task lists in MVP                                                             | shipped |
| BC-PRIVACY-01 | No user accounts, login, or cloud sync in MVP                                                       | accepted |
| BC-SCOPE-01   | Not clinical treatment, team PM, or enterprise collaboration                                        | accepted |
| BC-DEMO-01    | Course demo: user completes at least one 2–5 minute session without confusion; UI feels calm        | proposed |

## Out of scope (MVP)

- User accounts, login, cloud sync
- Payments / subscriptions
- Clinical claims or ADHD diagnosis content
- Social features, leaderboards
- Complex recurring tasks / cron
- Native mobile apps
- Email/push notifications
- AI-assisted task breakdown (manual only for course MVP)
- Focus sounds (defer to V1)
- JSON export / backup (defer to V1)
- Ukrainian localization (English first; i18n structure optional)

## MVP acceptance criteria

Traceable checklist for maker ≠ checker verification:

- [x] FR-CAPTURE-01, FR-MOTIVATION-01 — create task with title and optional multi-word motivation
- [x] FR-TASK-04, FR-TASK-07 — edits autosave (1200ms debounce, blur flush); Cancel reverts to page-open snapshot
- [x] FR-TASK-02, FR-TASK-03 — add and reorder at least 3 sub-steps
- [x] FR-FOCUS-01 — start focus session with 2/5/15/25 min presets
- [x] FR-FOCUS-04, FR-FOCUS-07 — focus view shows only current step and timer
- [x] FR-FOCUS-05, FR-FOCUS-02 — pause, extend, and end a session
- [x] FR-COMPLETE-03, FR-HOME-06 — completed sessions update daily minutes on Home
- [x] FR-STORAGE-01 — data persists across browser refresh
- [x] FR-SHELL-03, NFR-A11Y-01 — responsive and keyboard-accessible
