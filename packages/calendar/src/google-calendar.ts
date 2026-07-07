// @kamerton/calendar — googleapis-backed CalendarPort implementation
// (tasks.md 4.3, TC-CAL-01, ADR-0003 §6, design.md Decision 1 + amended
// Decision 3). This is the boundary that is ALLOWED to import the Google
// SDK; it is a conversion-free RFC3339-UTC pass-through — no timezone
// arithmetic happens in this file (design.md Decision 3: that conversion
// lives once, on the `lib/` side, in `timezone.ts`).
//
// Cross-workspace import note: `lib/` has no build step and its
// package.json declares no `exports` map, so its `@kamerton/lib` package
// name resolves subpaths by legacy/bundler resolution. Node 24's native
// TypeScript support (unflagged type-stripping) can execute a `.ts` module
// directly, but only when the import specifier carries an explicit `.ts`
// extension — so this import is written with the extension, and the repo's
// root `tsconfig.json` gained `allowImportingTsExtensions: true` (already
// implied by `noEmit: true`) so `tsc --noEmit` accepts the same specifier.
import {
  type BusyInterval,
  type CalendarPort,
  CalendarApiError,
  CalendarAuthError,
  CalendarTimeoutError,
} from "@kamerton/lib/src/slots/calendar-port.ts";
import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

/** Error codes/names that indicate the request never got a response in time
 *  (network-level, not an HTTP status) — mapped to `CalendarTimeoutError`. */
const TIMEOUT_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "ECONNABORTED",
  "EAI_AGAIN",
  "TimeoutError",
  "ABORT_ERR",
]);

/** Narrow, duck-typed view of the shapes `gaxios`/`googleapis` throw — kept
 *  local (not imported from `gaxios`, a transitive, undeclared dependency)
 *  so error mapping does not depend on a package this adapter never
 *  installs directly. */
interface SdkErrorShape {
  code?: string | number;
  status?: number;
  message?: string;
  name?: string;
  response?: { status?: number };
}

function isSdkErrorShape(error: unknown): error is SdkErrorShape {
  return typeof error === "object" && error !== null;
}

/**
 * Maps any error thrown by the `googleapis`/`google-auth-library` SDK stack
 * to exactly one of `CalendarPort`'s three closed error classes (design.md
 * Decision 1) — never lets a raw SDK exception cross the port boundary.
 */
export function mapCalendarError(error: unknown, context: string): CalendarApiError | CalendarAuthError | CalendarTimeoutError {
  const shape = isSdkErrorShape(error) ? error : {};
  const status = shape.response?.status ?? shape.status;
  const code = shape.code;
  const message = shape.message ?? String(error);

  if (status === 401 || status === 403) {
    return new CalendarAuthError(`${context}: calendar authentication/authorization failed`, { cause: error });
  }
  if (
    (typeof code === "string" && TIMEOUT_CODES.has(code)) ||
    shape.name === "TimeoutError" ||
    shape.name === "AbortError" ||
    /timeout/i.test(message)
  ) {
    return new CalendarTimeoutError(`${context}: calendar request timed out`, { cause: error });
  }
  return new CalendarApiError(`${context}: ${message}`, { cause: error, status });
}

export interface GoogleCalendarPortOptions {
  /** Path to the service-account JSON key file (TC-CAL-01). Defaults to
   *  `process.env.GOOGLE_APPLICATION_CREDENTIALS`. */
  keyFile?: string;
  /** Target calendar id (the DEMO calendar). Defaults to
   *  `process.env.GOOGLE_CALENDAR_ID`. */
  calendarId?: string;
}

/**
 * `CalendarPort` implemented against the real Google Calendar API via a
 * service-account JWT (`google-auth-library`, transitive via `googleapis`).
 * Every method is a conversion-free RFC3339-UTC pass-through (design.md
 * Decision 3) and rejects only with `CalendarAuthError`/
 * `CalendarTimeoutError`/`CalendarApiError` (design.md Decision 1).
 */
export class GoogleCalendarPort implements CalendarPort {
  private readonly calendarId: string;
  private readonly authClientPromise: Promise<calendar_v3.Calendar>;

  constructor(options: GoogleCalendarPortOptions = {}) {
    const keyFile = options.keyFile ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const calendarId = options.calendarId ?? process.env.GOOGLE_CALENDAR_ID;
    if (!keyFile) {
      throw new CalendarAuthError(
        "GOOGLE_APPLICATION_CREDENTIALS is not set — cannot authenticate to Google Calendar",
      );
    }
    if (!calendarId) {
      throw new CalendarAuthError("GOOGLE_CALENDAR_ID is not set — no target calendar configured");
    }
    this.calendarId = calendarId;
    const auth = new google.auth.GoogleAuth({ keyFile, scopes: [CALENDAR_SCOPE] });
    this.authClientPromise = Promise.resolve(google.calendar({ version: "v3", auth }));
  }

  private async client(): Promise<calendar_v3.Calendar> {
    return this.authClientPromise;
  }

