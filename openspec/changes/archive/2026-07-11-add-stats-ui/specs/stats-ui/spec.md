## ADDED Requirements

Requirement text is authoritative in [`docs/requirements.md`](../../../../../docs/requirements.md);
each requirement below cites its stable FR id and restates the behavior in SHALL form as the OpenSpec
contract. This capability is **read-only rendering**: every value comes from the architecture §4.1
snapshot (`GET /api/stats/snapshot`, produced by slice 004) and **no metric is recomputed** here. Zone
colors and the "building" state are the snapshot's own fields (architecture §3.6 / §3.8) rendered per
DESIGN §7.3. All HTTP goes through `src/api.ts`; icons are inline SVG, never emoji (DESIGN §9,
NFR-DES-01). Scenarios map one-to-one to the component/page tests the test-engineer will write
test-first (RED).

### Requirement: Summary tiles of tracked time and streak (FR-STATS-01)
The system SHALL render a row of summary tiles on the Stats page showing total tracked time for today,
this week, this month, and all-time, plus the current streak, each value read directly from the
architecture §4.1 snapshot (`volume` and `streaks`) and formatted with tabular mono figures per
DESIGN §7.3; the tiles SHALL recompute nothing.

#### Scenario: Tiles render the snapshot values
- **GIVEN** the Stats page has loaded a snapshot with `volume.today_min`, `volume.week_min`, `volume.month_min`, `volume.all_time_min`, and `streaks.current`
- **WHEN** the summary tiles render
- **THEN** the Today, This Week, This Month, All-time, and Streak tiles each show the corresponding snapshot value, and no value is derived or recomputed in the client

#### Scenario: Empty history shows a calm first-run prompt, not a blank or error
- **GIVEN** an authenticated user with no saved sessions whose snapshot fetch succeeds with `volume.all_time_min = 0` (the empty-state trigger; a snapshot with history but `building` zones is NOT empty) (E-1)
- **WHEN** the Stats page renders
- **THEN** it shows a calm first-run prompt inviting the first session (DESIGN §10 empty) with the tiles reading zero, and it shows neither a blank card nor an error state

#### Scenario: A failed snapshot fetch shows a contained, retryable card
- **GIVEN** the Stats page whose `GET /api/stats/snapshot` request fails
- **WHEN** the page handles the failure
- **THEN** it renders a contained, card-level error message with a retry control (DESIGN §10 error) and never a full-screen error or a silent blank page

### Requirement: Bar chart of tracked time by day (FR-STATS-02)
The system SHALL render a bar chart of tracked time by day from the snapshot's `volume.per_day` series
(architecture §4.1), one bar per day, styled to the DESIGN §3 tokens per DESIGN §7.3 (rounded bars, no
gridline clutter, mono tabular tooltips).

#### Scenario: Bars render from the snapshot per-day series
- **GIVEN** a loaded snapshot whose `volume.per_day` lists `{date, min}` entries
- **WHEN** the bar-by-day chart renders
- **THEN** it draws one bar per `per_day` entry with height proportional to that day's `min`, reading the values from the snapshot without recomputing any daily total

#### Scenario: Loading shows skeletons with no layout shift
- **GIVEN** the Stats page while the snapshot request is still in flight
- **WHEN** the page renders its loading state
- **THEN** the chart and tile regions show skeletons matching their final footprint (cards keep their height) so no layout shift occurs when the data arrives (DESIGN §10 loading)

### Requirement: Donut chart of tracked time by category (FR-STATS-03)
The system SHALL render a donut chart of tracked time by category from the snapshot's `top_categories`
series — each entry `{id, name, color, week_min}` (the shipped slice-004 shape, `app/schemas/stats.py`
`TopCategoryRead`; top 5 by current-week net minutes) — coloring each arc from the entry's own
`color` field and keying it by `id`, so no name-based join against `listCategories()` is needed; it
SHALL recompute no per-category total.

#### Scenario: Donut arcs render from the snapshot category series
- **GIVEN** a loaded snapshot whose `top_categories` lists `{id, name, color, week_min}` entries
- **WHEN** the donut-by-category chart renders
- **THEN** it draws one arc per entry sized by `week_min` and colored from the entry's own `color` (keyed by `id`, no join against `listCategories()`), and recomputes no total

