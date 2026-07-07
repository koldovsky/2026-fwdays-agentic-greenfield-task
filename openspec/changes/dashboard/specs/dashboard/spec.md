## ADDED Requirements

### Requirement: Authenticated landing screen
The dashboard route (`/`) SHALL be accessible only to authenticated users. Unauthenticated requests SHALL be redirected to the sign-in route before any dashboard content is rendered.

#### Scenario: Authenticated user lands on dashboard
- **WHEN** an authenticated user navigates to `/`
- **THEN** the dashboard renders with the metrics panel, top tasks panel, and story carousel visible

#### Scenario: Unauthenticated user is redirected
- **WHEN** an unauthenticated request hits `/`
- **THEN** the user is redirected to `/sign-in` with no dashboard content rendered or flashed

---

### Requirement: Metrics panel displays streak and lifetime counters
The dashboard SHALL render a metrics panel that displays the user's current binge-free streak (consecutive binge-free days) and their total lifetime binge-free day count. These values SHALL be read from the `progress-logging` Zustand slice and SHALL NOT trigger an independent server fetch.

#### Scenario: Metrics render from Zustand slice
- **WHEN** the dashboard mounts and the `progress-logging` slice has been hydrated
- **THEN** the metrics panel shows the correct `currentStreak` and `lifetimeDays` values without issuing a separate database query

#### Scenario: Metrics render from persisted state on cold load
- **WHEN** the app loads cold (TanStack Query has not yet resolved)
- **THEN** the metrics panel renders the last-persisted values from the Zustand slice rather than showing `0` or a loading placeholder

#### Scenario: Metrics labels are tone-aware
- **WHEN** the active Tone Mode is `calm`, `rational`, or `auntie`
- **THEN** the streak and lifetime counter labels use copy appropriate to that tone mode (e.g., calm: "days of clarity"; rational: "consecutive binge-free days logged"; auntie: "days you showed up!")

---

### Requirement: Top 3 alternative tasks panel
The dashboard SHALL render a panel displaying exactly 3 alternative-to-binging tasks. These tasks SHALL use hardcoded, tone-aware copy for MVP and SHALL be prominently visible without scrolling on a standard mobile viewport.

#### Scenario: Panel renders 3 tasks
- **WHEN** the dashboard mounts
- **THEN** exactly 3 alternative task items are displayed in the tasks panel

#### Scenario: Task copy matches active tone mode
- **WHEN** the active Tone Mode changes
- **THEN** the task descriptions update to reflect the new tone without a page reload

#### Scenario: Panel is visible above the fold on mobile
- **WHEN** the dashboard renders on a viewport 375px wide × 667px tall (iPhone SE baseline)
- **THEN** the tasks panel is visible without the user needing to scroll

---

### Requirement: Rotating motivational success story
The dashboard SHALL display one success story at a time from a rotating pool. If the user has recorded success stories via `progress-logging`, the pool SHALL use those stories. If the user has no stories, the pool SHALL fall back to exactly 3 universal recovery stories each containing a call-to-action to write a personal story.

#### Scenario: User stories rotate when available
- **WHEN** the user has one or more `SuccessStory` entries in the `progress-logging` store
- **THEN** the story carousel shows a story from the user's pool and the user can advance to the next story

#### Scenario: Universal fallback stories show when no user stories exist
- **WHEN** the user has zero `SuccessStory` entries
- **THEN** the story carousel displays one of 3 hardcoded universal recovery stories

#### Scenario: Universal fallback story contains a call-to-action
- **WHEN** a universal fallback story is displayed
- **THEN** the story card includes a visible prompt encouraging the user to write their own success story

#### Scenario: Story starts at a random position on mount
- **WHEN** the dashboard mounts
- **THEN** the initially displayed story is selected at a random index from the available pool (not always the first item)

#### Scenario: User can manually advance to the next story
- **WHEN** the user activates the "next story" control
- **THEN** the carousel advances to the next story in the pool, wrapping around to the first story after the last

---

### Requirement: Tone-aware copy throughout the dashboard
All user-facing text on the dashboard (section headings, labels, motivational prompts, story CTAs) SHALL reflect the active Tone Mode from the `tone-engine` Zustand slice.

#### Scenario: Calm mode uses soft language without exclamations
- **WHEN** the active Tone Mode is `calm`
- **THEN** all dashboard copy is soft and non-judgmental with no exclamation marks

#### Scenario: Auntie mode uses high-impact language with exclamations
- **WHEN** the active Tone Mode is `auntie`
- **THEN** dashboard copy uses dramatic, fierce language and may include exclamation marks

#### Scenario: Rational mode uses data-driven language
- **WHEN** the active Tone Mode is `rational`
- **THEN** dashboard copy uses logical, metric-oriented vocabulary

---

### Requirement: Dashboard is offline-resilient
The dashboard SHALL remain usable and display meaningful content when the device has no network connectivity.

#### Scenario: Dashboard renders offline with persisted data
- **WHEN** the user opens the dashboard with no network connection
- **THEN** the metrics panel shows last-known values from persisted Zustand state, the tasks panel shows the static alternative tasks, and the story carousel shows either cached user stories or universal fallback stories

#### Scenario: No empty states or crash on offline load
- **WHEN** the dashboard renders offline
- **THEN** no panel shows an error or crashes; each panel renders its available data gracefully
