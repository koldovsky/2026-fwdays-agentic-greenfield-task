# Cadence — requirements

Numbered, traceable requirements derived from [`docs/product-brief.md`](product-brief.md) (the
ratified north star). The brief is the business narrative; this document is the testable source of
truth. Where the two ever disagree, fix this document to match the brief.

## Conventions

- Every requirement has a stable ID: `<PREFIX>-<CAPABILITY>-<NN>` (e.g. `FR-TIMER-03`,
  `NFR-SEC-01`). IDs are assigned once and **never renumbered or reused** — specs, tests, and
  commits reference them (e.g. `@trace FR-METR-03`, `Refs: FR-TIMER-02`). To retire a requirement,
  set its status to `dropped` in place; do not delete the row or reuse its number. Numbering is
  per capability, so adding `FR-TIMER-07` never disturbs `FR-COACH-*`.
- Prefixes: `FR-` functional (what the system does), `NFR-` non-functional (qualities and
  constraints), `TC-` technical constraints, `BC-` business constraints.
- Status values: `proposed` · `accepted` · `shipped` · `dropped`. FR/NFR start as `proposed` and
  flip to `accepted` at owner ratification; TC/BC record already-made decisions and start
  `accepted`.
- Each FR states **one** observable, pass/fail behavior (subject + action + condition). Exclusions
  are inline.
- Requirements capture **what** and its acceptance, not **how**. Exact formulas, window math, DB
  schema, zone thresholds, snapshot shape, and coach-memory structure are architecture.md decisions. A
  value left open is marked `(threshold: architecture.md)` or similar. Metrics are referenced by their
  brief IDs M1-M6; only the values the brief already ratifies appear here (deep block `>= 60 min`
  with zero pauses; baseline = trailing 30 days; consistency start-time window `+/-60 min`; zones
  green/yellow/red).

---

## 1. Functional requirements (FR)

### 1.1 Shell (capability `shell`)

| ID | Description | Status |
| --- | --- | --- |
| FR-SHELL-01 | App is a single-page application with exactly three routes: Timer (home), Stats, and Categories. | proposed |
| FR-SHELL-02 | A coach button floats bottom-right on all pages and opens a drawer showing the latest insight card plus a chat input. | proposed |

### 1.2 Authentication and accounts (capability `auth`)

| ID | Description | Status |
| --- | --- | --- |
| FR-AUTH-01 | System registers a new account from an email and password when the email is not already registered. | proposed |
| FR-AUTH-02 | System authenticates a user and establishes a session when a submitted email and password match a stored credential; it rejects the attempt otherwise. | proposed |
| FR-AUTH-03 | System logs the user out, ending the authenticated session. | proposed |
| FR-AUTH-04 | System signs a user in via Google OAuth. | proposed |
| FR-AUTH-05 | System signs a user in via GitHub OAuth. | proposed |
| FR-AUTH-06 | System rejects any request to a protected resource that lacks a valid authenticated session. | proposed |
| FR-AUTH-07 | System isolates data per user: an authenticated user can read and write only their own sessions, categories, metrics, and coach history, never another user's. | proposed |

### 1.3 Timer (capability `timer`)

| ID | Description | Status |
| --- | --- | --- |
| FR-TIMER-01 | System starts a session timer for a user-selected category and counts elapsed time up from zero. | proposed |
| FR-TIMER-02 | System pauses a running timer, opening a pause segment, and resumes on continue, closing that segment (net time excludes paused spans). | proposed |
| FR-TIMER-03 | System stops the active timer and, via a save modal capturing optional notes and a final category, persists the session. | proposed |
| FR-TIMER-04 | System discards the active session on request, only after an explicit confirmation prompt, without persisting it (no session, metrics, or heatmap effect); the discard is also surfaced by the undo notification (FR-NOTIF-01). | proposed |
| FR-TIMER-05 | System maps keyboard shortcuts to timer controls: Space starts/pauses, S stops and saves, Esc discards (Esc triggers the discard confirmation of FR-TIMER-04; semantics: A-8). | proposed |
| FR-TIMER-06 | System keeps a single server-authoritative active (running or paused) session per user, shown and controllable live from all the user's devices (web and extension) at once; there is never more than one active session per user, and starting a new one requires stopping or discarding the current one. | proposed |

