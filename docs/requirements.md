# PRD — Pause / Break Reminder

Last updated: 2026-06-27

This document is the **single source of truth** for what the product does and what
constraints govern it. Every requirement has a stable ID. Specs, tests, PRs, and
recordings reference these IDs to keep traceability intact.

Refer to [product-brief.md](product-brief.md) for narrative context, and to
`DESIGN.md` for the visual system and `AGENTS.md` for agent behavior rules.

## ID conventions

| Prefix   | Meaning                    | Example                                          |
| -------- | -------------------------- | ------------------------------------------------ |
| `FR-*`   | Functional Requirement     | `FR-REMIND-01` — compute the next reminder       |
| `NFR-*`  | Non-Functional Requirement | `NFR-MOTION-01` — reduced motion respected       |
| `TC-*`   | Technical Constraint       | `TC-PURE-01` — `lib/` is framework-free          |
| `BC-*`   | Business / UX Constraint   | `BC-CALM-01` — calm, no gamification             |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

## Functional requirements

### Shell & navigation

| ID          | Description                                                                                          | Status   |
| ----------- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-SHELL-01 | Single-screen PWA: a main "next break" view, plus Settings and Stats views reached from a quiet nav | proposed |
| FR-SHELL-02 | Mobile-first responsive layout; the breathing ring stays the focal point down to small phone widths | proposed |
| FR-SHELL-03 | First-run state when no settings are saved: calm defaults applied + a short intro line              | proposed |

### Settings (capability `settings`)

| ID            | Description                                                                                                       | Status   |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| FR-SETTINGS-01 | User sets `workStart`, `workEnd` (`"HH:MM"`), `workingDays`, `intervalMinutes`, `snoozeMinutes`, `enabled`, `soundEnabled`, and `soundChoice` (`ping`, `melody-10`, `melody-30`) | proposed |
| FR-SETTINGS-02 | Settings persist in `localStorage` under key `break-reminder:settings` and survive reload                       | proposed |
| FR-SETTINGS-03 | Defaults on first run: 09:00–18:00, Mon–Fri, interval 60 min, snooze 5 min, enabled, sound on                   | proposed |
| FR-SETTINGS-04 | Changing any setting recomputes the next reminder immediately                                                    | proposed |

### Reminder engine (capability `reminder-engine`, pure core)

| ID           | Description                                                                                                                           | Status   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-REMIND-01 | `computeNextReminder(settings, from): Date \| null` is a **pure function** in `lib/schedule/schedule.ts`; returns `null` when disabled | proposed |
| FR-REMIND-02 | A working window of a day is `[workStart, workEnd)` on a working day; the right bound is exclusive (exactly `workEnd` is outside)      | proposed |
| FR-REMIND-03 | Next reminder = `from + intervalMinutes`, clamped into the next valid working window: before `workStart` snaps to `workStart`; past `workEnd` or on a non-working day moves to the next working window's start | proposed |
| FR-REMIND-04 | `computeSnooze(settings, from): Date \| null` = `from + snoozeMinutes`, clamped by the same rule as FR-REMIND-03                       | proposed |
| FR-REMIND-05 | All engine functions are deterministic; the current time is passed as `from` and never read internally (see TC-PURE-01)               | proposed |

### In-app notifications (capability `notify`)

| ID           | Description                                                                                                        | Status   |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | -------- |
| FR-NOTIFY-01 | While the app is open, when the next-reminder time is reached, raise a Notification (Notification API) + in-app card | proposed |
| FR-NOTIFY-02 | The notification / card offers two actions: "Took a break" and "Snooze {n} min"                                    | proposed |
| FR-NOTIFY-03 | Notification permission is requested only on an explicit user action (enabling reminders), never silently on load  | proposed |
| FR-NOTIFY-04 | If permission is denied, fall back to the in-app card only; never raise an error                                   | proposed |
| FR-NOTIFY-05 | The selected local sound (`ping`, `melody-10`, or `melody-30`) plays with the notification only when `soundEnabled` is true | proposed |

### Statistics (capability `stats`)

| ID          | Description                                                                                                          | Status   |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-STATS-01 | Pressing an action writes a `BreakEvent { type: "done" \| "snoozed", timestamp }` to IndexedDB via Dexie (table `events`) | proposed |
| FR-STATS-02 | `aggregateStats(events, range): StatsSummary` is a **pure function** in `lib/stats/stats.ts`                         | proposed |
| FR-STATS-03 | Stats view shows breaks done vs snoozed per day as a calm bar chart                                                 | proposed |
| FR-STATS-04 | The chart updates reactively when a new event is recorded (`dexie-react-hooks` `useLiveQuery`)                       | proposed |
| FR-STATS-05 | Empty state is a plain Ukrainian-or-English invitation line, never a blank or an error                              | proposed |

### PWA (capability `pwa`)

| ID         | Description                                                                                                  | Status   |
| ---------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| FR-PWA-01  | A web app manifest enables install to the home screen (name, icons, theme color, `display: standalone`)     | proposed |
| FR-PWA-02  | A service worker caches the app shell for offline use after first load                                       | proposed |
| FR-PWA-03  | The service worker is for installability / offline only — no background push (see Out of scope)              | proposed |

## Acceptance examples — reminder engine

