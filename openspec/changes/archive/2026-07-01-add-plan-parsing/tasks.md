## 1. Package scaffolding

- [x] 1.1 Create the plan-parsing package under the `md/agentic/monojar` module (e.g. `internal/planparsing`)
- [x] 1.2 Define `Entry{Name string, Amount int, Line int}` and `Warning{Line int, Reason string, ...}` types, and a `Plan{Entries []Entry}` result type

## 2. Core line-scanning grammar

- [x] 2.1 Implement `ParsePlan(r io.Reader) (Plan, []Warning)`: split input into lines, track line numbers
- [x] 2.2 Implement comment stripping (leading `#`, inline `#` preceded by whitespace, literal `#` adjacent to non-space text) before further parsing
- [x] 2.3 Skip blank/whitespace-only lines silently (no entry, no warning)
- [x] 2.4 Split remaining lines on `=`, trim name and amount with `strings.TrimSpace`

## 3. Amount validation

- [x] 3.1 Parse the trimmed amount with `strconv.Atoi`; reject non-integer forms (decimals, digit separators `_`/`,`) as malformed
- [x] 3.2 Reject zero and negative amounts as malformed
- [x] 3.3 Add table-driven tests for valid amounts and each malformed-amount case (zero, negative, decimal, `_`/`,` separators)

## 4. Malformed-line and duplicate handling

- [x] 4.1 Treat lines with no `=` or an empty name as malformed; skip and emit a `Warning` with the line number
- [x] 4.2 Verify a malformed line never halts processing of subsequent valid lines
- [x] 4.3 After the scan, group valid entries by exact trimmed name; drop every entry whose name appears on more than one line and emit one `Warning` per duplicate name listing all offending line numbers
- [x] 4.4 Preserve original file order in the final `Plan.Entries` slice

## 5. File-level reading and fatal errors

- [x] 5.1 Implement `ParsePlanFile(path string) (Plan, []Warning, error)` that opens the file and delegates to `ParsePlan`
- [x] 5.2 Return a distinct fatal `error` (not a `Warning`) when the path is missing or unreadable, without partial results

## 6. Tests

- [x] 6.1 Table-driven tests for the grammar: name/amount trimming, blank-line skipping, leading/inline/literal `#` comment handling
- [x] 6.2 Table-driven tests for duplicate detection (two and three occurrences, warning includes all line numbers)
- [x] 6.3 Fixture test for CRLF line endings
- [x] 6.4 Tests for `ParsePlanFile`: missing path and unreadable path both return a fatal error; valid path returns entries matching `ParsePlan` on the same content
- [x] 6.5 Test that entry order in `Plan.Entries` matches file order across a plan mixing valid, malformed, and duplicate lines
