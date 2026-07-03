## Context

The baseline spec (`openspec/specs/slots/spec.md`) and ADR-0003 already
settle *what* the slots capability does: grid ∩ free/busy, pure `rankSlots()`,
tentative holds, service-account auth. What ADR-0003 §6 explicitly leaves
open — "the adapter's transport is chosen by a time-boxed spike at
implementation" — is the one real technical decision this slice must close
before `lib/` code can be written against a concrete interface. Everything
else in this document (timezone handling, interval semantics, ranking order)
restates the baseline spec's Conventions section as implementation-facing
detail, not new decisions.

## Goals / Non-Goals

**Goals:**
- Land one `CalendarPort` interface that `lib/` and the hold code depend on,
  never a concrete SDK or MCP client type (TC-PURE-01).
- Run the googleapis-vs-MCP spike to a documented verdict, cited by
  `tasks.md`, before more than a thin adapter shim is written.
- Keep every grid/subtraction/ranking/widening function pure, synchronous,
  and I/O-free, verifiable in Vitest with zero network access.

**Non-Goals:**
- Deciding the `booking-hitl` Confirm/Decline calendar sync (FR-HITL-04) —
  that's S4; this slice only builds the `CalendarPort` methods S4 will later
  call (`upgradeToConfirmed`, `deleteEvent`) and proves them against the
  tentative-hold lifecycle it owns.
- Designing the `requests`/`leads` schema (S2 `intake` owns it). This slice's
  `bookings` table is deliberately minimal — see Decisions.
- Any dashboard/HallMap rendering of slot state (S3).

## Decisions

### Decision 1: `CalendarPort` — one adapter interface, spike picks the transport

**The interface** (lives in `lib/src/slots/calendar-port.ts`, a pure type +
no implementation):

```ts
interface CalendarPort {
  freeBusy(range: { start: string; end: string }): Promise<BusyInterval[]>;
  createTentative(
    slot: { start: string; end: string },
    summary: string,
    description?: string
  ): Promise<{ eventId: string }>;
  upgradeToConfirmed(eventId: string, brief: string): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
}
```

All timestamps crossing this boundary are RFC3339 UTC strings (Google's
native format); conversion to/from Europe/Kyiv wall-clock happens on the
`lib/` side of the port, never inside an adapter implementation (see
Decision 3). Every method is typed to reject with one of a small closed set
of error classes (`CalendarAuthError`, `CalendarTimeoutError`,
`CalendarApiError`) so NFR-REL-01's deterministic apology path can pattern-
match on error *kind*, not on SDK-specific exception shapes.

**Candidates:**

| | googleapis SDK | Google Calendar MCP server (backend as MCP client) |
|---|---|---|
| Auth complexity (service account) | Direct `google-auth-library` JWT flow, well-documented for service accounts | Depends on the MCP server's own auth passthrough — service-account support varies by server implementation; adds a process/transport to configure |
| `freeBusy` latency | One HTTP call via the SDK, directly measurable | Extra hop through the MCP transport (stdio or HTTP) before reaching Google's API; adds latency variance, harder to budget against NFR-UX-01 |
| Error-surface quality | SDK throws typed `GaxiosError`s with HTTP status — straightforward to map to the three `CalendarPort` error classes | MCP error responses are protocol-level (tool-call error content) wrapping whatever the server reports — mapping fidelity depends entirely on that server's error passthrough |
| Dependency weight | One well-maintained npm package (`googleapis`), no extra process | An MCP server process/binary to install, run, and keep alive locally; another moving part under NFR-LOCAL-01 |
| Demo value (homework) | Standard SDK integration — solid but unremarkable evidence | Directly demonstrates "MCP in the product, not just in the dev process" — a distinct, higher-signal piece of evidence for the graded PR (AGENTS.md: MCP in the product is Google Calendar MCP as an adapter option) |