  async freeBusy(range: { start: string; end: string }): Promise<BusyInterval[]> {
    try {
      const calendar = await this.client();
      const res = await calendar.freebusy.query({
        requestBody: {
          timeMin: range.start,
          timeMax: range.end,
          items: [{ id: this.calendarId }],
        },
      });
      const calendarEntry = res.data.calendars?.[this.calendarId];
      // The freebusy.query HTTP call can succeed (200) while still carrying
      // a PER-CALENDAR error (e.g. the calendar isn't shared with this
      // service account at all — Google reports that as `notFound` here
      // rather than an HTTP 404). Silently returning `[]` in that case would
      // look identical to "genuinely free," which is unsafe (NFR-REL-01) —
      // surface it as a `CalendarAuthError` (missing calendar-sharing
      // permission is explicitly the documented cause for that class) so
      // the deterministic apology path fires instead of a false "free" read.
      const calendarError = calendarEntry?.errors?.[0];
      if (calendarError) {
        const reason = calendarError.reason ?? "unknown";
        if (reason === "notFound" || reason === "forbidden") {
          throw new CalendarAuthError(
            `freeBusy: the configured calendar reported "${reason}" — likely not shared with this service account`,
          );
        }
        throw new CalendarApiError(`freeBusy: calendar reported error "${reason}"`);
      }
      const busy = calendarEntry?.busy ?? [];
      return busy
        .filter((period): period is { start: string; end: string } =>
          typeof period.start === "string" && typeof period.end === "string",
        )
        .map((period) => ({ start: period.start, end: period.end }));
    } catch (error) {
      if (error instanceof CalendarAuthError || error instanceof CalendarApiError) throw error;
      throw mapCalendarError(error, "freeBusy");
    }
  }

  async createTentative(
    slot: { start: string; end: string },
    summary: string,
    description?: string,
  ): Promise<{ eventId: string }> {
    try {
      const calendar = await this.client();
      const res = await calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: {
          summary,
          description,
          start: { dateTime: slot.start },
          end: { dateTime: slot.end },
          // status: "tentative" renders the event with Google Calendar's
          // tentative (diagonal-stripe) treatment in the UI. Deliberately
          // NOT setting transparency: "transparent" — that would exclude
          // the event from freebusy.query results, but FR-SLOT-02 requires
          // a tentative hold to still block free/busy like a confirmed
          // event. Leaving `transparency` unset defaults to "opaque",
          // which is what keeps freeBusy() reporting this interval as busy.
          status: "tentative",
        },
      });
      const eventId = res.data.id;
      if (!eventId) {
        throw new CalendarApiError("createTentative: Google Calendar did not return an event id");
      }
      return { eventId };
    } catch (error) {
      if (error instanceof CalendarApiError) throw error;
      throw mapCalendarError(error, "createTentative");
    }
  }

  async upgradeToConfirmed(eventId: string, brief: string): Promise<void> {
    try {
      const calendar = await this.client();
      await calendar.events.patch({
        calendarId: this.calendarId,
        eventId,
        requestBody: {
          status: "confirmed",
          description: brief,
        },
      });
    } catch (error) {
      throw mapCalendarError(error, "upgradeToConfirmed");
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      const calendar = await this.client();
      await calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });
    } catch (error) {
      throw mapCalendarError(error, "deleteEvent");
    }
  }

  /**
   * `calendar.events.list` — distinct, identity-carrying events overlapping
   * `range` (the fix for the live-found Confirm double-booking bug, see
   * `CalendarPort.busyEventsInRange`'s own doc comment). `singleEvents:
   * true` expands recurring events into concrete instances (required for
   * `orderBy: "startTime"`, which Google only accepts when `singleEvents`
   * is set); `maxResults: 2500` (Google's documented page-size ceiling) so
   * a single call covers the narrow slot-sized `range` this port is always
   * called with, without needing pagination.
   *
   * All-day events (a `date`-only `start`/`end`, no `dateTime`) and
   * `status === "cancelled"` events are SKIPPED: an all-day event carries no
   * timed range comparable to a booking slot, and a cancelled event is not
   * actually occupying the calendar (Google's `events.list` can still
   * surface cancelled events in some sync modes).
   *
   * NOT a conversion-free pass-through, unlike this adapter's other methods
   * (second live-found Confirm bug, `docs/qa/booking-hitl-manual-smoke.md`
   * "History"): `events.list`'s `start.dateTime`/`end.dateTime` carry the
   * CALENDAR'S LOCAL OFFSET (e.g. `"...T17:00:00+03:00"`), never `Z`-UTC —
   * but `CalendarPort`'s own interface contract (and `freeBusy`'s actual
   * behaviour) is RFC3339 UTC throughout. Normalizing here, at the adapter
   * boundary, honors that contract for every caller (defense-in-depth
   * alongside the route-level, format-agnostic instant comparison in
   * `apps/dashboard/app/api/decisions/[requestId]/route.ts`'s
   * `hasIdentityBasedCollision`) rather than leaking a local-offset format
   * that only this one method produces.
   */
  async busyEventsInRange(
    range: { start: string; end: string },
  ): Promise<{ eventId: string; start: string; end: string }[]> {
    try {
      const calendar = await this.client();
      const res = await calendar.events.list({
        calendarId: this.calendarId,
        timeMin: range.start,
        timeMax: range.end,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 2500,
      });
      const items = res.data.items ?? [];
      const events: { eventId: string; start: string; end: string }[] = [];
      for (const event of items) {
        if (event.status === "cancelled") continue;
        const eventId = event.id;
        const start = event.start?.dateTime;
        const end = event.end?.dateTime;
        if (typeof eventId !== "string" || typeof start !== "string" || typeof end !== "string") {
          continue;
        }
        // Normalize the local-offset `dateTime` echo to `Z`-UTC RFC3339,
        // matching `freeBusy`'s and the `CalendarPort` interface's contract.
        events.push({ eventId, start: new Date(start).toISOString(), end: new Date(end).toISOString() });
      }
      return events;
    } catch (error) {
      if (error instanceof CalendarApiError) throw error;
      throw mapCalendarError(error, "busyEventsInRange");
    }
  }
}