Concrete input/output cases that tests must cover (they back FR-REMIND-01..05).
Base settings: `workStart="09:00"`, `workEnd="18:00"`, `workingDays=[1,2,3,4,5]`,
`intervalMinutes=120`, `snoozeMinutes=5`, `enabled=true`. Reference dates:
2026-06-29 is Monday, 2026-07-03 Friday, 2026-07-04 Saturday.

| ID           | Function             | `from`                     | Expected     | Backs        |
| ------------ | -------------------- | -------------------------- | ------------ | ------------ |
| AC-REMIND-01 | computeNextReminder  | Mon 10:00                  | Mon 12:00    | FR-REMIND-03 |
| AC-REMIND-02 | computeNextReminder  | Mon 17:30                  | Tue 09:00    | FR-REMIND-03 |
| AC-REMIND-03 | computeNextReminder  | Fri 17:30                  | Mon 09:00    | FR-REMIND-03 |
| AC-REMIND-04 | computeNextReminder  | Sat 12:00                  | Mon 09:00    | FR-REMIND-03 |
| AC-REMIND-05 | computeNextReminder  | Mon 07:30 (`interval=60`)  | Mon 09:00    | FR-REMIND-03 |
| AC-REMIND-06 | computeNextReminder  | Mon 17:59                  | Tue 09:00    | FR-REMIND-02 |
| AC-REMIND-07 | computeNextReminder  | any, `enabled=false`       | `null`       | FR-REMIND-01 |
| AC-REMIND-08 | computeSnooze        | Mon 14:00                  | Mon 14:05    | FR-REMIND-04 |
| AC-REMIND-09 | computeSnooze        | Mon 17:58                  | Tue 09:00    | FR-REMIND-04 |
| AC-STATS-01  | aggregateStats       | done@Mon, done@Mon, snoozed@Tue (range Mon–Sun) | `done=2, snoozed=1`, byDay [Mon{2,0}, Tue{0,1}] | FR-STATS-02 |
| AC-STATS-02  | aggregateStats       | empty array                | `done=0, snoozed=0`, `byDay=[]` | FR-STATS-02 |

> Verification: each case must fail if the logic breaks. Confirm by mutation
> (temporarily introduce a bug — the test must turn red) before treating coverage
> as real. This is the maker≠checker gate for the engine.

## Non-functional requirements

| ID           | Description                                                                                              | Status   |
| ------------ | ------------------------------------------------------------------------------------------------------- | -------- |
| NFR-MOTION-01 | `prefers-reduced-motion` is respected everywhere; the app is fully usable and calm with zero animation | proposed |
| NFR-A11Y-01  | Lighthouse Accessibility ≥ 95; every interactive element has a visible focus style and accessible name  | proposed |
| NFR-A11Y-02  | Color palette meets WCAG AA contrast for text on `bg`, `surface`, `accent`, and `signal`                | proposed |
| NFR-PERF-01  | Lighthouse Performance ≥ 90 and PWA installability check passes on the production URL                    | proposed |
| NFR-OBS-01   | The runtime console is silent (no warnings, no errors) on a healthy session                              | proposed |
| NFR-DX-01    | `npm run lint && tsc --noEmit && npm test && npm run build` finishes in < 60 s on a clean checkout       | proposed |
| NFR-PRIVACY-01 | All data stays on-device; no network calls for app data, no analytics, no trackers                    | proposed |

## Technical constraints

| ID          | Description                                                                                                | Status   |
| ----------- | --------------------------------------------------------------------------------------------------------- | -------- |
| TC-STACK-01 | Next.js App Router; TypeScript strict; React                                                              | accepted |
| TC-STACK-02 | Tailwind CSS 4 — CSS-first tokens via the `@theme` directive in `globals.css` (see DESIGN.md), no v3 config file | accepted |
| TC-STACK-03 | Dexie.js for IndexedDB (statistics); `localStorage` for the settings object                              | accepted |
| TC-STACK-04 | Vitest for unit tests on `lib/`                                                                            | accepted |
| TC-STACK-05 | Serwist (`@serwist/next`) for the PWA service worker; not the unmaintained `next-pwa`                      | proposed |
| TC-PURE-01  | `lib/` is framework-free: no `next/*`, no `react`, no DOM globals — enables 100% unit-testability          | accepted |
| TC-FONT-01  | Fonts loaded via `next/font/google` (self-hosted, offline-friendly); see DESIGN.md typography             | accepted |
| TC-DEPLOY-01 | Vercel for hosting; preview URL per PR (optional for the homework)                                        | proposed |

## Business / UX constraints

| ID           | Description                                                                                              | Status   |
| ------------ | ------------------------------------------------------------------------------------------------------- | -------- |
| BC-CALM-01   | Visual identity follows DESIGN.md; tone is calm and pressure-free — no streaks, no gamification, no guilt | accepted |
| BC-PRIVACY-01 | No accounts, no backend, no analytics, no trackers; all data local                                     | accepted |
| BC-NOTIFY-01 | Notification permission requested only via explicit user action — never on page load                    | accepted |
| BC-DEMO-01   | The repo and a 1–2 min demo are the homework's primary artifacts; every requirement is demonstrable      | accepted |

## Out of scope (MVP)

- Background push, scheduled jobs, or reminders while the app is closed
- User accounts, server-side history or favorites, cross-device sync
- Native mobile app builds (Capacitor / Xcode)
- Multiple UI languages beyond the chosen one
- Calendar integration or team / shared features