> **Known gap (metrics-snapshot-extension follow-up):** the shipped `top_categories` entry carries
> no `archived` flag, so this slice cannot grey archived categories with an "(archived)" suffix
> (DESIGN §7 / architecture §7). Deferred to the snapshot-extension follow-up that adds `archived`;
> until then archived categories render like any other (or are absent if the stats service queries
> active categories only). Flagged, not silently rendered as if distinguished.

### Requirement: Per-category line chart of tracked time over time (FR-STATS-04)
The system SHALL render a per-category line chart of tracked time over time from the snapshot's
**`per_category_per_day`** block — a separate top-level array, each entry `{id, name, color, per_day}`
with `per_day` a `[{date, min}]` series over the reporting range (the shipped slice-004 shape,
`app/schemas/stats.py` `CategoryPerDayRead`) — one line per entry, colored from each entry's own
`color`, styled to the DESIGN §3 tokens; it SHALL recompute no series.

#### Scenario: One line per category renders from the snapshot series
- **GIVEN** a loaded snapshot whose top-level `per_category_per_day` array lists `{id, name, color, per_day: [{date, min}]}` entries
- **WHEN** the per-category line chart renders
- **THEN** it draws one line per `per_category_per_day` entry over the shared date axis using that entry's `per_day` values, coloring each line from its own `color` (keyed by `id`), and recomputing nothing

### Requirement: Metric score cards with zone color and baseline delta (FR-STATS-05)
The system SHALL render a zoned score card for each of the snapshot's **four** `baselines` entries —
`volume`, `consistency`, `focus_share`, `switch_load` (the shipped slice-004 shape,
`app/schemas/stats.py` `BaselinesRead`; each `{value, delta, zone}` with `delta` nullable) — showing
the metric's value, its zone color (green / yellow / red per architecture §3.6), and its signed
baseline delta with an up/down direction indicator, every field read from that `baselines` entry
(FR-METR-06); a baseline still forming SHALL render the neutral "building" state (`zone = "building"`,
`delta = null`) instead of a zone color (architecture §3.8), and the card SHALL never fabricate a
delta or a zone. It SHALL additionally render an M5 **streak** card from `streaks.current`.

#### Scenario: A score card shows value, zone color, and signed delta with direction
- **GIVEN** a loaded snapshot whose `baselines` entry for a metric (one card per entry — `volume`, `consistency`, `focus_share`, `switch_load`) has a numeric `value`, a signed `delta`, and a `zone` of `green`, `yellow`, or `red` (architecture §3.6)
- **WHEN** the metric's score card renders
- **THEN** it shows the value in big mono, applies the zone color (`--zone-good` / `--zone-warn` / `--zone-bad`) to the card's zone dot/bar, and shows the delta as `+N` with an up SVG arrow when `delta > 0`, `-N` with a down SVG arrow when `delta < 0`, and a neutral `±0` with **no** arrow when `delta = 0` (DESIGN §7.3, §9)

#### Scenario: A baseline still forming renders the neutral building state, not a zone color
- **GIVEN** a loaded snapshot whose `baselines` entry for a metric has `zone = "building"` and `delta = null` (fewer than 7 days of history, architecture §3.8)
- **WHEN** the metric's score card renders
- **THEN** it shows the value with a neutral "building" chip (DESIGN §7.3) instead of any green / yellow / red zone color, and it shows no signed delta — no zone or delta is fabricated

#### Scenario: The streak card renders from streaks.current without a baseline zone
- **GIVEN** a loaded snapshot whose `streaks.current` is a number and whose `baselines` block carries **no** `streak` entry (the shipped slice-004 shape)
- **WHEN** the M5 streak card renders
- **THEN** it shows `streaks.current` as a plain value card with no zone color and no baseline delta, because the shipped snapshot exposes no streak baseline — it does not fabricate one

> **Known gap (metrics-snapshot-extension follow-up):** DESIGN §7.3 calls for a fully zoned card
> for all M1-M5; the shipped `baselines` block carries only the four above (no `streak`), so the M5
> card is a plain value card here. Adding a `baselines.streak` entry (and `history_days` for the
> "building — day N of 30" copy) is deferred to the snapshot-extension follow-up; this slice renders
> a generic "building" chip without the day count until `history_days` exists.

#### Scenario: Icons are inline SVG and no emoji appears
- **GIVEN** the Stats page rendered with tiles, score cards, and charts
- **WHEN** its markup is inspected
- **THEN** every icon — including the score card's up/down delta arrows and zone dots — is an inline SVG (stroke 1.5, `currentColor`) and no emoji character appears anywhere on the page (DESIGN §9, NFR-DES-01)