### 1.4 Sessions (capability `sessions`)

| ID | Description | Status |
| --- | --- | --- |
| FR-SESS-01 | System persists a saved session recording its start time, end time, category, optional notes, and each pause stored as a discrete segment (pauses are not merged away). | proposed |
| FR-SESS-02 | System exposes both a gross duration (end minus start) and a net duration (gross minus total paused time) for every session. | proposed |
| FR-SESS-03 | System lets a user manually add a past session with start, end, category, optional notes, and optional pause segments — each pause entered with its own start and end time via an "add pause" control. | proposed |
| FR-SESS-04 | System lets a user edit an existing session's start, end, category, notes, and pause segments (add, adjust, or remove a pause with its start/end). | proposed |
| FR-SESS-05 | System lets a user delete a session. | proposed |
| FR-SESS-06 | System presents a session log listing the user's saved sessions. | proposed |

### 1.5 Categories (capability `categories`)

| ID | Description | Status |
| --- | --- | --- |
| FR-CAT-01 | System creates a category with a name, a color, and an optional description, kept as a flat list (no nesting). | proposed |
| FR-CAT-02 | System lets a user edit a category's name, color, and description. | proposed |
| FR-CAT-03 | System lets a user delete a category (handling of sessions that reference it: O-4 / architecture.md). | proposed |

### 1.6 Activity heatmap (capability `heatmap`)

| ID | Description | Status |
| --- | --- | --- |
| FR-HEAT-01 | System renders a GitHub-style calendar heatmap that shades each day by that day's tracked time (intensity bucketing: architecture.md). | proposed |
| FR-HEAT-02 | System switches the heatmap period among week, month, quarter, 6 months, and year. | proposed |

### 1.7 Stats page (capability `stats`)

| ID | Description | Status |
| --- | --- | --- |
| FR-STATS-01 | System shows summary tiles for total tracked time today, this week, this month, and all-time, plus the current streak. | proposed |
| FR-STATS-02 | System renders a bar chart of tracked time by day. | proposed |
| FR-STATS-03 | System renders a donut chart of tracked time by category. | proposed |
| FR-STATS-04 | System renders a per-category line chart of tracked time over time. | proposed |
| FR-STATS-05 | System displays a score card for each metric (M1-M5) showing its current value, its zone color, and its delta versus the user's baseline (per FR-METR-06). | proposed |

### 1.8 Metrics engine (capability `metrics`, M1-M6)

Baseline-relative scores over the session list, surfaced as score cards on Stats (FR-STATS-05).
Metrics are deterministic and separately unit-testable (NFR-DET-01); exact formulas, windows, and
thresholds live in architecture.md.

