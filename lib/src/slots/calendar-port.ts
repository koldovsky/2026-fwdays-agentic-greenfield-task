// Types only — no implementation, no Google SDK import, no I/O
// (tasks.md 4.1, design.md Decision 1). Concrete adapters (googleapis-backed
// per tasks.md 4.3, or an MCP-backed alternative per 4.4) implement this
// interface; `lib/` code (e.g. hold.ts) depends only on this port, never on
// a concrete SDK or MCP client type (TC-PURE-01).

/**
 * A busy interval as it crosses the `CalendarPort` boundary: RFC3339 UTC
 * strings, Google's native free/busy format (design.md Decision 1).
 *
 * This is DELIBERATELY a different shape's semantics than `subtract.ts`'s
 * `BusyInterval` (Europe/Kyiv wall-clock LOCAL "YYYY-MM-DDTHH:mm", no
 * offset) even though both are structurally `{ start, end }` strings —
 * conversion between the two happens on the `lib/` side of this port (e.g.
 * in `hold.ts`, via `timezone.ts`'s `kyivWallClockToUtc`/
 * `utcToKyivWallClock`), never inside a `CalendarPort` implementation
 * (design.md Decision 1 and Decision 3). Do not import this type where a
 * Kyiv-local `BusyInterval` is expected, or vice versa, without an explicit
 * conversion step.
 */
export interface BusyInterval {
  start: string;
  end: string;
}

/**
 * One adapter interface for all Google Calendar I/O (ADR-0003 §6, design.md
 * Decision 1). Every method is `async` (a real network call in production
 * adapters) and rejects only with one of the three error classes below —
 * never a raw SDK/MCP exception — so NFR-REL-01's deterministic apology path
 * can pattern-match on error *kind* everywhere this port is called.
 */
export interface CalendarPort {
  /** Busy intervals overlapping `range`, RFC3339 UTC in and out. Includes
   *  any tentative or confirmed event in the underlying calendar — a
   *  tentative hold blocks free/busy the same way a confirmed event does
   *  (FR-SLOT-02). */
  freeBusy(range: { start: string; end: string }): Promise<BusyInterval[]>;

  /** Creates a TENTATIVE event for exactly `slot` (RFC3339 UTC), making a
   *  hold visible to the teacher and blocking free/busy for that interval
   *  (FR-SLOT-02). Deterministic code calls this, never the model
   *  (FR-GUARD-01/06). */
  createTentative(
    slot: { start: string; end: string },
    summary: string,
    description?: string,
  ): Promise<{ eventId: string }>;

  /** Upgrades an existing tentative event to confirmed, setting `brief` as
   *  its description. Owned by `booking-hitl` (FR-HITL-04) — this slice only
   *  defines the method S4 will call, it does not call it itself
   *  (design.md Non-Goals). */
  upgradeToConfirmed(eventId: string, brief: string): Promise<void>;

  /** Removes an event entirely — used on hold-cancel/decline (FR-SLOT-02)
   *  and by S4's decline path. */
  deleteEvent(eventId: string): Promise<void>;

  /**
   * Distinct calendar EVENTS overlapping `range`, each carrying its own
   * identity (`eventId`) — Google `events.list`-shaped. Unlike `freeBusy`,
   * which reports busy TIME RANGES and (per real Google Calendar
   * `freebusy.query` semantics — confirmed empirically, see
   * `docs/qa/booking-hitl-manual-smoke.md`'s "REAL BUG FOUND" note) MERGES
   * overlapping busy periods from DIFFERENT events on the same calendar into
   * a single interval, `busyEventsInRange` never merges: every event stays
   * its own entry, identifiable by `eventId`, no matter how many OTHER
   * events exactly or partially overlap it.
   *
   * This is the fix for the live-found Confirm double-booking bug: a fresh
   * collision re-check (`booking-hitl` FR-HITL-04) that excludes the
   * booking's own `calendar_event_id` BY IDENTITY (rather than `freeBusy`'s
   * merged, identity-less interval list filtered by an instant-equality
   * self-filter) can never mistake "my own hold merged with a genuinely
   * distinct external event" for "just my own hold" — any OTHER eventId
   * left after excluding the booking's own is a real collision, regardless
   * of whether its range happens to be byte-for-byte identical to the
   * booking's own range.
   */
  busyEventsInRange(
    range: { start: string; end: string },
  ): Promise<{ eventId: string; start: string; end: string }[]>;
}

/**
 * Closed, exhaustive three-class error taxonomy (design.md Decision 1). A
 * `CalendarPort` implementation MUST map every underlying failure (SDK
 * exception, MCP error-content, network error) to exactly one of these
 * three before it crosses back into `lib/` — never a raw SDK-specific
 * exception shape — so NFR-REL-01's deterministic apology path can
 * pattern-match on error *kind* alone. Types/constructors only: no mapping
 * logic lives here (that belongs to each concrete adapter).
 */
export abstract class CalendarError extends Error {}

/** Authentication/authorization failed (e.g. invalid or expired
 *  service-account credentials, missing calendar-sharing permission). */
export class CalendarAuthError extends CalendarError {
  constructor(message = "Calendar authentication failed", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CalendarAuthError";
  }
}

/** The call did not complete within budget (network timeout, no response). */
export class CalendarTimeoutError extends CalendarError {
  constructor(message = "Calendar request timed out", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CalendarTimeoutError";
  }
}

/** Any other calendar API failure (4xx/5xx, malformed response, transport
 *  error not classified as auth or timeout). `status`, when known, carries
 *  the upstream HTTP status code for logging — never used to change the
 *  deterministic apology copy, which only ever branches on error *class*. */
export class CalendarApiError extends CalendarError {
  readonly status?: number;

  constructor(message: string, options?: { cause?: unknown; status?: number }) {
    super(message, { cause: options?.cause });
    this.name = "CalendarApiError";
    this.status = options?.status;
  }
}
