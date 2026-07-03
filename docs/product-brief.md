# Product Brief — Tempo (working name) · Personal Time Tracker

> Companion to `docs/requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the narrative behind it. The product UI
> and this document are **English-only**; the tone is calm and practical
> (BC-BRAND-01).

## What this is

Tempo is a single-user iOS time tracker — a focused, individual take on the Toggl
Track core loop. You start a timer with a short description, stop it when you
switch tasks, and your day fills up as a clean list of entries grouped by day.
Tags let you slice that history, a simple stats screen shows where the time went,
and one small AI feature gives you a daily read on your own pace.

What makes it feel native rather than "an app you have to open": you can start and
stop tracking straight from a **home-screen widget**, and while a timer runs it
lives in the **Dynamic Island** and on the Lock Screen as a Live Activity with a
Stop control. The phone surfaces become the primary controls; the app is where you
review.

The product deliberately stops at a lean core plus these differentiators. The
reference app is broad; Tempo is one loop done end to end, with the engineering
process (specs, pure-function logic, tests, evals, a separate review pass) as the
real deliverable (BC-DEMO-01). It ships **Dark by default** — in line with its
blackwork-leaning identity — with a Light option and a System setting (FR-THEME-01).

## Who it is for

The single actor is **an individual tracking their own time** — a developer,
freelancer, or student who wants to see where the day goes without the overhead
of a team product. There is exactly one role. Everything is scoped to the signed-in
user; there is no sharing, no workspace, no other-people's-data (BC-SCOPE-01).
Authentication is by email + password or Google sign-in (FR-AUTH-01/02/03). The
product is iOS-first; Android parity for the phone surfaces is deferred
(BC-PLATFORM-01).

## The pain it addresses

Most time trackers built for individuals are either too heavy (workspaces,
clients, billing, approvals you will never use) or too dumb (a stopwatch with no
memory of what you did yesterday). On top of that, the friction of opening an app
to flip a timer is exactly why people forget to track.

Tempo keeps the surface tiny and moves the controls to where the friction is
lowest. One running timer at a time, a history you can actually read, tags for
grouping, a stats screen that answers "how am I doing this week?" at a glance —
and start/stop from the widget and the Dynamic Island so tracking costs one tap
without leaving what you're doing. The AI insight closes the loop: instead of
making you read a chart, it tells you in one sentence whether today is on pace.

## End-to-end usage

1. **Sign in.** The user signs up with email + password, or taps "Continue with
   Google" (FR-AUTH-01/03). The session is held by a short-lived access token with
   a rotating refresh token (FR-AUTH-02); protected calls without a valid token
   bounce back to the auth screen (FR-AUTH-06). On the very first run, with no
   entries yet, the app shows a hero and a single "Start your first entry"
   affordance (FR-SHELL-03).
2. **Start tracking — from anywhere.** The user starts a timer with a free-text
   description, either in the app or with a one-tap toggle on the home-screen
   widget (FR-ENTRY-01, FR-WIDGET-02). Exactly one entry runs at a time; starting
   a new one stops the previous (FR-ENTRY-03). All three surfaces — app, widget,
   Live Activity — toggle the same single running entry (FR-ENTRY-11).
3. **Watch it run.** While the timer runs it appears in the Dynamic Island and on
   the Lock Screen with a live-updating elapsed time, and a Stop control right
   there (FR-LIVE-01/02/03). The elapsed time counts via the system timer text, so
   it stays accurate without draining the battery (FR-LIVE-04, NFR-WIDGET-01).
4. **Stop, or continue.** Stopping — from the app, the widget, or the Dynamic
   Island — computes and persists the duration (FR-ENTRY-02, FR-LIVE-03). To repeat
   earlier work, the user taps a past entry, or a quick-start slot on the widget,
   to **continue** it: a new running entry copies the old description and tags
   (FR-ENTRY-08, FR-WIDGET-03).
5. **Fix the record.** Time tracked away from the phone is added as a manual entry
   with explicit start and end (FR-ENTRY-04); any entry can be edited or deleted
   afterward (FR-ENTRY-05/06).
6. **Read the day.** The history list groups entries by local day, newest first,
   with a per-day total (FR-ENTRY-07). The user filters by tags (FR-TAG-04) created
   and assigned along the way (FR-TAG-01/02).
7. **Read the week.** On the Stats screen, a weekly bar chart shows hours per day
   for the last seven days, alongside today / this-week / all-time totals and a
   top-tags breakdown (FR-STATS-02/03/04).
8. **Get the insight.** A small card shows a one-sentence read on today — derived
   from the last two weeks of history — telling the user whether they are on their
   usual pace (FR-INSIGHT-01). It is generated server-side from a pre-computed
   numeric summary, cached once per day, and falls back to a templated line if the
   model is unavailable (FR-INSIGHT-02/03/04/06).
9. **(Optional) Keep the streak.** If enabled, the user sets a daily-hours goal in
   settings; each day that meets the goal extends a Duolingo-style streak shown on
   Profile and the Timer screen (FR-STREAK-01/02/03).

## Key workflows in prose

- **The core loop.** Sign in, start a timer, stop it, glance at the day's total.
  This is the whole MVP's spine — `time-entries` on top of `auth` and `app-shell`.
- **Track without opening the app.** Flip the timer from the home-screen widget or
  the Dynamic Island; the app is only needed to review. This is the product's main
  reason to exist over a plain stopwatch.
- **Repeat yesterday's work.** Instead of retyping, the user continues a past entry
  — one tap in the app or on a widget quick-start slot, same description and tags,
  timer running (FR-ENTRY-08, FR-WIDGET-03).
- **Make sense of the week.** Open Stats, read the bar chart and the top tags, then
  read the AI insight for a plain-language summary of whether today is on track.
- **Stay consistent (optional).** Set a daily goal and let the streak hold the user
  accountable across days, turning a passive tracker into a light habit loop.

## MVP vs Future boundary

**In the MVP:** email/password + Google auth, the gated app shell, the
time-entries core loop (timer, manual entry, edit/delete, continue, day-grouped
history), tags with filtering, the profile + weekly stats, the **home-screen
widget** and **Dynamic Island Live Activity** for quick start/stop, **Light/Dark/
System theming** (Dark by default), and the AI daily insight — all single-user,
iOS-first. The `streaks` capability is included but **optional** (FR-STREAK-*), to
be promoted or deferred at scope sign-off.

**Future (deferred):**

- **Projects and clients** — the top deferred item; tags cover grouping for now.
- **Android** widget and ongoing-notification parity for the phone surfaces.
- An **Apple Watch** app / complication for start-stop.
- Billable hours, rates, invoicing, profitability reporting.
- Teams, workspaces, sharing, timesheets, approvals.
- Calendar and third-party integrations.
- Pomodoro, automatic activity tracking, idle detection.
- Offline-first sync, push reminders beyond the Live Activity, CSV/PDF export.
- Web and desktop clients.

## Operating principles

- **Lean through a full cycle.** A small surface taken all the way — spec, pure
  logic, tests, evals, review, demo — beats a broad surface that only "kind of
  works" (BC-DEMO-01).
- **One timer, many surfaces.** The single running entry is the one source of
  truth; the app, the widget, and the Live Activity are just controls over it, with
  no duplicate timer logic in the native extensions (FR-ENTRY-11, TC-NATIVE-03).
- **Pure core, testable by construction.** Duration, aggregation, streak, and the
  insight's input-shaping live in framework-free modules with no Nest, Prisma, or
  RN imports (TC-PURE-01), so the project's correctness claims rest on unit tests
  and evals (TC-TEST-01), not on "seems to work".
- **The model summarises, it does not invent.** The insight is fed pre-computed
  numbers, never raw rows, and is length- and tone-constrained, so it cannot
  hallucinate totals (FR-INSIGHT-04/05).
- **Honest under failure.** No external call or empty state produces a generic
  error page or a silent blank; failures degrade to a calm, visible state and the
  insight falls back to a deterministic line (NFR-OBS-01, FR-INSIGHT-06).
- **English-only and calm.** UI microcopy is centralised and English-only, the tone
  is practical, and the visual identity is individual and dark/blackwork-leaning per
  DESIGN.md (NFR-COPY-01, BC-BRAND-01). All color comes from design tokens, so
  Light/Dark/System theming is a token switch rather than per-component work
  (FR-THEME-01/03); the widget and Live Activity follow the system appearance
  (FR-THEME-04).
