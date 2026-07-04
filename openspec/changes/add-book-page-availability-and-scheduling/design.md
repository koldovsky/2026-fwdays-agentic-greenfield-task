# Design: Book-page availability + scheduled booking

## Book page UX

```
┌─────────────────────────────────────┐
│ Date: [Jul 4] [Jul 5] … [Jul 10]    │  ← bookable days only
│ East Court │ West Court slots        │
│ [Pick slot] OR [Describe request ↓] │
└─────────────────────────────────────┘
```

- **Pick slot**: sets `date`, `court`, `slotLabel`; minimal NL auto-generated; confirm step reuses selection
- **Describe request**: current NL textarea; confirm step loads availability (existing)

## Tennis booking window

```typescript
getBookableDates(ref: Date): string[]  // next 7 eligible ISO dates
getOpensAt(targetDate: string): Date   // midnight when target enters 7-day window
isWithinBookingWindow(target, ref): boolean  // dayDiff 1..7
```

## Scheduled booking

```typescript
type ScheduledJob = {
  id: string;
  status: 'waiting' | 'ready' | 'running' | 'completed' | 'failed';
  residentId: string;
  targetDate: string;
  windowStart: string;
  windowEnd: string;
  courtPreference: string | null;
  slotLabel: string | null;  // exact slot if known
  opensAt: string;         // ISO
  createdAt: string;
  lastAttemptAt?: string;
  result?: SubmitResult;
  error?: string;
};
```

Persistence: `data/scheduled-bookings.json` (gitignored).

Runner (hourly cron or `npm run schedule:run`):
1. `waiting` + `now >= opensAt` → `ready`
2. `ready` → fetch availability, match slot, submit live
3. Success → `completed`; else retry until target eve or mark `failed`

**Household rule (BC-MHOA-TENNIS-02):** multi-resident same-day jobs may conflict; UI warns; runner books sequentially and surfaces MHOA limit on second job.

## NLP extensions

- `parseResidents(text)` → `['max','nataliia']`
- `slotsRequested` from "2 slots" creates 2 jobs (same window, different residents or consecutive preference)
