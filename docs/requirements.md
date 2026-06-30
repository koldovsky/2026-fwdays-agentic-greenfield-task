# PRD — Tempo (working name) · Personal Time Tracker

Last updated: 2026-06-29

This document is the **single source of truth** for what the product does and what
constraints govern it. Every requirement has a stable ID. Specs, tests, PRs, and
the demo recording reference these IDs to keep traceability intact.

Refer to [docs/product-brief.md](product-brief.md) for narrative context.

> Scope posture: **lean MVP through a full engineering cycle**, not a Toggl
> feature-clone. The reference app (Toggl Track) is large — workspaces, clients,
> billing, invoicing, profitability reports, 100+ integrations. We deliberately
> take a single-user core loop, one AI feature, and a pair of iOS surface
> integrations (home-screen widget + Dynamic Island), and push everything else to
> **Out of scope**. The product UI and this document are **English-only**.

## ID conventions

| Prefix  | Meaning                    | Example                                      |
| ------- | -------------------------- | -------------------------------------------- |
| `FR-*`  | Functional Requirement     | `FR-ENTRY-01` — user starts a timer          |
| `NFR-*` | Non-Functional Requirement | `NFR-SEC-01` — passwords hashed              |
| `TC-*`  | Technical Constraint       | `TC-STACK-01` — React Native (Expo)          |
| `BC-*`  | Business / UX Constraint   | `BC-SCOPE-01` — single-user only             |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

## Functional requirements

### Auth (capability `auth`)

| ID         | Description                                                                                          | Status   |
| ---------- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-AUTH-01 | User signs up with email + password; password validated for minimum strength                        | proposed |
| FR-AUTH-02 | User signs in with email + password; server issues a short-lived access JWT and a rotating refresh token | proposed |
| FR-AUTH-03 | User signs in with Google (OAuth 2.0 + PKCE); first Google sign-in provisions an account            | proposed |
| FR-AUTH-04 | Same verified email via password and Google resolves to one account, not two                        | proposed |
| FR-AUTH-05 | User signs out; the refresh token is revoked server-side                                             | proposed |
| FR-AUTH-06 | Requests to protected endpoints without a valid token return 401; the app routes back to the auth screen | proposed |

### App shell & navigation (capability `app-shell`)

| ID          | Description                                                                                  | Status   |
| ----------- | -------------------------------------------------------------------------------------------- | -------- |
| FR-SHELL-01 | Bottom-tab navigation: **Timer/History**, **Stats**, **Profile**                             | proposed |
| FR-SHELL-02 | Unauthenticated users see only the auth screen; the rest of the app is gated                 | proposed |
| FR-SHELL-03 | First-run empty state (no entries): hero copy + a prominent "Start your first entry" affordance | proposed |

### Theming (capability `theming`)

| ID          | Description                                                                                                | Status   |
| ----------- | --------------------------------------------------------------------------------------------------------- | -------- |
| FR-THEME-01 | User switches between **Light**, **Dark**, and **System** (follow OS) from settings; default is **Dark**   | proposed |
| FR-THEME-02 | The selection persists across launches and applies app-wide immediately, without a restart                 | proposed |
| FR-THEME-03 | All colors come from centralised **design tokens** (per DESIGN.md); no hardcoded colors in components       | proposed |
| FR-THEME-04 | Native surfaces (home-screen widget, Live Activity) follow the **system** appearance, not the in-app override — documented MVP simplification | proposed |

### Time entries (capability `time-entries`) — core loop

| ID          | Description                                                                                                       | Status   |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| FR-ENTRY-01 | User starts a timer with a free-text description; **at most one entry runs at a time** per user                   | proposed |
| FR-ENTRY-02 | User stops the running timer; duration = `stop − start` is computed and persisted                                | proposed |
| FR-ENTRY-03 | Starting a new timer while one is running stops the previous one first — no overlapping running entries           | proposed |
| FR-ENTRY-04 | User adds a manual entry by supplying explicit start and end times                                                | proposed |
| FR-ENTRY-05 | User edits an existing entry: description, start, end, tags                                                       | proposed |
| FR-ENTRY-06 | User deletes an entry                                                                                             | proposed |
| FR-ENTRY-07 | History list groups entries by **local calendar day**, newest first, with a per-day total                        | proposed |
| FR-ENTRY-08 | **Continue**: tapping a past entry starts a new running entry copying its description and tags                    | proposed |
| FR-ENTRY-09 | Duration formatting (`h:mm:ss`) is a **pure function** in a framework-free module                                 | proposed |
| FR-ENTRY-10 | An entry crossing midnight is attributed to its **start day** for stats in MVP (documented simplification)        | proposed |
| FR-ENTRY-11 | The single running entry is the one source of truth toggled by the app, the widget, and the Live Activity alike   | proposed |

### Tags (capability `tags`)

