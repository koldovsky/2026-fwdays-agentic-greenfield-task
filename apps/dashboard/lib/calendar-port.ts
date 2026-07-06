// apps/dashboard — the `CalendarPort` resolution seam for the "Delete lead"
// admin action (dashboard tasks.md §5.6, `@trace NFR-PRIV-02`). Mirrors the
// `KAMERTON_DB_PATH`-env seam `dashboard-db.ts`/the SSE route already use
// (a Route Handler's fixed `(request, context)` signature has no room for
// constructor-injected dependencies, same reasoning as that file's header
// comment) — plus one extra hook tests need that an env var alone can't
// give them: object-identity access to the exact `FakeCalendarPort`
// instance a test seeded a tentative event on, so the test can assert that
// SPECIFIC instance's own state after the route runs.
//
// SEAM DECISION (§5.6's own text: "an open GREEN-phase decision this RED
// pass deliberately does not resolve" — this file is that decision):
// `setCalendarPortForTesting(port)` lets a test install the exact
// `CalendarPort` instance (an `@kamerton/lib/src/slots/fake-calendar.ts`
// `FakeCalendarPort`, S1's own fake — never re-invented) the route will
// resolve for every call until the test clears it again
// (`setCalendarPortForTesting(undefined)`). Production code never calls
// this setter — `resolveCalendarPort()` falls back to a real
// `GoogleCalendarPort` (reads `GOOGLE_*` env, same as
// `packages/bot/src/index.ts`'s own `new GoogleCalendarPort()` wiring)
// whenever no test override is installed.

import { GoogleCalendarPort } from "@kamerton/calendar";
import type { CalendarPort } from "@kamerton/lib/src/slots/calendar-port.ts";

let testCalendarPort: CalendarPort | undefined;

/**
 * TEST-ONLY seam: installs `port` as the `CalendarPort` every subsequent
 * `resolveCalendarPort()` call returns, until cleared with `undefined`.
 * Never called from production code.
 */
export function setCalendarPortForTesting(port: CalendarPort | undefined): void {
  testCalendarPort = port;
}

/**
 * Resolves the `CalendarPort` the "Delete lead" route calls
 * `deleteEvent(...)` on: the test-installed override if one is set,
 * otherwise a real `GoogleCalendarPort` (TC-CAL-01, ADR-0003).
 */
export function resolveCalendarPort(): CalendarPort {
  if (testCalendarPort !== undefined) return testCalendarPort;
  return new GoogleCalendarPort(); // reads GOOGLE_* from env
}
