## Context

Three capabilities are already shipped: `plan-parsing` (`planparsing.Warning`
for malformed/duplicate lines), `jar-matching` (`jarmatching.Warning` for
unknown/non-UAH/ambiguous names), and `link-generation` (`linkgen.Link` for
every unambiguous match). Nothing yet turns these three data shapes into
what the user reads: a stdout table with a total, and stderr warnings with
a skip reconciliation. `output-reporting` is that rendering layer — pure
formatting over already-validated data, no I/O beyond writing to the
`io.Writer`s it's given (the real `os.Stdout`/`os.Stderr` wiring, plus the
process exit code, is `cli-orchestration`'s job in Phase 5).

The one gap in the existing data: `jarmatching.Warning{Name, Reason}` has
no `Amount`, but FR-TOTAL-02 needs a "skipped total" — the sum of amounts
for jars that were skipped instead of matched. Every one of those entries
already carried a validated `Entry.Amount` when `MatchJars` built the
warning; the amount is being dropped on the floor rather than being
unavailable.

## Goals / Non-Goals

**Goals:**
- Two small, pure render functions — one for the stdout table+total, one
  for stderr warnings+reconciliation — over data types already exported by
  upstream capabilities.
- Deterministic output (NFR-DET-01): same inputs in the same order always
  produce byte-identical bytes on both writers.
- Every warning kind required by FR-WARN-01 (unknown, ambiguous,
  duplicate, malformed, non-UAH) is rendered — parse-level warnings and
  match-level warnings are both first-class inputs, not just the latter.
- Close the "skipped total" data gap with the smallest possible change:
  one additive field on an already-shipped type, not a new parallel data
  structure or a re-walk of the original plan.

**Non-Goals:**
- No writing to `os.Stdout`/`os.Stderr` directly, no exit-code decisions —
  both are `cli-orchestration`'s concern (FR-FAIL-01, FR-EXIT-01).
- No re-validating or re-matching anything — this capability trusts its
  inputs completely, same posture as `link-generation`.
- No changes to `jar-matching`'s matching *behavior* — the `Warning.Amount`
  addition carries data, it doesn't change which entries match or skip.

## Decisions

**1. Two functions, not one, split by writer and by concern.**
`WriteTable(w io.Writer, links []linkgen.Link) error` renders the stdout
table + `Разом` total (FR-OUTPUT-01/02, FR-TOTAL-01).
`WriteWarnings(w io.Writer, links []linkgen.Link, parseWarnings
[]planparsing.Warning, matchWarnings []jarmatching.Warning) error` renders
every warning plus the skip reconciliation (FR-WARN-01, FR-TOTAL-02).
Alternative considered: one `Report(stdout, stderr io.Writer, ...) error`
function. Rejected — the two outputs go to different streams, are each
independently testable/golden-able, and `cli-orchestration` may want to
call them at different points (e.g. table only when `links` is non-empty).
`WriteWarnings` still takes `links` (not a pre-summed int) so the caller
never has to compute a partial total by hand — the package owns all its
own arithmetic.

**2. `jarmatching.Warning` gains `Amount int`, populated at all three
existing warning call sites (unknown, non-UAH, ambiguous) from the
entry's already-validated `Amount`.**
Alternative considered: have `output-reporting` re-derive skipped amounts
by taking the original `planparsing.Plan` as an extra input and looking up
each warning's `Name` back into `Plan.Entries`. Rejected — that requires
a name-keyed lookup that re-introduces exactly the "could this name be
ambiguous/duplicated" question `jar-matching` already resolved once, and
adds a fourth input type (`planparsing.Plan` on top of its `Warning`) to
this capability for data that's one field away in a type `jar-matching`
already returns. The field addition is purely additive — no existing
caller of `jarmatching.Warning` matches on struct shape via
`reflect.DeepEqual`, so no existing test breaks (verified by reading
`jarmatching_test.go`).
`planparsing.Warning` is deliberately **not** given the same treatment:
FR-DUP-01 explicitly says duplicate amounts are "never summed or
replaced," and malformed lines (missing `=`, empty name, invalid amount)
have no valid amount to carry by definition. Parse-level warnings are
rendered but excluded from the FR-TOTAL-02 arithmetic on purpose.

**3. FR-TOTAL-02's "planned total" is computed as `sum(links.Amount) +
sum(matchWarnings.Amount)`, not re-derived from the plan.**
Every entry that reaches `jar-matching` ends up as exactly one `Matched`
(→ a `Link`) or exactly one `Warning` (per `jarmatching`'s own contract) —
so the two already-available sums fully reconstruct "everything that had
a valid, non-duplicate amount and was eligible to be sent." Duplicates and
malformed lines are excluded from this figure by construction, matching
Decision 2.

**4. The reconciliation line in `WriteWarnings` prints only when
`len(matchWarnings) > 0`.**
This matches FR-TOTAL-02's literal condition ("When any jar is skipped").
A run with only parse-level warnings (e.g. one malformed line, but every
other entry matched cleanly) still prints those parse warnings, but no
reconciliation line — there is no "jar" skip to reconcile, and the stdout
total already accounts for every entry that reached matching.

**5. `text/tabwriter` (stdlib) for column alignment in `WriteTable`.**
The `Разом` total row is written as a 3-cell row (`"Разом", "N ₴", ""`) to
the same tabwriter so its first two columns align with the jar rows above
it, matching the brief's example layout. Alternative considered: manual
width calculation. Rejected — `tabwriter` is stdlib (TC-DEP-01-compliant)
and removes a whole class of off-by-one alignment bugs.

**6. Warning line format: `warning: <location>: [<name>: ]<reason>`.**
`<location>` is `line N` / `lines N, M` for parse warnings (from
`Warning.Lines`) and omitted for match warnings (they're not tied to a
single source line once past parsing). `<name>` is included when
non-empty (parse warnings for a missing `=` or empty name have no name to
show). This keeps one predictable, greppable prefix (`warning:`) across
every warning kind, satisfying FR-WARN-01 without inventing per-kind
formats. Exact strings are pinned in `tasks.md`'s test list so golden
tests lock in NFR-DET-01.

## Risks / Trade-offs

- **Risk:** Modifying an already-archived capability (`jar-matching`)
  from a different change could be seen as scope creep. → **Mitigation:**
  the change is additive-only (new struct field, three call sites
  populate it), doesn't alter `jar-matching`'s spec requirements or
  scenarios, and is called out explicitly in `proposal.md`'s Impact
  section rather than hidden inside `output-reporting`'s own spec.
- **Risk:** Warning text format (Decision 6) is invented here with no
  brief precedent, so it may need to change once `cli-orchestration` or a
  real user sees it end-to-end. → **Mitigation:** the format lives in one
  small internal function (`formatWarning`), not spread across call
  sites, so a later wording change is a single-function edit plus a
  golden-test update.
- **Trade-off:** `WriteTable`/`WriteWarnings` return `error` (propagated
  from the underlying `Fprintf`/tabwriter `Flush` calls) even though a
  write to `os.Stdout`/`os.Stderr` essentially never fails in practice. This
  matches idiomatic Go `io.Writer`-based APIs and costs nothing at call
  sites that choose to ignore the error.

## Open Questions

None — both inputs needed for FR-TOTAL-02 (planned/skipped totals) are
now fully available either directly (`Link.Amount`) or via the additive
`Warning.Amount` field, so there is no unresolved data-shape question
left for `cli-orchestration` to work around later.
