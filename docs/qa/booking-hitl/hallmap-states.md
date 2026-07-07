# booking-hitl S4 gate — HallMap mixed seat states

**Proves:** FR-HITL-01 (the HallMap reflects pending/confirmed/cancelled bookings as visually distinct seats).

**Steps:**
1. From the populated fixture (one pending, one confirmed, one cancelled booking, on three different weekday/hour cells this week), load `/`.
2. Assert >=1 seat each of `data-status="pending"`, `"confirmed"`, `"cancelled"`.

(The LIVE flip on a real decision is covered by `route.test.ts`/`ingest/route.test.ts`'s own assertions — this still only needs to show the three states legibly together for the vision pass.)

![still](hallmap-states.png)
