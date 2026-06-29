## ADDED Requirements

> Status derivation rule (used by every scenario below). Let `today` be the
> current calendar date in Europe/Kiev, `lastWateredAt` be the date of the
> plant's latest watering event, and `due = lastWateredAt + intervalDays` (the
> next calendar date the plant is expected to be watered).
>
> - **overdue** — `today > due` (today strictly after the due date). A plant that
>   has NEVER been watered (no watering events) is treated as due and classified
>   **overdue** (the strongest "needs water" signal).
> - **soon** — `due == today` OR `due == today + 1 day` (due today or tomorrow,
>   not yet overdue).
> - **healthy** — `due >= today + 2 days`.
>
> A plant is **"due" (needs watering today)** when its status is **soon OR
> overdue**. Healthy plants are NOT due. This single definition of "due" drives
> the summary count (FR-REM-03), the reminder list (FR-REM-04), and the all-done
> state (FR-REM-06). No authentication or authorization applies (single local
> Owner, NFR-SEC-01, TC-04); unauthorized/forbidden paths are intentionally N/A.
> Push/OS notifications (FR-REM-08) are Future and intentionally unsupported.

### Requirement: Plant watering interval
The system SHALL give each plant a watering interval in days, `intervalDays`, that is editable and defaults to 7 on plant creation, and SHALL validate it as a positive integer (a whole number `>= 1`) (FR-REM-01). A value that is missing, zero, negative, non-integer (e.g. a decimal such as 7.5), or non-numeric SHALL be rejected with a validation message inline next to the interval field — not a raw error or silent failure (FR-SHELL-03, NFR-USA-02). `intervalDays` persists across page reloads and app restarts (SC-4, NFR-DATA-01). It is the sole new persisted field introduced by this capability; the last watering date is NOT stored here but derived from watering events.

#### Scenario: New plant defaults to a 7-day interval
- **WHEN** the Owner adds a plant without changing the watering interval
- **THEN** the plant is created with `intervalDays` equal to 7

#### Scenario: Edit the interval to a valid positive integer
- **WHEN** the Owner edits a plant and sets its watering interval to a positive integer (e.g. 14) and saves
- **THEN** the plant stores `intervalDays` of 14, the value persists across reload/restart, and the plant's derived status is recomputed against the new interval

#### Scenario: Reject a non-positive interval
- **WHEN** the Owner sets the watering interval to 0 or a negative number and saves
- **THEN** the change is rejected, `intervalDays` is left unchanged, and a clear validation message is shown inline next to the interval field (not a raw error or silent failure)

#### Scenario: Reject a non-integer or non-numeric interval
- **WHEN** the Owner sets the watering interval to a decimal (e.g. 7.5), an empty value, or non-numeric text and saves
- **THEN** the change is rejected, `intervalDays` is left unchanged, and a clear validation message is shown inline next to the interval field (not a raw error or silent failure)

### Requirement: Derive watering status from last watering date and interval
The system SHALL derive each plant's watering status as one of **healthy / soon / overdue** from its last watering date (the date of its latest watering event) plus `intervalDays`, compared to today in Europe/Kiev, per the "Status derivation rule" above (FR-REM-02). The last watering date SHALL be taken from the watering capability's events (the most recent event by date) and SHALL NOT be a separately stored field, so logging, editing, or deleting a watering event recomputes the status with no duplicate state (FR-REM-05, watering FR-WATER-01..05). A plant that has never been watered SHALL be treated as due and classified overdue. Status is recomputed on read; "watered today" resets at the daily calendar boundary because the comparison is to today's date (NFR-USA-03, A5/Q8).

#### Scenario: Healthy when next watering is two or more days away
- **WHEN** a plant has `intervalDays` of 7, its latest watering event is dated 2026-06-28, and today is 2026-06-30 in Europe/Kiev (so `due` = 2026-07-05, which is five days after today)
- **THEN** the plant's derived status is **healthy** and it is NOT counted as due

#### Scenario: Soon when due today
- **WHEN** a plant has `intervalDays` of 7, its latest watering event is dated 2026-06-23, and today is 2026-06-30 in Europe/Kiev (so `due` = 2026-06-30, which is today)
- **THEN** the plant's derived status is **soon** and it IS counted as due

