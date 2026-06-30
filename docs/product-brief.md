# Product Brief — Plant Growth & Watering Tracker

> Phase 1 product framing. Greenfield, Project Factory. Scope is deliberately
> SMALL ("коротку web app") — a single-user crash-course demo, not an
> enterprise plant CRM. Anything beyond the core jobs is pushed to Future.

## One-line

A small web app for one person to track the **growth** of their succulents
(money trees / jade plants, *Crassula ovata*) and **visualize watering** over
time.

## Who it's for

A single hobbyist plant owner (the "Owner") running the app for their own use.
There is no second role, no sharing, no team. The Owner is the only actor.

| Actor | Goal |
|-------|------|
| Owner | Keep a simple record of each plant, log how it grows and when it's watered, and see at a glance whether watering has been regular and whether the plant is growing. |

## How the Owner operates today (the pain)

Today the Owner tracks plants in their head, in a notes app, or not at all:

- They forget **when they last watered** a given plant, so they over- or
  under-water (a real risk for succulents, which rot if over-watered).
- They have no **objective record of growth** — "is the money tree actually
  bigger than three months ago?" is a guess.
- There is no **single view** that ties a plant to its watering rhythm and its
  growth trend.

## What the platform must do (jobs-to-be-done)

1. **Manage plants** — add a plant with at least a name and species, optionally
   an acquired date; edit and remove it; see the list of plants.
2. **Log growth measurements** — record a measurement (height in cm) for a
   plant on a date, so growth accumulates into a series over time.
3. **Log watering events** — record that a plant was watered on a date, with an
   optional note.
4. **Visualize watering** — show a chart of watering events over time for a
   plant (the headline feature the customer asked for: "показувати графік
   поливу").
5. **Visualize growth** — show a chart of growth measurements over time for a
   plant (strongly implied by "трекати ріст рослин"; treated as MVP because the
   growth series is otherwise write-only and useless).

## MVP vs Future boundary

**In MVP** — the smallest end-to-end loop that delivers both asked-for
outcomes: plant CRUD, growth log, watering log, watering chart, growth chart,
local persistence, responsive light/dark UI, single user, no auth.

**Future (explicitly out of MVP)** — photos/images, multiple users / accounts /
auth, watering reminders & notifications, species presets / care guides, data
import/export, statistics & predictions, tagging, search, multi-device sync,
imperial units, and any third-party integrations. None of these are needed for
the core "track growth + show watering chart" job.

## Primary workflows (prose)

**Add a plant.** The Owner opens the app, sees their plant list (empty on first
run with a helpful empty state), clicks "Add plant", enters a name and species
(default species: money tree / *Crassula ovata*), optionally an acquired date,
and saves. The new plant appears in the list.

**Log a watering.** From a plant's detail view, the Owner clicks "Log
watering", the date defaults to today, they optionally add a note ("gave it a
small drink"), and save. The watering chart updates to include the new event.

**Log a measurement.** From a plant's detail view, the Owner clicks "Log
measurement", enters a height in cm for a date (default today), and saves. The
growth chart updates with the new point.

**Review a plant.** Opening a plant shows its details, its growth chart (height
over time) and its watering chart (waterings over time), so the Owner can see
both the growth trend and the watering rhythm in one place.

## Notes on vocabulary

The customer's words — "рослини" (plants), "суккуленти / денежні дерева"
(succulents / money trees), "полив" (watering), "ріст" (growth), "графік"
(chart) — are mirrored directly in the requirements as Plants, Species,
Watering, Growth/Measurement, and Charts.