| ID        | Description                                                                              | Status   |
| --------- | ---------------------------------------------------------------------------------------- | -------- |
| FR-TAG-01 | User creates a tag (name + optional color)                                                | proposed |
| FR-TAG-02 | User assigns zero or more tags to an entry                                                | proposed |
| FR-TAG-03 | User renames or deletes a tag; deleting detaches it from entries and never deletes entries | proposed |
| FR-TAG-04 | User filters the history list by one or more tags                                         | proposed |

### Profile & stats (capability `profile-stats`)

| ID          | Description                                                                                   | Status   |
| ----------- | --------------------------------------------------------------------------------------------- | -------- |
| FR-STATS-01 | Profile screen shows the user's data: name, email, auth provider, avatar                       | proposed |
| FR-STATS-02 | Weekly bar chart of tracked hours per day for the last 7 local days                            | proposed |
| FR-STATS-03 | Totals shown: today, this week, all-time                                                       | proposed |
| FR-STATS-04 | Per-tag breakdown for the selected period (top tags by tracked time)                           | proposed |
| FR-STATS-05 | Aggregation (per-day, per-week, per-tag) is implemented as **pure functions** and unit-tested  | proposed |

### Home-screen widget (capability `home-widget`) — iOS

| ID          | Description                                                                                                          | Status   |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-WIDGET-01 | A home-screen widget shows the current state: running entry description + live elapsed, or "Not tracking"           | proposed |
| FR-WIDGET-02 | The widget exposes a one-tap **Start / Stop** toggle via an App Intent (interactive widget, iOS 17+); on older iOS it deep-links into the app and starts/stops there | proposed |
| FR-WIDGET-03 | The widget offers quick-start for up to 3 recent / most-used entries, starting that entry directly                  | proposed |
| FR-WIDGET-04 | Widget and app share state through an **App Group**; the widget reflects changes within the OS refresh budget       | proposed |
| FR-WIDGET-05 | Tapping the widget body deep-links to the relevant app screen                                                        | proposed |

### Live Activity / Dynamic Island (capability `live-activity`) — iOS

| ID         | Description                                                                                                            | Status   |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-LIVE-01 | While a timer runs, a Live Activity shows the running entry's description and a live-updating elapsed time on the Lock Screen | proposed |
| FR-LIVE-02 | Dynamic Island presentations: **compact** (elapsed), **expanded** (description + elapsed + Stop), **minimal**          | proposed |
| FR-LIVE-03 | A **Stop** control in the Live Activity / Dynamic Island stops the timer via an App Intent without opening the app     | proposed |
| FR-LIVE-04 | The Live Activity starts when a timer starts and ends when it stops; elapsed counts via the system timer text (no continuous push) | proposed |
| FR-LIVE-05 | Activity state is kept consistent with the app via ActivityKit updates and the shared App Group                       | proposed |

### Daily insight (capability `daily-insight`) — AI feature

| ID            | Description                                                                                                                    | Status   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-INSIGHT-01 | A short natural-language insight/forecast for today is generated from the user's recent history (last 14 days): pace, patterns, likely progress | proposed |
| FR-INSIGHT-02 | The insight is generated **server-side** (NestJS) via the LLM; the API key never reaches the client                            | proposed |
| FR-INSIGHT-03 | The insight is cached per user per local day; one generation per day unless the user explicitly refreshes                       | proposed |
| FR-INSIGHT-04 | The model receives a **pre-computed numeric summary** (totals, per-day series, tags), never raw rows, so it cannot fabricate numbers | proposed |
| FR-INSIGHT-05 | Output is constrained: ≤ 200 chars, **English**, no emojis, no invented figures beyond the supplied summary                     | proposed |
| FR-INSIGHT-06 | On LLM timeout or failure, fall back to a deterministic templated insight; never show an error or a blank card                  | proposed |

### Streaks (capability `streaks`, **optional**)

> Optional within the MVP doc — promote to core at scope sign-off or defer to Future.
> Included because it is cheap and is the project's strongest unit-test surface.

| ID           | Description                                                                                                  | Status   |
| ------------ | ----------------------------------------------------------------------------------------------------------- | -------- |
| FR-STREAK-01 | User sets a daily goal (hours) in profile settings                                                            | proposed |
| FR-STREAK-02 | A day "counts" toward the streak when tracked time ≥ goal, by local date                                      | proposed |
| FR-STREAK-03 | Current streak = consecutive counting days ending today or yesterday; shown on Profile and the Timer screen   | proposed |
| FR-STREAK-04 | Streak computation is a **pure function** over the daily-totals series, unit-tested for gaps and TZ edges      | proposed |

## Non-functional requirements

