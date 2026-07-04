// tests/integration/slots — namespace-wide cleanup of "[itest-slots]"
// events on the real DEMO calendar (tasks.md 5.3-5.5). Test infrastructure
// ONLY: `CalendarPort` (lib/src/slots/calendar-port.ts) deliberately has no
// "list events" method (nothing in the product needs one), so this file
// builds its own minimal read-only-except-delete `googleapis` client
// directly — duplicating a few lines of `GoogleCalendarPort`'s auth setup
// rather than exposing a listing capability on the production port that
// only tests need.
//
// Called from every integration test file's beforeAll/afterAll so a run
// that crashes mid-test (leaving a leftover tentative event) does not break
// the NEXT run — hermetic reruns per the task brief. `fileParallelism:
// false` in vitest.config.ts is what makes it safe for every file to run
// this same namespace-wide sweep without racing a sibling file's in-flight
// fixture.

import { google, type calendar_v3 } from "googleapis";
import { ITEST_PREFIX, requireEnv } from "./env";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

async function rawCalendarClient(): Promise<calendar_v3.Calendar> {
  const keyFile = requireEnv("GOOGLE_APPLICATION_CREDENTIALS");
  const auth = new google.auth.GoogleAuth({ keyFile, scopes: [CALENDAR_SCOPE] });
  return google.calendar({ version: "v3", auth });
}

function isNotFoundError(error: unknown): boolean {
  const shape = error as { code?: number; response?: { status?: number } } | undefined;
  const status = shape?.response?.status ?? shape?.code;
  return status === 404 || status === 410;
}

/**
 * Deletes every event on the DEMO calendar whose summary starts with
 * `ITEST_PREFIX`, across a wide window (7 days in the past .. 120 days in
 * the future) so a previous run's crash-before-cleanup never accumulates.
 * Tolerant of 404/410 (already gone — e.g. a concurrent cleanup call, or a
 * test that already deleted its own seed). Returns the number deleted, for
 * a console log a human can glance at.
 */
export async function cleanupLeftoverItestEvents(): Promise<number> {
  const calendarId = requireEnv("GOOGLE_CALENDAR_ID");
  const calendar = await rawCalendarClient();
  const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString();

  let deleted = 0;
  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      showDeleted: false,
      q: ITEST_PREFIX,
      pageToken,
    });
    const items = res.data.items ?? [];
    for (const item of items) {
      // `q` full-text-searches summary/description/location — re-check the
      // summary prefix explicitly so cleanup never touches an event that
      // merely mentions "[itest-slots]" in its description.
      if (!item.id || !item.summary?.startsWith(ITEST_PREFIX)) continue;
      try {
        await calendar.events.delete({ calendarId, eventId: item.id });
        deleted++;
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return deleted;
}
