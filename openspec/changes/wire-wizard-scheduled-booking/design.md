# Design: Wizard scheduled booking

## When step — two date modes

```
┌──────────────────────────────────────────────┐
│ [Jul 4] [Jul 5] … [Jul 10]  ← live (7 days)  │
│ Schedule later: [ date picker ]  day 8–56    │
└──────────────────────────────────────────────┘
```

- **In window (day 1–7):** existing live `AvailabilityPanel` + prefetch cache
- **Outside window (day 8–56):** `FutureSlotPicker` — East/West court, static 45-min slot grid, optional "Any time (9 AM – 9 PM)"
- Badge: "Opens {formatOpensAtLabel}" when date is not yet bookable
- Switching tab ↔ picker clears assignments

## Static slots

Export `TENNIS_SLOT_LABELS` from `availability.ts` — full 9:00 AM–9:45 PM schedule (BC-MHOA-TENNIS-08). Reuse `consecutiveRunFrom` for multi-person blocks.

## Scheduled job model

```typescript
guestContact?: { fullName; email; phone; address }  // when residentId === "other"
```

Runner `tryBookJob`: profile residents unchanged; `other` uses `guestContact` for intake.

## APIs

- `POST /api/booking/schedule/batch` — `{ jobs: ScheduledJobInput[] }` → `createJobsFromInput`
- `DELETE /api/booking/schedule/[id]` — remove job if status is `waiting` or `ready`

Existing `POST /api/booking/schedule` (NL flow) unchanged.

## Confirm step routing

```typescript
needsSchedule = assignments.some(a => !isWithinBookingWindow(a.slot.date))
```

- In window → `/api/booking/submit` (unchanged)
- Outside window → `/api/booking/schedule/batch` → queued results UI

## Tests (DoD)

One automated test per ADDED/MODIFIED scenario — unit for helpers/runner, Playwright E2E for wizard + cancel panel.