#### Scenario: Soon when due tomorrow
- **WHEN** a plant has `intervalDays` of 7, its latest watering event is dated 2026-06-24, and today is 2026-06-30 in Europe/Kiev (so `due` = 2026-07-01, which is one day after today)
- **THEN** the plant's derived status is **soon** and it IS counted as due

#### Scenario: Overdue when today is past the due date
- **WHEN** a plant has `intervalDays` of 7, its latest watering event is dated 2026-06-20, and today is 2026-06-30 in Europe/Kiev (so `due` = 2026-06-27, which is three days before today)
- **THEN** the plant's derived status is **overdue** and it IS counted as due

#### Scenario: Never-watered plant is treated as overdue and due
- **WHEN** a plant has no watering events at all (it has never been watered)
- **THEN** the plant's derived status is **overdue**, it IS counted as due, and it surfaces as a reminder (FR-REM-04)

#### Scenario: Status recomputes from watering events with no duplicate state
- **WHEN** the latest watering event used to derive a plant's status is deleted or edited to a different date (via the watering capability)
- **THEN** the plant's status is recomputed from the now-latest remaining watering event (or treated as overdue if none remain), without reading any separately stored "last watered" field

### Requirement: Home summary card with due count
The system SHALL show, on the home view, a summary card displaying the count of plants that are due today — that is, plants whose derived status is soon OR overdue (FR-REM-03). The count SHALL be computed from the same "due" definition used by the reminder list and the all-done state, evaluated against today in Europe/Kiev. The summary card and its count remain legible under the «Поливайко» design tokens (pine surface, paper text), verified in the Phase 6 vision pass (NFR-A11Y-01/02).

#### Scenario: Count reflects only due plants
- **WHEN** the Owner opens the home view with three plants — one overdue, one soon, and one healthy — today in Europe/Kiev
- **THEN** the summary card shows a due count of 2 (the overdue and soon plants), and the healthy plant is excluded from the count

#### Scenario: Count is zero when nothing is due
- **WHEN** the Owner opens the home view and every plant's derived status is healthy
- **THEN** the summary card shows a due count of 0

#### Scenario: Count includes a never-watered plant
- **WHEN** the Owner opens the home view with one healthy plant and one plant that has never been watered
- **THEN** the never-watered plant is classified overdue and counted, so the summary card shows a due count of 1

### Requirement: Home reminder rows for due plants, ordered by urgency
The system SHALL list, on the home view, a reminder row for every plant that is due today (status soon or overdue), each row showing a plant thumbnail, the plant name, a due line whose color reflects urgency (clay for soon, danger/red for overdue per the design), and a "water now" action; healthy plants SHALL NOT appear as reminder rows (FR-REM-04). Rows SHALL be ordered by urgency with the most overdue plant first — ordered by how far past due the plant is (greater overdue gap first), so a never-watered plant and the longest-overdue plants sort to the top and soon-but-not-yet-overdue plants sort last. Ties (equal overdue gap) SHALL be broken deterministically (e.g. by plant name or id) so the order is reproducible. The "water now" action is keyboard-operable and has an accessible label (SC-6, NFR-A11Y-04).

#### Scenario: Only due plants appear as reminder rows
- **WHEN** the Owner opens the home view with two due plants (one overdue, one soon) and one healthy plant
- **THEN** exactly two reminder rows are shown (for the overdue and soon plants), and the healthy plant has no reminder row

#### Scenario: Rows ordered most-overdue first
- **WHEN** the Owner opens the home view with plant A overdue by 5 days, plant B overdue by 1 day, and plant C due today (soon)
- **THEN** the reminder rows are ordered A, then B, then C (most overdue first, soon last)

#### Scenario: Deterministic tie-break for equal urgency
- **WHEN** two due plants have the same overdue gap
- **THEN** their reminder rows are ordered by a deterministic tie-break (by name or id), so the order is reproducible across reloads

#### Scenario: Due line colored by urgency
- **WHEN** a reminder row is shown for an overdue plant and another for a soon plant
- **THEN** the overdue row's due line uses the overdue/danger color and the soon row's due line uses the soon color, per the «Поливайко» design (legibility verified in the Phase 6 vision pass)

