## 1. Dependencies and database schema

- [x] 1.1 Add the `googleapis` package (and `google-auth-library` if not
      pulled in transitively) as a dependency of the calendar adapter
      module; do not add any Google SDK dependency to `lib/` itself
      (TC-PURE-01).
- [x] 1.2 Add the `bookings` table migration/seed to `packages/db`:
      `id, slot_start, slot_end, status, calendar_event_id, created_at`,
      `status ∈ {pending, confirmed, declined, cancelled}` (TC-DATA-01,
      design.md Decision 2); no `request_id` column yet — leave a code
      comment naming S2 `intake` as the owner of that follow-up column.
- [x] 1.3 Add `.env.example` entries if not already present for
      `GOOGLE_CALENDAR_ID` / `GOOGLE_APPLICATION_CREDENTIALS` (TC-CAL-01) —
      confirm they already exist (`.env.example` has both) and only add a
      note if the spike's chosen transport needs anything additional (e.g.
      an MCP server binary path).

## 2. Domain logic — write failing unit tests FIRST (red), from the spec

- [x] 2.1 `lib/src/slots/grid.test.ts`: grid generation bounds — every slot
      60 minutes, Mon–Fri only, starts 10:00–19:00 inclusive Europe/Kyiv,
      no Saturday/Sunday, across the 14-day proposal horizon
      (`@trace FR-SLOT-01`, `@trace FR-GUARD-03`, BC-SCHEDULE-01). Confirm
      the test suite fails (no implementation exists yet).
- [x] 2.2 `lib/src/slots/grid.test.ts`: calendar data cannot add slots
      outside the grid — a fixture free interval on a Sunday (or outside
      10:00–19:00) never appears in the computed result
      (`@trace FR-GUARD-03`). Confirm red.
- [x] 2.3 `lib/src/slots/subtract.test.ts`: half-open overlap subtraction —
      busy 11:30–13:30 removes the 11:00/12:00/13:00 starts and keeps
      10:00 and 14:00+ (`@trace FR-SLOT-01`). Confirm red.
- [x] 2.4 `lib/src/slots/subtract.test.ts`: boundary-touching edge cases —
      a slot ending exactly at `busy.start` and a slot starting exactly at
      `busy.end` both remain free; a busy interval fully inside a slot
      still disqualifies it (`@trace FR-SLOT-01`). Confirm red.
- [x] 2.5 `lib/src/slots/subtract.test.ts`: other leads' `pending` holds
      (including their tentative-event intervals) are excluded from the
      free-slot result the same way calendar busy intervals are
      (`@trace FR-SLOT-01`). Confirm red.
- [x] 2.6 `lib/src/slots/rank.test.ts`: preference fit dominates —
      Monday-morning preference ranks a Monday 10:00 slot above a Friday
      10:00 slot (`@trace FR-SLOT-04`). Confirm red.
- [x] 2.7 `lib/src/slots/rank.test.ts`: teacher-compactness tie-break — an
      adjacent-to-busy slot ranks above an isolated-gap slot when
      preference fit is equal (`@trace FR-SLOT-04`). Confirm red.
- [x] 2.8 `lib/src/slots/rank.test.ts`: earlier-date tie-break — equal fit
      and compactness resolve by earlier date (`@trace FR-SLOT-04`).
      Confirm red.
- [x] 2.9 `lib/src/slots/rank.test.ts`: purity/determinism — same inputs
      called repeatedly in-process yield an identical ordering; assert (by
      construction, e.g. a fake global `fetch`/`Date.now` that throws if
      invoked) that `rankSlots()` performs no I/O (`@trace FR-SLOT-04`).
      Confirm red.
- [x] 2.10 `lib/src/slots/widen.test.ts`: Step 1 (time widening) — one
      matching slot triggers a ±60-minute window extension, clipped to the
      grid, same weekdays (`@trace FR-SLOT-03`). Confirm red.
- [x] 2.11 `lib/src/slots/widen.test.ts`: Step 2 (day widening) — zero
      matches after Step 1 adds Mon–Fri-adjacent weekdays, correctly
      excluding non-adjacent days (Monday→Tuesday only, Friday→Thursday
      only, mid-week→both neighbors) (`@trace FR-SLOT-03`). Confirm red.
