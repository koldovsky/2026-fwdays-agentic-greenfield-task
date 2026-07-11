## Context

`plan-parsing` is the first capability implemented (see
[docs/openspec-capability-plan.md](../../../docs/openspec-capability-plan.md)).
It has no dependencies on any other capability, must run before the single
rate-limited monobank API call is made (FR-FAIL-01), and must be fully
testable offline (NFR-TEST-01's determinism goal starts here — same plan text
always yields the same entries and warnings). The grammar and validation
rules come from `docs/product-requirements.md` (FR-INPUT-*, FR-PARSE-*,
FR-AMOUNT-01, FR-MALFORMED-01, FR-DUP-01).

## Goals / Non-Goals

**Goals:**
- Turn plan file contents into an ordered, deduplicated list of valid
  `(name, amount)` entries plus a list of warnings (malformed lines,
  duplicate names) that reference the original line number.
- Treat a missing/unreadable plan path as a distinct fatal error, separate
  from per-line warnings.
- Be a pure, deterministic function of its input text (NFR-DET-01): no
  network, no clock, no global state.

**Non-Goals:**
- Deciding process exit codes (FR-EXIT-01) — that's `cli-orchestration`'s
  job; this capability only returns structured data/errors for a caller to
  interpret.
- Resolving names against monobank jars, currency filtering, or ambiguity
  detection — that's `jar-matching`.
- Rendering warnings to stderr or a table to stdout — that's
  `output-reporting`. This capability only produces warning *data*
  (line number + reason + offending name), not formatted text.

## Decisions

- **Package shape**: a single function, e.g.
  `ParsePlan(r io.Reader) (Plan, []Warning)` for the line-processing core,
  plus a thin `ParsePlanFile(path string) (Plan, []Warning, error)` wrapper
  that opens the file and turns "missing/unreadable" into the returned
  `error` (fatal, per FR-INPUT-01). Splitting these lets the core grammar be
  tested purely in-memory (table-driven tests over strings) without
  touching the filesystem.
- **Line-by-line scan, not a full grammar/parser generator**: the grammar is
  simple enough (`Name = amount`, one `#` comment rule) that a manual
  per-line scanner is clearer and has zero dependencies (TC-DEP-01 — stdlib
  only). Each line is processed independently; a malformed line never
  aborts the scan (FR-MALFORMED-01).
- **Comment stripping runs before `=`-splitting**: per FR-PARSE-02, `#` is a
  comment only when it's the first non-whitespace rune of the line or is
  preceded by whitespace; a `#` glued to non-space text is literal. This is
  implemented as a single left-to-right scan over runes tracking "was the
  previous rune whitespace or start-of-line," so names like `C#фонд` are
  preserved and trailing `# note` comments are stripped, in one pass before
  any other parsing.
- **Amount validation is strict and explicit**: use `strconv.Atoi` on the
  trimmed amount substring, then reject `<= 0`. Do not pre-strip `_`/`,`
  before calling `Atoi` — the PRD requires *rejecting* digit separators and
  decimals as malformed (FR-AMOUNT-01), so leaving them in place and letting
  `Atoi` fail (or explicitly checking for a `.`) is what makes them
  malformed rather than silently normalized.
- **Whitespace trimming is Unicode-aware**: use `strings.TrimSpace` (already
  Unicode-aware in the stdlib) for both name and amount, satisfying
  FR-INPUT-02 without extra dependencies.
- **Duplicate detection via a name→line-numbers map**: after the single-pass
  scan produces candidate valid entries, group by trimmed name (exact
  string, case preserved — FR-DUP-01 doesn't specify case-insensitive
  dedup, only exact repeats of the same plan line) and drop every entry
  whose name maps to more than one line, emitting one warning per duplicate
  name listing all offending line numbers. Case-insensitive *matching*
  against jar titles happens later in `jar-matching` (FR-RESOLVE-02); this
  capability's dedup is intentionally a simpler, literal check on the plan
  text itself.
- **Ordering preserved via a slice, not a map, for entries**: the map above
  is only used to detect duplicates; the returned `Plan` keeps entries in a
  slice in file order, satisfying the stable-order half of NFR-DET-01 for
  this capability's contribution to the pipeline.

## Risks / Trade-offs

- **[Risk]** Ambiguity in "amount must be a positive whole integer" for
  inputs like `+5000` or leading zeros (`007`). → **Mitigation**: treat
  anything `strconv.Atoi` doesn't parse as a plain base-10 non-negative
  literal as malformed; do not special-case `+`-prefixed or leading-zero
  forms beyond what `Atoi` naturally accepts, and cover both in the
  table-driven tests so behavior is explicit and locked down.
- **[Risk]** Byte order mark (BOM) or CRLF line endings in a user-authored
  `plan.txt` could break line splitting or leave a stray `\r` in the parsed
  name/amount. → **Mitigation**: split on `\n` and trim each line (which
  removes trailing `\r`) before any other processing; add a test fixture
  with CRLF line endings.
- **[Risk]** An empty plan file (0 valid entries, 0 warnings) is
  indistinguishable at this layer from "everything was malformed" unless
  the caller also inspects warnings. → **Mitigation**: this capability
  returns both the entry count and the warning list; `cli-orchestration`
  (FR-EXIT-01, exit code `2` for "unreadable or empty plan") is responsible
  for combining them into the right exit code — documented here so that
  boundary isn't lost.

## Open Questions

None outstanding for this capability; the grammar and validation rules are
fully specified in the PRD (FR-INPUT-*, FR-PARSE-*, FR-AMOUNT-01,
FR-MALFORMED-01, FR-DUP-01).