| ID | Description | Status |
| --- | --- | --- |
| FR-METR-01 | System computes M1 Volume: total tracked time for today, this week, and this month, plus the trailing 30-day daily average. | proposed |
| FR-METR-02 | System computes M2 Consistency Score on a 0-100 scale, blending day-to-day regularity and start-time stability (share of active days whose first session starts within `+/-60 min` of the user's median start); exact blend and formula: architecture.md. | proposed |
| FR-METR-03 | System computes M3 Focus / Deep Work: the count and total time of deep blocks (a single continuous session `>= 60 min` with zero pauses; any pause disqualifies the block) and the deep-work share of total time (share denominator: architecture.md). | proposed |
| FR-METR-04 | System computes M4 Context Switching: category-to-category jumps per active day plus pause-based interruptions, flagging days above the user's own baseline (flag threshold: architecture.md). | proposed |
| FR-METR-05 | System computes M5 Streaks: the current and longest run of consecutive active days. | proposed |
| FR-METR-06 | System reports M6 for each score as its value plus a delta versus the user's own trailing 30-day baseline, zoned green / yellow / red against that baseline (zone thresholds: architecture.md). | proposed |
| FR-METR-07 | System aggregates tracked time into per-day totals using the user's timezone; a calendar day with `>= 1` saved session is an active day (attribution of sessions that span midnight: O-2 / architecture.md). | proposed |

### 1.9 AI coach (capability `coach`)

A thin layer over a single structured call: the LLM interprets a computed metrics snapshot plus
stored conversation history and never calculates numbers itself. No agent framework or tool-use.

| ID | Description | Status |
| --- | --- | --- |
| FR-COACH-01 | System generates an insight card for the current week containing 2-4 short observations and 1-2 concrete recommendations; when nothing warrants advice, the card says so briefly rather than inventing advice. | proposed |
| FR-COACH-02 | Coach output contains no numeric value that is absent from the input snapshot (grounding rule; any fabricated number is a failure). | proposed |
| FR-COACH-03 | System answers a user's chat question grounded in the metrics snapshot and the stored conversation history. | proposed |
| FR-COACH-04 | System assembles each coach request from the current metrics snapshot plus the user's stored per-user conversation history (prior turns) and nothing else; raw session rows are never sent to the LLM. | proposed |
| FR-COACH-05 | Coach returns a fixed-shape structured JSON payload rendered as cards, not free-form prose. | proposed |
| FR-COACH-06 | Coach replies in the user's chosen language, English or Ukrainian, while the app UI stays English-only. | proposed |
| FR-COACH-07 | On a missing, malformed, or schema-invalid LLM response, the coach degrades gracefully: it does not crash, does not render fabricated numbers, and shows a defined fallback or error state. | proposed |

### 1.10 Browser extension (capability `extension`)

| ID | Description | Status |
| --- | --- | --- |
| FR-EXT-01 | Extension popup is bound to the same account as the web app and operates on server-authoritative timer/session state, so an action in one client is reflected in the other (web and extension never disagree). | proposed |
| FR-EXT-02 | A browser-level keyboard shortcut opens the extension popup with the timer ready to start. | proposed |
| FR-EXT-03 | Extension popup shows the current timer state and a category picker and supports Start, Pause, and Stop; Stop opens the same save modal (notes + final category) as the web app — the extension mirrors web behavior exactly. | proposed |

### 1.11 Undo notifications (capability `notifications`)

| ID | Description | Status |
| --- | --- | --- |
| FR-NOTIF-01 | After a session is discarded, edited, or deleted, the system shows a notification at bottom-left for 5 seconds describing the change and offering an Undo control; the action is reversible until the notification expires, after which it commits fully (commit/rollback mechanism: O-9 / architecture.md). | proposed |

---

## 2. Non-functional requirements (NFR)

| ID | Description | Status |
| --- | --- | --- |
| NFR-PERF-01 | Computing a user's metrics for an active window completes within a defined budget (target value: architecture.md). | proposed |
| NFR-DET-01 | Each metric is a deterministic pure function of the session list (identical input yields identical output) and is separately unit-testable. | proposed |
| NFR-COST-01 | Coach LLM usage stays within the Google AI Studio free tier on a single owner-supplied key; no paid API usage. | proposed |
| NFR-REL-01 | Malformed or unexpected input (bad session data, non-conforming LLM output) is logged and skipped; the system never crashes on it. | proposed |
| NFR-SEC-01 | Passwords are persisted only as salted, hashed values, never plaintext or reversibly encrypted. | proposed |
| NFR-SEC-02 | Authentication uses session cookies (not URL-embedded tokens) with standard protective attributes (specifics: architecture.md). | proposed |
| NFR-SEC-03 | Per-user isolation is enforced server-side, with every data query scoped to the authenticated user (behavior: FR-AUTH-07). | proposed |
| NFR-UX-01 | Core operation never requires more than Start / Stop / Pause (with Continue, Discard, and save details), and no deeper interaction is needed to track time. | proposed |
| NFR-DES-01 | No emoji appear anywhere in the UI or coach output; all iconography is proper SVG; typography and accent color depart from the prototype defaults (per the design-token skill). | proposed |
| NFR-DATA-01 | A saved, edited, or deleted session, and the active timer state, are reflected live across the user's open clients (web and extension) without a manual refresh or reload (live-update transport — polling vs push — is a architecture.md decision, O-8). | proposed |

---

## 3. Technical constraints (TC)

| ID | Description | Status |
| --- | --- | --- |
| TC-STACK-01 | Backend is Python + FastAPI with async SQLAlchemy 2.0, Alembic migrations, and PostgreSQL (per ADR 0001); every schema change ships an Alembic migration. | accepted |
| TC-STACK-02 | All configuration flows through the app config layer (pydantic-settings), is env-driven, and keeps no secrets in code; only `*.env.example` is committed. | accepted |
| TC-STACK-03 | Frontend is React + Vite + TypeScript (strict) with Tailwind, built against the project-owned design-token skill; all HTTP goes through `src/api.ts`; component libraries are allowed but restyled through the tokens. | accepted |
| TC-LLM-01 | Coach uses Gemma 4 31B (`gemma-4-31b-it`) via Google AI Studio free tier (single owner-supplied key) with structured JSON output, falling back to Gemini Flash (`gemini-flash-latest`, the stable current-flash alias); it is a single structured call over (snapshot + history) with no agent framework or tool-use. | accepted |
| TC-AUTH-01 | Sign-in integrates Google OAuth and GitHub OAuth. | accepted |
| TC-AUTH-02 | Authentication uses a session-cookie model with a single user role and no admin surface. | accepted |
| TC-EXT-01 | Extension is an MV3 popup-only thin client over the same API, with no content scripts and no per-site tracking; its shortcut is browser-level, not OS-global. | accepted |
| TC-SCOPE-01 | Out of scope (technical): no teams, sharing, or social features; no automatic, idle, or window/app tracking; no mobile app or offline mode; no billing, quotas, or admin panel; no data import/export UI (the DB is the source of truth); no agentic AI, tool-use, or multi-agent framework. | accepted |

---

## 4. Business constraints (BC)

| ID | Description | Status |
| --- | --- | --- |
| BC-COURSE-01 | The project is homework for the "Agentic Engineering: Greenfield" course, graded on the engineering process and trail rather than feature count, and delivered by the course submission deadline (specific date not fixed in the brief). | accepted |
| BC-COST-01 | Zero monetary budget: only free tiers and local services (free-tier LLM, Dockerized local PostgreSQL); no paid infrastructure or services. | accepted |
| BC-PROC-01 | Process rules: spec-first (a `docs/specs/` entry precedes code); maker is not checker is not judge; `scripts/verify.*` must be green before "done"; one branch per change with no direct commits to `main`; an independent review plus CodeRabbit; never commit secrets. | accepted |
| BC-TRAIL-01 | The repo must carry the full engineering trail: brief, requirements with stable IDs, specs, tests, evals, review findings, a demo video, and the frontend design-token skill. | accepted |

---

## 5. Resolved decisions (beyond the brief)

Decisions the brief did not state but the build requires; **confirmed by the owner on 2026-07-09**.
Recorded here so each is a documented rationale behind the requirement that references it (the
`A-*` IDs are stable and cited by requirements above), and so intentional omissions (e.g. A-5) have
a home — they cannot be expressed as an FR.

| ID | Decision (confirmed) |
| --- | --- |
| A-1 | Day attribution uses a single per-user timezone, **browser-detected** (no profile setting in v1). (FR-METR-07) |
| A-2 | Change reflection is **live** across the user's open clients, not merely on next load; transport (polling vs SSE/WebSocket) is a architecture.md decision. (NFR-DATA-01, O-8) |
| A-3 | The one active session is a single server-authoritative session shared **live across all the user's devices** (web + extension) — not per-device, and never two concurrent active sessions. (FR-TIMER-06, FR-EXT-01) |
| A-4 | Discarded sessions are never persisted and never affect metrics, streaks, or the heatmap. (FR-TIMER-04) |
| A-5 | Email + password registration in v1 requires **no email verification and no password reset** (both intentionally out of scope). |
| A-6 | Manual add/edit **can include pause segments**: the form has an "add pause" control with explicit start/end, and manual pauses feed M3/M4 exactly like live-timer pauses. (FR-SESS-03, FR-SESS-04) |
| A-7 | The coach reply language is user-selectable (English or Ukrainian) with **English default**; the app UI is English-only. (FR-COACH-06) |
| A-8 | Shortcut mapping: **Space starts/pauses, S stops and saves, Esc discards** — and **discard always shows a confirmation prompt** before proceeding. (FR-TIMER-04, FR-TIMER-05) |

---

## 6. Acceptance edge cases

Critical scenarios the build must pass; each references the requirements it exercises.

| # | Scenario | Expected behavior |
| --- | --- | --- |
| E-1 | Empty history (no sessions). | Metrics compute without error and return well-defined empty/zero values; the coach handles the empty snapshot gracefully. (FR-METR-01..07, FR-COACH-07) |
| E-2 | A single session only. | Metrics compute; baseline-dependent scores degrade gracefully as low-confidence rather than erroring. (FR-METR-02, FR-METR-06) |
| E-3 | A session spanning midnight. | The session is attributed to the correct day(s) per the day model and appears correctly in the heatmap and daily totals. (FR-METR-07, FR-HEAT-01) |
| E-4 | A session near a timezone/day boundary. | Day attribution uses the user's timezone so the session lands on the correct calendar day. (FR-METR-07) |
| E-5 | A continuous, zero-pause session of exactly 60 minutes. | Counts as a deep block (boundary is inclusive: `>= 60 min`). (FR-METR-03) |
| E-6 | An otherwise-qualifying session that contains a short pause. | Does NOT count as a deep block (any pause disqualifies), and the pause registers as an interruption. (FR-METR-03, FR-METR-04) |
| E-7 | Baseline computed with fewer than 30 days of data. | Deltas and zones compute on available data and degrade gracefully (low-confidence handling: architecture.md); no crash. (FR-METR-06) |
| E-8 | A malformed or failed LLM response. | Logged, no crash; the coach shows a defined fallback/error state and renders no fabricated content. (FR-COACH-07, NFR-REL-01) |
| E-9 | Coach output contains a number absent from the snapshot. | Treated as a grounding failure and caught (the core eval criterion); the number is not shown as trusted output. (FR-COACH-02) |

---

## Open items for architecture.md

Brief ambiguities surfaced while writing these requirements; resolve in architecture.md / specs, not here.

| ID | Open item |
| --- | --- |
| O-1 | Exact metric math: M2 consistency blend, M4 switching flag threshold, zone (green/yellow/red) thresholds, heatmap intensity buckets, deep-work-share denominator. (FR-METR-02, FR-METR-03, FR-METR-04, FR-METR-06, FR-HEAT-01) |
| O-2 | Midnight-spanning session attribution: split across days vs. assigned to the start day. (FR-METR-07) |
| O-3 | Baseline behavior with fewer than 30 days of data: whether zones/deltas are shown and how low confidence is signaled. (FR-METR-06) |
| O-4 | Category deletion when sessions reference it: block, reassign, or soft-delete. (FR-CAT-03) |
| O-5 | Coach conversation-memory structure and history length/trimming under free-tier token and rate limits; "current week" window boundaries; snapshot schema. (FR-COACH-01, FR-COACH-03, FR-COACH-04) |
| O-6 | OAuth account linking: whether Google/GitHub sign-in with an existing email links to the same account or creates a new one. (FR-AUTH-04, FR-AUTH-05) |
| O-7 | Grounding enforcement mechanism: programmatic post-validation of output numbers against the snapshot vs. prompt-only. (FR-COACH-02) |
| O-8 | Live-update transport (polling vs SSE/WebSocket) and how it interacts with the 5-second undo window across devices: does a discarded/edited/deleted change (or a timer action) propagate to other devices immediately or only after the 5s commit? (NFR-DATA-01, FR-NOTIF-01, FR-TIMER-06) |
| O-9 | Undo mechanism for FR-NOTIF-01: optimistic delayed-commit vs. immediate write + compensating reverse; and specifically how "undo discard" restores an unsaved active-timer state (vs. undo edit/delete, which restore persisted rows). (FR-NOTIF-01) |