| ID            | Description                                                                                                  | Status   |
| ------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| NFR-PERF-01   | Timer start/stop reflects **optimistically** in the UI in < 100 ms; persistence happens in the background    | proposed |
| NFR-PERF-02   | History list stays smooth (virtualized) at 1 000+ entries                                                    | proposed |
| NFR-WIDGET-01 | Widget and Live Activity elapsed time stay accurate using the system timer text, not polling — no measurable battery drain | proposed |
| NFR-SEC-01    | Passwords hashed with argon2 (or bcrypt); access tokens short-lived; refresh tokens rotated on use           | proposed |
| NFR-OBS-01    | No unhandled errors or warnings on a healthy session; every failure degrades to a calm, visible state        | proposed |
| NFR-A11Y-01   | Interactive elements have accessible labels; UI respects OS font-scaling                                     | proposed |
| NFR-A11Y-02   | Color palette meets WCAG AA contrast in **both** light and dark themes                                        | proposed |
| NFR-COPY-01   | UI microcopy is centralised (English-only); no runtime i18n library in MVP                                    | proposed |
| NFR-COST-01   | LLM usage is bounded (one cached generation per user per day) to keep cost negligible                        | proposed |
| NFR-DX-01     | Backend `lint && typecheck && test && build` finishes in < 60 s on a clean checkout                          | proposed |

## Technical constraints

| ID           | Description                                                                                                       | Status   |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | -------- |
| TC-STACK-01  | React Native via **Expo** with a **Dev Client + prebuild** (managed-only JS is insufficient for native extensions); TypeScript strict | accepted |
| TC-STACK-02  | **NestJS** REST API (TypeScript); request validation via class-validator DTOs                                    | accepted |
| TC-STACK-03  | **PostgreSQL** with **Prisma** ORM; schema migrations via Prisma Migrate                                          | accepted |
| TC-STACK-04  | Auth: JWT access + rotating refresh tokens; **Google OAuth 2.0 + PKCE** for SSO                                   | accepted |
| TC-STACK-05  | Client server-state via TanStack Query (optimistic updates for timer actions)                                    | proposed |
| TC-STACK-06  | Charts via a react-native-svg-based library (victory-native or gifted-charts)                                     | proposed |
| TC-STACK-07  | LLM via the **Anthropic API**, invoked **only** from the NestJS backend                                          | accepted |
| TC-NATIVE-01 | iOS widget + Live Activity ship as **native extensions** added through Expo config plugins / prebuild (e.g. expo-apple-targets); not buildable in Expo Go | accepted |
| TC-NATIVE-02 | iOS surfaces use **WidgetKit + AppIntents** (interactive widgets), **ActivityKit** (Live Activities), and a shared **App Group**; min iOS 16.2 for interactive Live Activity controls, iOS 17 for interactive home-screen widgets | accepted |
| TC-NATIVE-03 | Extensions read shared state and dispatch App Intents into the app's start/stop logic — **no duplicate timer logic** in the extension (keeps TC-PURE-01 intact) | proposed |
| TC-PURE-01   | Core logic (duration, aggregation, streak, insight-input shaping) lives in **framework-free** modules — no Nest, no Prisma, no RN imports — for 100% unit-testability | proposed |
| TC-TEST-01   | Jest unit tests on the pure modules; the insight has an **evals** suite (fixture histories → assertions on shape and constraints). Native surfaces and E2E are verified on-device via the demo build | proposed |
| TC-DEPLOY-01 | Backend hosted on Railway/Fly/Render; mobile build via Expo EAS (dev build required to exercise widget + Live Activity) | proposed |

## Business / UX constraints

| ID           | Description                                                                                                | Status   |
| ------------ | --------------------------------------------------------------------------------------------------------- | -------- |
| BC-SCOPE-01  | **Single-user only** — no teams, workspaces, clients, or sharing                                           | accepted |
| BC-PLATFORM-01 | **iOS-first.** The widget and Dynamic Island target iOS; Android widget/notification parity is deferred  | accepted |
| BC-PRIVACY-01| No third-party analytics or trackers in the MVP                                                            | accepted |
| BC-BRAND-01  | UI is **English-only**; tone is calm and practical. Visual identity per DESIGN.md (individual, dark/blackwork-leaning aesthetic); **Dark is the default theme**, with a Light option via design tokens | proposed |
| BC-DEMO-01   | The repo and a 1–2 min demo are the primary artifacts; every functional requirement is demonstrable        | accepted |

## Out of scope (MVP)

- Projects and clients (tags provide grouping in MVP — projects are the top Future item)
- Android widget and ongoing-notification parity for the iOS surfaces
- An Apple Watch app / complication for start-stop
- Billable hours, rates, invoicing, profitability reports
- Teams, workspaces, sharing, approvals, timesheets
- Calendar and third-party tool integrations
- Pomodoro timer, automatic activity tracking, idle detection
- Offline-first sync (the app assumes connectivity in MVP)
- Push notifications and reminders beyond the Live Activity
- CSV / PDF export and detailed/summary report builders
- Web and desktop clients