**Spike procedure (tasks.md 4.x):** build the `googleapis` implementation
first (lowest risk, needed either way as the safety net), run it against the
real DEMO calendar for `freeBusy` + tentative create/delete, and record
actual latency and error behavior. Time-box a second pass evaluating a
Google Calendar MCP server against the same four criteria with the same
calendar. Record the verdict, with numbers, in this file's "Spike verdict"
subsection below — do not leave it as a TODO once tasks.md 4.x is checked
off.

**Default if the spike ties or the MCP evaluation is inconclusive within the
time box:** ship the googleapis SDK implementation as `CalendarPort`'s
production adapter (reliability, auth simplicity, and error-surface fidelity
win on a tie), and document the MCP server as the explored alternative in
this file rather than leaving the interface unimplemented. The interface
already makes the choice swappable later without touching `lib/` call sites.

**Spike verdict (2026-07-04, tasks 4.3+4.4): googleapis SDK wins — and not
by tie-break.**

- **googleapis (measured live against the DEMO calendar):** service-account
  JWT works headless first try once the calendar is shared; freeBusy warm
  ~170–220ms / cold ~1s, `events.insert` ~3.2s, `events.delete` ~212ms;
  `GaxiosError`s carry HTTP status and map cleanly onto the three-class
  taxonomy; ~149 packages, in-process. One hardening finding: `freebusy.query`
  can return HTTP 200 with a per-calendar `errors:[{reason:"notFound"}]` and
  empty `busy` — the adapter now raises `CalendarAuthError` instead of
  silently reading it as "free" (NFR-REL-01).
