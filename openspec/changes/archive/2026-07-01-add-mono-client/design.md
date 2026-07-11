## Context

`jarsplit` needs one piece of live data — the user's jars — to resolve plan
names into `sendId`s. That data comes from monobank's personal `client-info`
endpoint, which is rate-limited (~1 request/60s), requires a bearer-style
token from `MONO_TOKEN`, and returns both `accounts[]` (ignored) and `jars[]`
(consumed). `plan-parsing` (already implemented, `internal/planparsing`) is a
pure, offline package with no knowledge of the network; this change adds the
sibling package that owns everything network- and auth-related, per the
Phase 1 split in [openspec-capability-plan.md](../../../docs/openspec-capability-plan.md).

Nothing in the repo calls monobank yet. `NFR-TEST-01` requires the whole
pipeline to be testable offline, so the fixture override designed here is
load-bearing for every capability built on top of this one (`jar-matching`,
`cli-orchestration`), not just for this package's own tests.

## Goals / Non-Goals

**Goals:**
- Fetch and parse `client-info`, exposing only the fields matching/link-gen
  need: `title`, `sendId`, `currencyCode` (per jar).
- Guarantee exactly one HTTP call per run (FR-API-01), with a bounded timeout
  (NFR-NET-01).
- Never let the token touch disk, logs, or error strings (NFR-SEC-01/02).
- Provide a fixture override (`MONO_CLIENT_INFO_FILE`) so downstream code and
  CI never depend on the live, rate-limited API (NFR-TEST-01).
- Surface a small, closed set of fatal error kinds the caller can switch on
  to print the distinct FR-FAIL-02 messages — without this package owning
  message text or exit codes (that's `cli-orchestration`'s job).

**Non-Goals:**
- No retry logic — one call, one attempt, per FR-FAIL-02 ("No auto-retry").
- No jar-name matching or currency filtering — that's `jar-matching`.
- No CLI flag parsing or exit-code mapping — that's `cli-orchestration`.
- No handling of `accounts[]` — explicitly out of scope per FR-RESOLVE-01.

## Decisions

**1. Interface shape: `FetchJars(ctx) ([]Jar, error)`, not a struct with
exported HTTP internals.**
A single-method interface (e.g. `type JarFetcher interface { FetchJars(ctx
context.Context) ([]Jar, error) }`) is the seam `cli-orchestration` and tests
inject through. Alternative considered: exposing a `*Client` struct directly
and letting callers swap `http.Client` — rejected because it leaks transport
details into `cli-orchestration` and makes the fixture path a special case
instead of a peer implementation of the same interface.

**2. Fixture override lives inside this package, selected by env var at
construction time, not by a build tag or separate binary.**
`NewJarFetcher()` checks `MONO_CLIENT_INFO_FILE` first: if set, it returns a
file-backed implementation that reads and JSON-decodes that path once; if
unset, it returns the live HTTP-backed implementation requiring `MONO_TOKEN`.
Alternative considered: a `-fixture` CLI flag owned by `cli-orchestration` —
rejected because NFR-TEST-01 explicitly names the env-var mechanism, and
keeping the switch inside `mono-client` means every future caller gets the
offline path for free.

**3. `Jar` is a minimal struct owned by this package: `Title string`,
`SendID string`, `CurrencyCode int`.**
Only the three fields TC-SCHEMA-01 names as consumed. `balance` and `goal`
are not decoded — no requirement reads them, and skipping them avoids
carrying kopiyka-amount fields nothing in the codebase converts. Alternative
considered: decoding the full monobank schema for future-proofing — rejected
per the "don't design for hypothetical future requirements" default; adding
fields later is a small, obvious change if a future capability needs them.

**4. Error taxonomy is a small set of sentinel-comparable typed errors, not
raw HTTP status codes leaking upward.**
Define `ErrMissingToken`, `ErrInvalidToken` (401), `ErrRateLimited` (429),
`ErrUnreachable` (network/timeout) — all satisfying `error`, distinguishable
via `errors.Is`. Alternative considered: returning `*http.Response` or raw
status ints — rejected because FR-FAIL-02 requires the *caller*
(`cli-orchestration`) to print one distinct message per condition, and typed
sentinels are what let it `switch`/`errors.Is` without re-deriving meaning
from a status code.

**5. Transport: `net/http` with a request-scoped `context.Context` carrying a
~10s timeout, set by the caller via `context.WithTimeout` — this package
does not hardcode the timeout in a client-level `Timeout` field.**
Passing the deadline via context (rather than `http.Client.Timeout`) keeps
the bound visible at the call site and lets `cli-orchestration` (or tests)
tune it without reconstructing the client. The package documents ~10s as the
expected caller-supplied bound (NFR-NET-01) but does not enforce a specific
number itself.

## Risks / Trade-offs

- **[Risk] A malformed or partial fixture file (missing `sendId`, wrong
  currency type) silently produces a `Jar` with a zero-value field, which
  `jar-matching` might then treat as a valid non-match instead of an error.**
  → Mitigation: `json.Unmarshal` with a strict `Jars []Jar` target is enough
  for this package's scope; validating *semantic* completeness of each jar
  (non-empty `SendID`, known `CurrencyCode`) is left to `jar-matching`, which
  already owns "is this jar eligible" logic (FR-CURRENCY-01). Documented here
  so it isn't silently dropped.
- **[Risk] `errors.Is`-based sentinels don't carry the underlying HTTP status
  or network error text, which could make debugging a genuine outage harder.**
  → Mitigation: wrap the underlying error with `%w` inside each sentinel path
  so `Unwrap` still reaches the original `*http.Response`/`net.Error` for logs
  that aren't the user-facing FR-FAIL-02 message — while `errors.Is` still
  matches the sentinel for control flow.
- **[Trade-off] Not decoding `balance`/`goal` now means a future capability
  that needs them must touch this package again.**
  → Accepted: consistent with the project's stated preference for minimal
  scope over speculative fields (see decision 3).

## Open Questions

- None — TC-API-01, TC-SCHEMA-01, and the NFR-SEC-* constraints fully
  determine transport, auth, and schema shape for this capability.