- [x] 2.12 `lib/src/slots/widen.test.ts`: Step 3 (full grid fallback) and
      the true-zero case — calendar fully busy across the entire 14-day
      horizon yields an explicit "no free times" outcome rather than an
      empty/silent result (`@trace FR-SLOT-03`). Confirm red.
- [x] 2.13 `lib/src/slots/timezone.test.ts`: Europe/Kyiv wall-clock ↔
      RFC3339 UTC conversion, including a DST-transition-day fixture (the
      wall-clock grid starts stay fixed while the UTC offset shifts)
      (`@trace FR-SLOT-01`, per the baseline spec's Conventions section).
      Confirm red.
- [x] 2.14 Run `npm run test:run` and confirm every test added in 2.1–2.13
      fails (red) before writing any implementation.

## 3. Domain logic — implement to green

- [x] 3.1 Implement `lib/src/slots/grid.ts` (deterministic Mon–Fri
      10:00–19:00-start grid generator, 14-day horizon) to pass 2.1–2.2.
- [x] 3.2 Implement `lib/src/slots/subtract.ts` (half-open interval
      subtraction, the single shared disqualification predicate per
      design.md Decision 4, reused by the hold-collision check in 4.x) to
      pass 2.3–2.5.
- [x] 3.3 Implement `lib/src/slots/rank.ts` (`rankSlots()`, pure,
      lexicographic fit → compactness → earlier-date per design.md
      Decision 5) to pass 2.6–2.9.
- [x] 3.4 Implement `lib/src/slots/widen.ts` (Step 1/2/3 widening
      algorithm, composes grid + subtract + rank) to pass 2.10–2.12.
- [x] 3.5 Implement `lib/src/slots/timezone.ts` (Europe/Kyiv ↔ RFC3339 UTC
      conversion helpers used only by the adapter boundary, not by grid/
      rank/widen internals) to pass 2.13.
- [x] 3.6 Run `npm run test:run` and confirm 2.1–2.13 are now green with no
      regressions in existing suites.

## 4. Services and adapter — calendar port + spike

- [x] 4.1 Write `lib/src/slots/calendar-port.ts`: the `CalendarPort`
      interface and the three-class error taxonomy from design.md
      Decision 1 (types only, no implementation, no Google SDK import).
- [x] 4.2 Write a fixture/fake `CalendarPort` implementation for unit tests
      (in-memory busy list + tentative-event map) and add hold-lifecycle
      unit tests against it: create-hold success, hold-collision (manual
      event race, FR-SLOT-02), hold-race (two leads, FR-SLOT-02), delete-on-
      cancel — each `@trace FR-SLOT-02`. Confirm red, then implement the
      hold-lifecycle module (`lib/src/slots/hold.ts`) to green.
- [x] 4.3 Build the googleapis-backed `CalendarPort` implementation
      (service-account JWT auth per TC-CAL-01) against the real DEMO
      calendar: `freeBusy`, `createTentative`, `upgradeToConfirmed`,
      `deleteEvent`, mapping SDK errors to the three error classes.
- [x] 4.4 Time-box the MCP-server alternative per design.md's spike
      procedure: attempt the same four methods through a Google Calendar
      MCP server consumed as an MCP client from the backend (never expose
      calendar tools to the model), scored against the same four criteria.
- [x] 4.5 Record the spike verdict (with actual latency/auth/error-surface
      observations) in `design.md`'s "Spike verdict" subsection, replacing
      the placeholder — apply the tie-break default (googleapis) if the
      comparison doesn't produce a clear winner within the time box.
- [x] 4.6 Wire the chosen adapter as the production `CalendarPort` and
      confirm `npm run test:run` still passes with no `lib/` code importing
      the Google SDK or an MCP client directly (TC-PURE-01 boundary check).

## 5. Tests — NFR-REL-01 failure paths and integration smoke

- [x] 5.1 Unit test: free/busy fetch failure during proposal (simulated via
      the fixture adapter throwing a `CalendarTimeoutError`/
      `CalendarApiError`) produces the deterministic Ukrainian
      apology-and-retry text with no LLM call, and preserves the in-memory
      proposal state for resumption (`@trace NFR-REL-01`). Confirm red then
      green.
- [x] 5.2 Unit test: tentative-event creation failure during a hold leaves
      the booking out of `pending` (no orphan hold without its event) and
      preserves the lead's slot choice for retry (`@trace NFR-REL-01`,
      `@trace FR-SLOT-02`). Confirm red then green.
