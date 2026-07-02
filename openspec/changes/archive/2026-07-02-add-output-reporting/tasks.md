## 1. `jarmatching.Warning` amendment (additive, no behavior change)

- [x] 1.1 Add `Amount int` to `jarmatching.Warning` in `internal/jarmatching/jarmatching.go`
- [x] 1.2 Populate `Amount: entry.Amount` at all three existing warning construction sites in `MatchJars` (unknown, non-UAH, ambiguous)
- [x] 1.3 Add/extend a `jarmatching` test asserting `Warning.Amount` equals the originating entry's amount for each of the three warning kinds
- [x] 1.4 Run `go test ./internal/jarmatching/...` and confirm all existing tests still pass unmodified (the field is additive and no existing test compares `Warning` via `reflect.DeepEqual`)

## 2. Package scaffolding

- [x] 2.1 Create `internal/outputreport` under the `md/agentic/monojar` module
- [x] 2.2 Add package doc comment describing its role: rendering only, no I/O beyond the given `io.Writer`s

## 3. Stdout table rendering (FR-OUTPUT-01, FR-OUTPUT-02, FR-TOTAL-01)

- [x] 3.1 Implement `WriteTable(w io.Writer, links []linkgen.Link) error` using `text/tabwriter`
- [x] 3.2 Render one row per link, in input order: name, amount formatted as `"%d ₴"`, URL
- [x] 3.3 Render a final `Разом` row summing all link amounts (as a 3-cell row so its columns align with the jar rows), even when `links` is empty (`0 ₴`)
- [x] 3.4 Flush the tabwriter and propagate any write/flush error

## 4. Stderr warnings and skip reconciliation (FR-WARN-01, FR-TOTAL-02)

- [x] 4.1 Implement `WriteWarnings(w io.Writer, links []linkgen.Link, parseWarnings []planparsing.Warning, matchWarnings []jarmatching.Warning) error`
- [x] 4.2 Implement `formatWarning` for a `planparsing.Warning`: `warning: line(s) <Lines>: [<Name>: ]<Reason>`, using `line` (singular) for one line number and `lines` (plural, comma-joined) for more than one, omitting the `<Name>:` segment when `Name == ""`
- [x] 4.3 Implement `formatWarning` for a `jarmatching.Warning`: `warning: <Name>: <Reason>`
- [x] 4.4 Render all `parseWarnings` (in given order), then all `matchWarnings` (in given order) — parse-level before match-level, per group order preserved
- [x] 4.5 When `len(matchWarnings) > 0`, render one reconciliation line with: planned total = `sum(links.Amount) + sum(matchWarnings.Amount)`, skipped total = `sum(matchWarnings.Amount)`, skipped count = `len(matchWarnings)` — all amounts formatted with `₴`
- [x] 4.6 When `len(matchWarnings) == 0`, render no reconciliation line, regardless of `parseWarnings`
- [x] 4.7 Propagate any write error

## 5. Tests

- [x] 5.1 Table-driven tests for `WriteTable`: multiple links, zero links, amount formatting, `Разом` total value and alignment
- [x] 5.2 Table-driven tests for `WriteWarnings` covering each warning kind: malformed (missing `=`, empty name, invalid amount), duplicate (multi-line), unknown, non-UAH, ambiguous
- [x] 5.3 Test that parse-level warnings are rendered before match-level warnings and that within each group, input order is preserved
- [x] 5.4 Test the reconciliation line's three values (planned/skipped totals, skipped count) against a mixed scenario (some matched, some match-skipped, one parse-level warning) and confirm parse-level warnings never affect either total
- [x] 5.5 Test that no reconciliation line is rendered when `matchWarnings` is empty, even with non-empty `parseWarnings`
- [x] 5.6 Test that no warning text ever appears in `WriteTable`'s output and no table/link text ever appears in `WriteWarnings`' output
- [x] 5.7 Golden test: fixed links + warnings input rendered twice, assert byte-identical stdout and stderr output (NFR-DET-01)
