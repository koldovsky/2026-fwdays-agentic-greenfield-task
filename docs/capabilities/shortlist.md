# Capability: shortlist

**Wave 3.** Delivers US-5 (save + track).

## Purpose
Let the user save a personal list of programs and track each application's status.

## Requirements
- FR-LIST-01 — save options to a personal list.
- FR-LIST-02 — track application status: Saved → Submitted → Under review → Recommended → Enrolled.
- FR-UX-01 — empty state with a hint when the list is empty.

## Scope
**In:**
- Add/remove a program to/from the personal list.
- Status field per saved item with the five-state progression.
- Persistence of list + statuses via `state-persistence`.
- Empty-list state with a hint to start from recommendations.

**Out:** priority-deadline reminders (`deadline-reminders`, Phase 3); sync (`cross-device-sync`).

## Depends on
`state-persistence`, `recommendations` (save entry point), `program-data`.

## Consumed by
— (may feed `comparison` selection).

## Key acceptance
- Saved list and statuses survive a reload (acceptance §13, FR-STATE-01).
- Status advances through the five states.
- Empty list shows a helpful hint.