- [x] 5.3 Integration test/smoke (real DEMO calendar, real service-account
      credentials, `tests/integration/slots/`): free/busy round-trip
      against a seeded busy event, ranked top-2/3 slots printed and
      manually inspected, a tentative event visibly created then deleted in
      the calendar UI (screenshot evidence per the demo-proof expectation
      in `docs/mvp-capability-plan.md` §S1). (screenshot deferred to
      QA-proof stage — needs a logged-in browser via chrome-devtools MCP;
      see `tests/integration/slots/round-trip.test.ts`'s header comment.)
- [x] 5.4 Integration test: calendar-outage path against a deliberately
      broken credential/endpoint — confirms the same NFR-REL-01 apology
      path fires end-to-end (not just at the unit-fixture level).
- [x] 5.5 Integration test: real `bookings` row moves to `pending` on hold
      and back out (or to a terminal-adjacent absence) on collision/
      failure, verified against the actual SQLite file (TC-DATA-01).

## 6. Validation, docs, and archive prep

- [x] 6.1 Run `npm run lint`.
- [x] 6.2 Run `npm run test:run` (all unit tests green, TC-TEST-01).
- [x] 6.3 Run `npm run test:integration` (5.3–5.5 green against the real
      DEMO calendar and real SQLite).
- [x] 6.4 Run `npm run build`.
- [x] 6.5 Run `npx openspec validate slots --strict`.
- [x] 6.6 Run `npx openspec validate --all --strict` (baseline specs stay
      5/5, this change validates).
- [x] 6.7 Run `node scripts/check-traceability.mjs` (FR-SLOT-01..04,
      FR-GUARD-03 show implemented coverage, 0 failures).
- [x] 6.8 Update `docs/current-state.md` (phase, last-updated timestamp
      Europe/Kyiv, spike verdict summary, next slice = S2 `intake`) and
      `README.md` if it references slice status.
- [x] 6.9 Manual real-DB smoke test, spelled out step by step *(scripted:
      `scripts/qa/manual-smoke-slots.mjs`, transcript in
      `docs/qa/slots-manual-smoke.md`; deviations: step-4 busy event
      API-created on the next Monday; UI screenshots deferred to the
      QA-proof stage)*:
      1. Ensure `.env` has a valid `GOOGLE_APPLICATION_CREDENTIALS` path and
         `GOOGLE_CALENDAR_ID` for the DEMO calendar, shared with the
         service account ("Make changes").
      2. From a clean SQLite file, run the `bookings` migration/seed.
      3. In a Node REPL or a throwaway script, call the grid generator and
         print the first day's slots — confirm Mon–Fri 10:00–19:00 starts
         only, Europe/Kyiv.
      4. Manually create one busy event on the DEMO calendar tomorrow
         13:00–14:00 via the Google Calendar UI; call `freeBusy` for
         tomorrow and confirm the 13:00 slot is excluded, 12:00 and 14:00
         remain.
      5. Call the hold-creation path for a specific free slot; confirm (a)
         a `pending` row appears in the SQLite `bookings` table with a
         `calendar_event_id`, and (b) a tentative event appears on the DEMO
         calendar for exactly that interval (visually confirm in the
         Google Calendar UI, screenshot for `docs/qa/`).
      6. Attempt to hold the same slot again from a second simulated lead;
         confirm no second `pending` row is created and no second calendar
         event appears (collision path).
      7. Delete the tentative event's hold (cancel path); confirm the
         `bookings` row leaves `pending` and the calendar event is removed.
      8. Temporarily point `GOOGLE_APPLICATION_CREDENTIALS` at an invalid
         path; call `freeBusy`; confirm the deterministic Ukrainian
         apology message is produced and no crash/unhandled rejection
         occurs; restore the valid path afterward.
- [x] 6.10 Only after 6.1–6.9 all pass: run `npx openspec archive slots
      --yes`.
