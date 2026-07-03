// @kamerton/calendar — the googleapis-backed CalendarPort adapter
// (TC-CAL-01, ADR-0003 §6). This is the ONLY module in the workspace allowed
// to import the Google SDK: `lib/` defines the `CalendarPort` interface
// (lib/src/slots/calendar-port.ts, task 4.1) and stays framework-free
// (TC-PURE-01); this package implements that interface against the real
// DEMO Google Calendar via a service-account JWT (google-auth-library, a
// transitive dependency of `googleapis` — see `npm ls google-auth-library`).
//
// Stub only for now — task 1.1 (this slice's section 1) just wires the
// workspace and its `googleapis` dependency. The actual implementation
// (freeBusy / createTentative / upgradeToConfirmed / deleteEvent, mapping
// SDK GaxiosErrors to CalendarAuthError/CalendarTimeoutError/CalendarApiError)
// lands in task 4.3, after the spike (design.md Decision 1) and after
// lib/src/slots/calendar-port.ts exists (task 4.1). Do not import this
// package from lib/ or from anywhere until then.

export {};
