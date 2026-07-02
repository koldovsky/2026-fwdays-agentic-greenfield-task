## Why

`jar-matching` and `link-generation` already compute exactly what should
happen — matched `linkgen.Link`s and skip `jarmatching.Warning`s (plus
`planparsing.Warning`s for malformed/duplicate lines) — but nothing turns
that data into what the user actually sees. Without a rendering step the
pipeline knows the right answer but the user gets no stdout table, no
total, and no stderr warnings to catch a typo'd jar name before money
would go anywhere.

## What Changes

- Add a new `output-reporting` capability (`internal/outputreport`) that:
  - Renders the matched links as a stdout table (jar name, amount with
    `₴`, link) in plan order, followed by a `Разом` total line summing
    only the emitted links' amounts (FR-OUTPUT-01, FR-OUTPUT-02,
    FR-TOTAL-01).
  - Renders every skip — parse-level (`planparsing.Warning`: malformed,
    duplicate) and match-level (`jarmatching.Warning`: unknown, non-UAH,
    ambiguous) — as a stderr warning line (FR-WARN-01).
  - When at least one match-level warning exists, additionally prints a
    stderr reconciliation line with the planned total, the skipped total,
    and the skipped count (FR-TOTAL-02).
- Additive change to `internal/jarmatching`: `Warning` gains an `Amount
  int` field (populated from the plan entry's already-validated amount)
  so `output-reporting` can compute the skipped total without
  re-deriving it from the original plan. This does not change
  `jar-matching`'s matching behavior or its spec's requirements/scenarios
  — see `design.md` for why it's implementation-only.

## Capabilities

### New Capabilities
- `output-reporting`: renders the stdout table + total for emitted links,
  and the stderr warnings + skip-reconciliation total for everything that
  was skipped instead of matched.

### Modified Capabilities
(none — the `jarmatching.Warning.Amount` field is an additive
implementation detail carrying data that already exists in the package's
inputs; it changes no matching behavior and no requirement or scenario in
`jar-matching`'s spec.)

## Impact

- New package `internal/outputreport`, depending on `internal/linkgen`
  (for `Link`), `internal/jarmatching` (for `Warning`), and
  `internal/planparsing` (for `Warning`) purely for their exported types —
  no network or file I/O.
- Small additive change to `internal/jarmatching.Warning` (new `Amount`
  field, populated at the three existing warning call sites).
- No changes to `internal/planparsing`, `internal/linkgen`, or
  `internal/monoclient`.
- No `jarsplit` binary yet (still `cli-orchestration`, Phase 5) — this
  capability exposes a render function that Phase 5 will wire to
  `os.Stdout`/`os.Stderr` and the process exit code.
