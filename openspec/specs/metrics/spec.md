# metrics Specification

## Purpose
TBD - created by archiving change add-metrics. Update Purpose after archive.
## Requirements
### Requirement: Compute M1 Volume (FR-METR-01)
The system SHALL compute M1 Volume for the authenticated user as the sum of **net** minutes attributed
per §3.7 for `today`, `this_week` (user-TZ Monday..now), `this_month`, and `all_time`, plus
`daily_avg_30d` = net minutes over the trailing 30 calendar days divided by 30 (zero days included in
the denominator), per architecture §3.1. The `all_time` value SHALL also be exposed in the assembled
snapshot as `volume.all_time_min` (an owner-approved additive field on the §4.1 `volume` block,
surfaced by slice-005 planning to serve the Stats UI's all-time tile, FR-STATS-01).

#### Scenario: Volume sums net minutes per window
- **GIVEN** an authenticated user with saved sessions falling in today, this week, and this month
- **WHEN** M1 is computed
- **THEN** `today`, `this_week`, `this_month`, and `all_time` equal the summed **net** minutes attributed per §3.7, and `daily_avg_30d` = the trailing-30-day net total divided by 30 with zero days counted in the denominator (§3.1)

#### Scenario: Net minutes exclude paused spans
- **GIVEN** a saved session of gross 90 minutes whose pause segments sum to 30 minutes
- **WHEN** M1 attributes that session
- **THEN** it contributes 60 net minutes, not 90, because volume is net (architecture §2.2, §3.1)

#### Scenario: Empty history yields zero volume (E-1)
- **GIVEN** an authenticated user with no saved sessions
- **WHEN** M1 is computed
- **THEN** `today`, `this_week`, `this_month`, `all_time`, and `daily_avg_30d` are all `0` and nothing errors (E-1, §3, well-defined empty)

#### Scenario: All-time volume is exposed in the snapshot
- **GIVEN** an authenticated user with tracked time across their whole history
- **WHEN** the snapshot is assembled
- **THEN** `volume.all_time_min` equals M1's `all_time` net-minute sum (§3.1), alongside `today_min`, `week_min`, `month_min`, and `daily_avg_30d_min` (§4.1)

### Requirement: Compute M2 Consistency Score (FR-METR-02)
The system SHALL compute M2 Consistency on a 0-100 scale over the trailing **14 calendar days** ending
today as `round(0.5 * regularity + 0.5 * start_stability)`, where `regularity = clamp(1 - CV, 0, 1) *
100` over the 14 daily net totals with **zero days included** (regularity = 0 when the 14-day mean is
0) and `start_stability` = (active days whose first session starts within **+/-60 min** of the median
first-start, measured in minutes since local midnight) / (active days) * 100; and SHALL report M2 as
`null` with a low-confidence flag when the window has **fewer than 3 active days**, per architecture
§3.2 and §3.8.

#### Scenario: M2 is the 50/50 blend with zero days counted against regularity
- **GIVEN** a 14-day window with at least 3 active days, including some zero (rest) days
- **WHEN** M2 is computed
- **THEN** `regularity = clamp(1 - CV, 0, 1) * 100` uses the CV of all 14 daily net totals with zero days included, and `M2 = round(0.5 * regularity + 0.5 * start_stability)` (§3.2)

#### Scenario: Start-time stability uses the +/-60 min band around the median start
- **GIVEN** active days whose first-session start times are measured as minutes since local midnight
- **WHEN** `start_stability` is computed
- **THEN** it is the share of active days whose first start lies within +/-60 min of the median first-start, times 100 (§3.2)

#### Scenario: Fewer than 3 active days is low-confidence, not an error (E-2)
- **GIVEN** a 14-day window with only 1 or 2 active days (e.g. a single session)
- **WHEN** M2 is computed
- **THEN** it returns `null` with a low-confidence flag and does not error, because M2 requires >= 3 active days (§3.2, §3.8, E-2)

#### Scenario: An empty window returns null consistency (E-1)
- **GIVEN** an authenticated user with no sessions in the trailing 14 days
- **WHEN** M2 is computed
- **THEN** it is `null` / low-confidence (0 active days) and nothing errors (E-1, §3.2)

### Requirement: Compute M3 Focus / Deep Work (FR-METR-03)
The system SHALL compute, over the window, `deep_count` and `deep_minutes` of **deep blocks** — a
saved session whose **net** duration is `>= 60 min` **and** which has **zero** pause segments (any
pause disqualifies it) — and `deep_share = deep_minutes / total_net_minutes` over the same window
(`0` when the denominator is 0), per architecture §3.3; the `>= 60 min` boundary is **inclusive**.

#### Scenario: An exactly-60-minute zero-pause session counts as a deep block (E-5)
- **GIVEN** a continuous saved session of exactly 60 **net** minutes with **zero** pause segments
- **WHEN** M3 is computed
- **THEN** it counts as one deep block, because the `>= 60 min` boundary is inclusive (§3.3, E-5)

#### Scenario: A short pause disqualifies an otherwise-deep session (E-6)
- **GIVEN** a session of >= 60 net minutes that contains one short pause segment
- **WHEN** M3 is computed
- **THEN** it does **not** count as a deep block (any pause disqualifies, §3.3), and that pause is counted as an interruption by M4 (FR-METR-04, E-6)

#### Scenario: Deep share divides deep minutes by total window net minutes
- **GIVEN** a window containing both deep and non-deep tracked minutes
- **WHEN** M3 is computed
- **THEN** `deep_share = deep_minutes / total net tracked minutes in the window`, and `deep_share = 0` when the window has no tracked minutes (§3.3)

#### Scenario: A sub-60-minute session is not deep
- **GIVEN** a zero-pause saved session of 59 net minutes
- **WHEN** M3 is computed
- **THEN** it is not a deep block (below the inclusive 60-minute boundary, §3.3)

### Requirement: Compute M4 Context Switching (FR-METR-04)
The system SHALL compute, per active day, `switches` = the number of transitions between consecutive
saved sessions (ordered by `started_at`) whose categories differ, `interruptions` = the count of pause
segments across that day's sessions, and `switch_load = switches + interruptions`; and SHALL flag a
day as fragmented when `switch_load > max(3, 1.5 * baseline_mean_switch_load)`, where the baseline mean
is over the trailing 30 days' active days, per architecture §3.4.

#### Scenario: Switches and interruptions compose the switch load
- **GIVEN** an active day with 3 category-to-category jumps between consecutive sessions and 2 pause segments across those sessions
- **WHEN** M4 is computed for that day
- **THEN** `switches = 3`, `interruptions = 2`, and `switch_load = 5` (§3.4)

#### Scenario: A day above max(3, 1.5 x baseline) is flagged fragmented
- **GIVEN** a user whose trailing-30-day active-day baseline mean switch load is 4.0 (so the flag threshold is `max(3, 6.0) = 6.0`)
- **WHEN** a day has `switch_load = 7`
- **THEN** the day is flagged fragmented, and a day with `switch_load = 6` is not, because the test is strictly greater than the threshold (§3.4)

#### Scenario: The floor prevents flagging near-zero baselines
- **GIVEN** a user whose baseline mean switch load is ~0 (so the threshold floors at `max(3, ~0) = 3`)
- **WHEN** a day has `switch_load = 3`
- **THEN** the day is **not** flagged, because `3 > 3` is false and the `max(3, ...)` floor applies (§3.4)

#### Scenario: Each pause is an interruption (E-6)
- **GIVEN** a day whose sessions contain one pause segment
- **WHEN** M4 is computed for that day
- **THEN** `interruptions` includes that pause, so the pause that disqualified a deep block (FR-METR-03) still registers here (§3.4, E-6)

#### Scenario: Archived categories still count toward switches
- **GIVEN** two consecutive sessions on a day whose categories differ, one of which is now archived (slice 002 §7)
- **WHEN** M4 is computed for that day
- **THEN** the transition still counts as a `switch`, because an archived category remains a valid historical label and metrics never hide time behind a tidied label (§3.4, §7)

### Requirement: Compute M5 Streaks (FR-METR-05)
The system SHALL compute `current_streak` = the run of consecutive **active days** ending today or
yesterday (a not-yet-tracked today does not break a live streak) and `longest_streak` = the maximum
such run over all history, where an active day is a day receiving `>= 1` attributed minute (§3.7), per
architecture §3.5.

#### Scenario: Current streak counts consecutive active days through today
- **GIVEN** active days on each of the last 6 consecutive days including today
- **WHEN** M5 is computed
- **THEN** `current_streak = 6` (§3.5)

#### Scenario: An untracked today does not break a live streak
- **GIVEN** consecutive active days ending yesterday and no session tracked yet today
- **WHEN** M5 is computed
- **THEN** `current_streak` still counts the run through yesterday, because a not-yet-tracked today does not break it (§3.5)

#### Scenario: Longest streak is the maximum run over all history
- **GIVEN** a past run of 19 consecutive active days and a current run of 6
- **WHEN** M5 is computed
- **THEN** `longest_streak = 19` and `current_streak = 6` (§3.5)

#### Scenario: Empty history yields zero streaks (E-1)
- **GIVEN** an authenticated user with no saved sessions
- **WHEN** M5 is computed
- **THEN** `current_streak = 0` and `longest_streak = 0` and nothing errors (E-1, §3.8)

### Requirement: Report baseline deltas and zones (FR-METR-06)
The system SHALL report, for each score S in {M1 daily volume, M2, M3 `deep_share`, M4 `switch_load`}
— the **four** zoned scores of the §4.1 snapshot `baselines` block — its `value`, a
`delta = value - baseline(S)`, and a zone, where `baseline(S)` is the same score computed over the
trailing 30 days ending **yesterday** and `rel = delta / baseline` (zone `neutral` when baseline = 0);
each metric declares a direction (higher-better: M1, M2, M3; lower-better: M4) and, after normalizing
`rel` so that positive = improvement, the zone SHALL be **green** when `rel >= -0.05`, **yellow** when
`-0.20 <= rel < -0.05`, and **red** when `rel < -0.20`, per architecture §3.6. **M5 Streak SHALL be
reported as `current`/`longest` only, with no baseline `delta` and no zone** — resolving the
§3.6-vs-§4.1 conflict in favor of the four zoned scores of §4.1. When fewer than **7 days** of history
exist the system SHALL show each zoned score's `value` but set its `delta = null` and
`zone = "building"`, per §3.8.

#### Scenario: Green at or within 5% below baseline
- **GIVEN** a higher-better score whose `rel = -0.05` (exactly 5% below baseline)
- **WHEN** the zone is computed
- **THEN** the zone is **green**, because green is `rel >= -0.05` (§3.6)

#### Scenario: Yellow between 5% and 20% below baseline
- **GIVEN** a higher-better score whose `rel = -0.20` (and, separately, one whose `rel = -0.10`)
- **WHEN** the zone is computed
- **THEN** the zone is **yellow**, because yellow is `-0.20 <= rel < -0.05` (§3.6)

#### Scenario: Red more than 20% below baseline
- **GIVEN** a higher-better score whose `rel = -0.25`
- **WHEN** the zone is computed
- **THEN** the zone is **red**, because red is `rel < -0.20` (§3.6)

#### Scenario: A lower-better metric is normalized before zoning
- **GIVEN** M4 `switch_load` running 25% **above** baseline (worse, since lower is better)
- **WHEN** the zone is computed
- **THEN** `rel` is negated so positive = improvement, giving `rel = -0.25`, and the metric zones **red** (§3.6)

#### Scenario: A zero baseline is neutral
- **GIVEN** a score whose `baseline(S) = 0`
- **WHEN** the zone is computed
- **THEN** `rel` is undefined and the zone is `neutral` (§3.6)

#### Scenario: Baseline spans the trailing 30 days ending yesterday
- **GIVEN** a partial, in-progress today
- **WHEN** `baseline(S)` is computed
- **THEN** it spans the trailing 30 days ending **yesterday**, so today's partial day never pollutes its own baseline (§3.6)

#### Scenario: Under 7 days of history the zone is "building" (E-2, E-7)
- **GIVEN** an authenticated user with fewer than 7 days of history (including the single-session case)
- **WHEN** M6 is computed
- **THEN** the `value` is shown, `delta = null`, `zone = "building"`, and nothing errors (§3.8, E-2, E-7)

#### Scenario: Between 7 and 29 days, deltas and zones compute on available history (E-7)
- **GIVEN** an authenticated user with between 7 and 29 days of history
- **WHEN** M6 is computed
- **THEN** deltas and zones are computed over the available history (not `building`) and nothing errors, because baselines use available history with a 7-day minimum (§3.8, E-7)

#### Scenario: Streak carries no baseline zone
- **GIVEN** an authenticated user's M5 streak
- **WHEN** the M6 baselines are reported
- **THEN** the zoned set is exactly the four scores `volume`, `consistency`, `focus_share`, `switch_load` (§4.1), and M5 is reported only as `current`/`longest` with no `delta` and no zone (resolving §3.6 vs §4.1 in favor of four)

### Requirement: Attribute tracked time to days, splitting at midnight (FR-METR-07)
The system SHALL aggregate a session's **net** minutes into per-day totals using the user's timezone,
**splitting the minutes across each local day the session spans** (minute-accurate at local midnight,
pauses subtracted from the day they occur in) while keeping the session **entity whole**; a calendar
day that receives `>= 1` attributed minute is an **active day**; and a midnight-spanning zero-pause
session of `>= 60 min` SHALL remain **one deep block attributed to its start day** (not split into
sub-blocks), per architecture §3.7.

#### Scenario: A midnight-spanning session splits its minutes across two local days (E-3)
- **GIVEN** a zero-pause session running 23:00-02:00 in the user's local time
- **WHEN** the day aggregation runs
- **THEN** the session's net minutes are split between the two local days at local midnight, and both days become active (§3.7, E-3)

#### Scenario: The deep block stays whole and is attributed to its start day (E-3)
- **GIVEN** that same >= 60-minute zero-pause session spanning midnight
- **WHEN** M3 is computed
- **THEN** it counts as **one** deep block attributed to its **start day**, not two sub-60-minute halves, because the entity and the deep block are never split (§3.7, §3.3, E-3)

#### Scenario: Day attribution uses the user's timezone at a day boundary (E-4)
- **GIVEN** a session whose UTC timestamp falls on a different calendar date than the user's local date
- **WHEN** the day aggregation runs
- **THEN** the session lands on the correct **local** calendar day using the user's timezone (§3.7, A-1, E-4)

#### Scenario: An active day is any day receiving at least one attributed minute
- **GIVEN** a day that receives at least one attributed net minute
- **WHEN** days are classified
- **THEN** it counts as an active day for streaks (M5) and consistency (M2) (§3.7)

### Requirement: Bucket daily tracked time into heatmap intensity levels (FR-HEAT-01)
The system SHALL aggregate each day's **net** tracked minutes (using the day attribution of §3.7)
within the displayed period into **5 intensity levels**, where level 0 = 0 minutes and levels 1-4 are
the quartiles (p25 / p50 / p75 cut points) of the user's **non-zero** daily totals within that period,
self-normalizing per user and period, per architecture §3.9.

#### Scenario: A zero-minute day is level 0
- **GIVEN** a day within the period with 0 tracked net minutes
- **WHEN** the heatmap is bucketed
- **THEN** that day's level is 0 (§3.9)

#### Scenario: Non-zero days bucket by quartile of the user's non-zero totals
- **GIVEN** a period's set of non-zero daily net totals
- **WHEN** the heatmap is bucketed
- **THEN** each non-zero day maps to level 1-4 by the p25 / p50 / p75 cut points of those non-zero totals (§3.9)

#### Scenario: Buckets self-normalize to the user and period
- **GIVEN** two users (or the same user over two periods) with different daily-total distributions
- **WHEN** each heatmap is bucketed
- **THEN** the cut points are computed from each user's own non-zero totals within the period, so intensity is relative, not absolute (§3.9)

#### Scenario: Empty history yields an all-level-0 grid (E-1)
- **GIVEN** an authenticated user with no sessions in the period
- **WHEN** the heatmap is bucketed
- **THEN** every day is level 0 and nothing errors (E-1, §3.9)

#### Scenario: A midnight-spanning session shades both local days (E-3)
- **GIVEN** a session spanning local midnight within the period
- **WHEN** the heatmap aggregates daily totals
- **THEN** both local days receive their split minutes, consistent with the daily totals of M1 (§3.7, E-3)

### Requirement: Switch the heatmap period (FR-HEAT-02)
The system SHALL compute the heatmap day grid for a selected period among **`week`, `month`,
`quarter`, `6mo`, and `year`**, re-bucketing intensity over that period's own non-zero daily totals
(self-normalizing per period, §3.9); the `GET /api/stats/heatmap` endpoint SHALL accept `period` as one
of exactly `week|month|quarter|6mo|year` and, when `period` is omitted, SHALL default to `month`.

#### Scenario: The endpoint computes the grid for the requested period
- **GIVEN** an authenticated user
- **WHEN** the client GETs `/api/stats/heatmap?period=quarter`
- **THEN** the response covers that quarter and its intensity buckets are normalized over the quarter's non-zero daily totals (§3.9, FR-HEAT-02)

#### Scenario: An omitted period defaults to month
- **GIVEN** an authenticated user
- **WHEN** the client GETs `/api/stats/heatmap` with no `period` parameter
- **THEN** the endpoint computes the grid for `month`, the default period (§3.9, FR-HEAT-02)

#### Scenario: Changing the period re-normalizes the buckets
- **GIVEN** the same underlying data requested once as `period=week` and once as `period=year`
- **WHEN** each grid is computed
- **THEN** the intensity cut points differ, because each period self-normalizes over its own non-zero totals (§3.9)

### Requirement: Metrics are deterministic pure functions assembled into the snapshot (NFR-DET-01)
The system SHALL compute every metric (M1-M6) and the heatmap buckets as **deterministic pure
functions** in the framework-free `app/core` layer (architecture §1, §9) — identical input yields
identical output, independently unit-testable without a database (NFR-DET-01) — and SHALL assemble
them into the architecture §4.1 snapshot JSON, exposed read-only as `GET /api/stats/snapshot` scoped
to the authenticated user (FR-AUTH-07). The endpoint's `window` parameter is **optional**: with no
`window` the snapshot covers the **current week** (user-TZ Monday 00:00 -> now, per §4.1); with a
`window` it covers that requested range. `window` re-scopes **only** the top-level reporting range
(`volume.per_day`, `focus`); M2 consistency stays fixed at its 14-day window (§3.2) and the M6
baselines stay fixed at the trailing 30 days ending yesterday (§3.6), reconciling §10 (the parameter
exists) with §4.1 (the current-week default). The snapshot SHALL contain **only computed fields** per
§4.1 (no raw session rows). The `volume` block SHALL additionally carry `all_time_min` (M1's
`all_time`, §3.1). `top_categories` SHALL list the **top 5** categories by current-week net minutes,
tie-broken by name, each entry carrying that category's `id`, `name`, `color`, and `week_min`. The
snapshot SHALL additionally carry `per_category_per_day` — net minutes grouped by category and local
day over the same top-level reporting range, regrouping the same §3.7 attribution already computed for
`volume.per_day` (no new data, no new formula) — each entry carrying `id`, `name`, `color`, and its
per-day net-minute series. `all_time_min`, the `top_categories` identity fields, and
`per_category_per_day` are **owner-approved additive extensions** of the §4.1 example, surfaced by
slice-005 planning to serve the Stats UI's all-time tile and per-category line chart
(FR-STATS-01, FR-STATS-04); an archived category (§7) with qualifying time still appears in both
category-keyed fields.

#### Scenario: Identical input yields identical output
- **GIVEN** a fixed list of sessions and pause segments and a fixed `today`
- **WHEN** the metrics are computed twice
- **THEN** the two results are identical, because every metric is a deterministic pure function of its input (NFR-DET-01)

#### Scenario: The assembled snapshot contains only computed fields (§4.1)
- **GIVEN** a user's saved sessions
- **WHEN** the snapshot is assembled
- **THEN** it contains exactly the computed blocks of §4.1 plus the ratified additive extensions (`window`, `volume` — including `all_time_min` — `consistency`, `focus`, `switching`, `streaks`, `baselines`, `top_categories`, `per_category_per_day`) — the `baselines` block carrying exactly the four zoned scores `volume`, `consistency`, `focus_share`, `switch_load`, and `streaks` reported unzoned as `current`/`longest` — and no raw session row, so the coach (slice 006) can later be constrained to cite only these numbers (§4.1, forward to FR-COACH-02 / FR-COACH-04)

#### Scenario: top_categories lists the top five by current-week net minutes, with identity and color, archived included
- **GIVEN** an authenticated user with more than five categories tracked this week, one of them archived (slice 002 §7) but with tracked time
- **WHEN** the snapshot is assembled
- **THEN** `top_categories` contains the **top 5** categories by current-week net minutes, ties broken by name, each entry carrying its category `id`, `name`, `color`, and `week_min`, and an archived category with qualifying time still appears with its own `id`/`color`, because metrics never hide historical time behind a tidied label (§4.1, §7)

#### Scenario: per_category_per_day groups net minutes by category and local day
- **GIVEN** an authenticated user with sessions in two categories across several days of the reporting range, one category now archived (slice 002 §7) but with qualifying time in the range
- **WHEN** the snapshot is assembled
- **THEN** `per_category_per_day` contains one entry per category (`id`, `name`, `color`, including the archived one) each carrying a per-day net-minute series built from the same §3.7 attribution as `volume.per_day`, and a category's days sum to that category's contribution to the range total

#### Scenario: Empty history yields a well-formed snapshot (E-1)
- **GIVEN** an authenticated user with no saved sessions
- **WHEN** the snapshot is assembled
- **THEN** every block is present with well-defined empty values (volume `0` including `all_time_min`, consistency `null`, focus `0`, streaks `0`, baseline zones `building`, `top_categories` an empty list, `per_category_per_day` an empty list) and nothing errors (E-1, §3.8)

#### Scenario: The snapshot is isolated per user
- **GIVEN** saved sessions for user A and user B
- **WHEN** user A GETs `/api/stats/snapshot`
- **THEN** it is computed only over user A's sessions and never user B's, because the read is user_id-scoped (FR-AUTH-07)

#### Scenario: With no window parameter the snapshot covers the current week
- **GIVEN** an authenticated user
- **WHEN** the client GETs `/api/stats/snapshot` with no `window` parameter
- **THEN** the snapshot's top-level reporting range is the current week (user-TZ Monday 00:00 -> now, §4.1), while M2 keeps its 14-day window (§3.2) and the M6 baselines keep the trailing 30 days ending yesterday (§3.6)

#### Scenario: A window parameter re-scopes only the top-level reporting range
- **GIVEN** an authenticated user
- **WHEN** the client GETs `/api/stats/snapshot?window=<range>`
- **THEN** `volume.per_day` and `focus` cover the requested range, while M2 consistency (§3.2) and the M6 baselines (§3.6) keep their fixed windows unchanged (reconciling §10 with §4.1)

