// @kamerton/calendar — the googleapis-backed CalendarPort adapter
// (TC-CAL-01, ADR-0003 §6). This is the ONLY module in the workspace allowed
// to import the Google SDK: `lib/` defines the `CalendarPort` interface
// (lib/src/slots/calendar-port.ts, task 4.1) and stays framework-free
// (TC-PURE-01); this package implements that interface against the real
// DEMO Google Calendar via a service-account JWT (google-auth-library, a
// transitive dependency of `googleapis` — see `npm ls google-auth-library`).
//
// Task 4.3: `GoogleCalendarPort` is the production adapter — see
// `./google-calendar.ts` for freeBusy / createTentative / upgradeToConfirmed
// / deleteEvent and the SDK-error-to-CalendarPort-error-class mapping.

export { GoogleCalendarPort, mapCalendarError } from "./google-calendar.ts";
export type { GoogleCalendarPortOptions } from "./google-calendar.ts";