- **MCP (`@cocal/google-calendar-mcp`, measured attempt — evidence in
  `packages/calendar/spike-mcp/run-log.txt`):** disqualified on criterion 1.
  The server validates the credentials file before serving any request and
  rejects service-account JSON outright ("Expected either 'installed' object
  or direct client_id/client_secret") — 951ms from spawn to connection
  closed; both credible candidates support only interactive OAuth
  desktop-app flows (browser consent, 7-day test-mode token expiry), which a
  headless local-first backend cannot clear on restart. Also heavier
  (~169 packages + ~240MB + a standalone server process) and its errors are
  prose, not typed — a poor fit for the NFR-REL-01 taxonomy.

The in-product MCP demo bonus is therefore not realizable without switching
the whole slice to per-teacher OAuth (out of scope); the homework's MCP
evidence remains chrome-devtools + context7 in the dev process. The
`CalendarPort` interface keeps the choice swappable if a service-account-
capable MCP server appears later.

### Decision 2: `bookings` table lands now, minimal, without a `requests` FK

FR-SLOT-02 requires the hold to be visible "in SQLite," but the `requests`
table (which the intake profile lives on, FR-INTAKE-08) belongs to S2 and
does not exist yet. Two options: (a) block this slice's persistence on S2
landing first, or (b) create `bookings` now with only the columns this slice
needs, and let S2 add the `request_id` foreign key when `requests` exists.

**Chosen: (b).** `bookings(id, slot_start, slot_end, status, calendar_event_id,
created_at)`, `status ∈ {pending, confirmed, declined, cancelled}` (full enum
from TC-DATA-01, even though this slice only ever writes/reads `pending`,
so the column never needs an ALTER later). No `request_id` column yet — it
is added by S2's own schema task once `requests` exists, since SQLite
`ALTER TABLE ADD COLUMN` is cheap and the alternative (a nullable FK to a
table that doesn't exist) buys nothing.

*Trade-off:* a `pending` row in this slice is not yet linked to any lead —
acceptable because S1's scenarios ("lead A holds Wednesday 15:00," "lead B is
excluded from that slot") are proven at the `lib/`/adapter level with fixture
lead identifiers, not through a real `leads`/`requests` join; the real
end-to-end join is exercised once S2 lands and back-fills `request_id`. This
is called out explicitly so it is not mistaken for a forgotten FK.

### Decision 3: timezone handling — Europe/Kyiv wall-clock ↔ RFC3339 UTC

Per the baseline spec's Conventions section: the grid, `rankSlots()`, and
every comparison operate on Europe/Kyiv wall-clock time; the DEMO calendar's
free/busy API returns RFC3339 timestamps with an explicit UTC offset.
**The `CalendarPort` interface speaks pure RFC3339 UTC** and adapter
implementations (googleapis, MCP) are conversion-free pass-throughs; the
Kyiv↔UTC conversion happens exactly once, on the `lib/` side of the port
boundary (`hold.ts` and the composition layer) via `lib/`'s own
`timezone.ts` (`Intl.DateTimeFormat` — stdlib, not an SDK, so TC-PURE-01
holds). This keeps every adapter trivial and puts the single tested
conversion next to its unit tests. *(Amended during 4.1/4.2: the original
wording put conversion adapter-side, contradicting Decision 1's "never
inside an adapter" — resolved in favor of Decision 1.)* DST transition days
are handled by that one conversion — the grid's wall-clock starts
(10:00–19:00) never shift; only the UTC offset used for the conversion
changes.

### Decision 4: half-open interval convention, applied uniformly

A slot occupies `[start, start+60min)`; a busy interval occupies
`[busyStart, busyEnd)`. Disqualification rule: `slot.start < busy.end AND
busy.start < slot.end`. This single predicate is implemented once, in the
subtraction module, and reused (not re-derived) by the collision-check path
used at hold time (FR-SLOT-02's "hold collision" scenarios) — one code path,
two call sites, so the boundary semantics can never drift between "compute
free slots for proposal" and "re-check free/busy before creating the
tentative event."

### Decision 5: `rankSlots()` scoring order, pure and deterministic

`rankSlots(freeSlots, preferences, existingBusyIntervals) -> RankedSlot[]`
is a pure function: no `Date.now()`, no I/O, no calendar or DB access —
"now" and the busy list are always passed in as arguments so unit tests are
fully deterministic. Scoring is lexicographic, in this fixed priority order
(ties fall through to the next criterion, never combined into one weighted
score):

1. **Preference fit** — matches the lead's stated weekdays and time window
   (or the widened window from FR-SLOT-03's step, if that's what's being
   ranked).
2. **Teacher compactness** — adjacency to an existing busy interval (either
   side) scores above a slot that would leave an isolated 60-minute gap
   between two busy intervals or between a busy interval and the grid edge.
3. **Earlier date** — the remaining tie-break, ascending by date then by
   start time.

The widening algorithm (Step 1 time / Step 2 day / Step 3 full grid) is a
separate pure function layered on top of grid+subtraction+`rankSlots()` — it
decides *which candidate pool* to rank, never how to rank within a pool.

## Risks / Trade-offs

- **[Risk]** The MCP spike could run over its time box without a clear
  winner. → **Mitigation:** the default-to-googleapis rule (Decision 1)
  means the slice is never blocked on the spike's outcome; the MCP path is
  documented as explored, not abandoned mid-way silently.
- **[Risk]** A `bookings` table without `request_id` could be mistaken for
  an oversight by a later reviewer or agent. → **Mitigation:** Decision 2 is
  recorded here explicitly, and `tasks.md` calls out the deferred column so
  S2's schema task has a named handoff.
- **[Risk]** Free/busy polling latency could blow the NFR-UX-01 budget,
  especially through an MCP hop. → **Mitigation:** the spike measures actual
  latency for both candidates before the transport is chosen; the
  integration smoke test logs timings.
- **[Risk]** A manual teacher edit or a second lead's concurrent pick could
  race a hold. → **Mitigation:** already covered by the baseline spec's
  hold-collision and hold-race scenarios (FR-SLOT-02) — the same
  free/busy-recheck-before-create code path handles both; no new design
  needed here beyond Decision 4's single shared predicate.
- **[Risk]** Typed calendar errors could leak SDK-specific details into
  NFR-REL-01's deterministic apology if the adapter's error mapping is
  incomplete. → **Mitigation:** the three-class error taxonomy in Decision 1
  is closed and exhaustive; the integration smoke test's outage-path case
  asserts the apology message is produced without an LLM call regardless of
  which underlying error class fired.