### Requirement: Water now from a reminder row
The system SHALL provide a "water now" action on each reminder row that logs a watering event dated today (local calendar, Europe/Kiev) for that plant via the watering capability, then recomputes the plant's status and the home due count and swaps the row's control to a done/confirmation state (FR-REM-05). After watering today, the plant's status SHALL no longer be due (its `due` becomes `today + intervalDays`, two or more days away for any `intervalDays >= 2`, i.e. healthy; for `intervalDays = 1` it becomes soon-due-tomorrow but the just-logged event is today so it is not re-counted as needing water again today). The done state SHALL show the confirmation per the design ("Полито щойно ✓"). The UI reflects the change within 300 ms for a realistic dataset (<= 20 plants, <= 500 events total) (NFR-PERF-01).

#### Scenario: Water now logs a today-dated event and updates the row
- **WHEN** the Owner taps "water now" on a reminder row for an overdue plant with `intervalDays` of 7
- **THEN** a watering event dated today (Europe/Kiev) is created for that plant, the row's control swaps to a done/confirmation state showing "Полито щойно ✓", and the change is reflected within 300 ms

#### Scenario: Due count decrements after watering now
- **WHEN** the Owner taps "water now" on one of two due plants
- **THEN** the home summary due count decreases by one (the just-watered plant is no longer due) and the watered plant's derived status is no longer overdue/soon-due-today

#### Scenario: Watering a plant already watered today is a no-op for status
- **WHEN** the Owner taps "water now" for a plant whose latest watering event is already dated today
- **THEN** the plant is not double-counted as still due, its status remains not-due for today, no duplicate today-dated event is required, and the row stays in/returns to the done/confirmation state (no raw error or silent failure)

#### Scenario: Water now on a deleted plant is a friendly not-found
- **WHEN** the Owner taps "water now" for a plant that has since been deleted in another tab or session
- **THEN** no watering event is created or resurrected, the action resolves to a friendly not-found result (not a raw 500 or silent failure), and no other plant's data is affected (NFR-DATA-02)

### Requirement: All-done empty state when nothing is due
The system SHALL show, on the home view, an all-done empty state when no plant is due today — that is, when the due count is 0 (every plant is healthy or there are no plants) — replacing the reminder list with a centered leaf icon, the message "Усі политі! 🌱", and a reassurance line (FR-REM-06). The empty state SHALL appear both when there is initially nothing due and when the last due plant is watered via "water now".

#### Scenario: All-done state when no plant is due
- **WHEN** the Owner opens the home view and every plant's derived status is healthy
- **THEN** the reminder list is replaced by the all-done empty state showing "Усі политі! 🌱" and a reassurance line

#### Scenario: All-done state appears after watering the last due plant
- **WHEN** exactly one plant is due and the Owner taps "water now" on its reminder row
- **THEN** the due count reaches 0 and the home view shows the all-done empty state ("Усі политі! 🌱")

#### Scenario: All-done state when there are no plants
- **WHEN** the Owner opens the home view and no plants exist
- **THEN** no reminder rows are shown and the due count is 0 (the home view does not present a raw error or a blank reminder area)

### Requirement: Status pill on plant cards and detail view
The system SHALL display each plant's derived watering status as a status pill — a colored dot plus a label — on plant cards (in the list/home) and on the plant detail view (FR-REM-07). The pill color SHALL reflect the status per the «Поливайко» design: healthy uses the forest/healthy chip, soon uses the clay/soon chip, and overdue uses the danger/needs-water chip. The pill reflects the SAME derived status used by the summary count and reminder list (no separate computation) and updates when the plant is watered, its interval changes, or its watering events change. Pill legibility/contrast is verified in the Phase 6 vision pass (NFR-A11Y-01/02).

#### Scenario: Status pill shown on a plant card
- **WHEN** the Owner views a plant card for a plant with derived status overdue
- **THEN** the card shows a status pill with the overdue/needs-water color and label, consistent with the plant's derived status

#### Scenario: Status pill shown on the plant detail view
- **WHEN** the Owner opens a plant's detail view
- **THEN** the detail view shows a status pill reflecting the plant's current derived status (healthy, soon, or overdue)

#### Scenario: Pill updates after watering
- **WHEN** a plant's status pill shows overdue and the Owner logs a watering dated today (via "water now" or the watering capability) with `intervalDays >= 2`
- **THEN** the pill updates to reflect the recomputed status (healthy), consistent with the summary count and reminder list
