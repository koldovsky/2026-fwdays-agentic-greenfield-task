## 1. Parser implementation

- [x] 1.1 In `internal/planparsing/planparsing.go`, replace `strings.Cut(line, "=")` with a split on the first `-`, taking the left segment as the amount and the remainder as the jar name (invert the current name/amount ordering).
- [x] 1.2 Strip all internal whitespace from the amount segment before `strconv.Atoi`, keeping the `> 0` guard, so `12 000` parses as `12000` while `1_000`/`1,000`/`100.50`/`0`/`-5` stay malformed.
- [x] 1.3 Change the missing-separator warning reason from `missing '=' separator` to `missing '-' separator`; validate amount first, then name-empty.
- [x] 1.4 Update the package/`Entry` doc comments to reflect the `<amount> - <jar name>` field order.
- [x] 1.5 In `internal/outputreport/outputreport.go`, reword the comment that references the `=` separator to `-`.

## 2. Tests

- [x] 2.1 Update `internal/planparsing/planparsing_test.go` grammar/amount/malformed/duplicate/order/CRLF/file cases to the new grammar; add an `12 000`→12000 valid case and a name-with-hyphen (`5000 - новий-рік`) case; assert `missing '-' separator`.
- [x] 2.2 Update `cmd/jarsplit/run_test.go` `writeTempFile` fixtures and the `missing '='` assertions to the new grammar/message.
- [x] 2.3 Update `internal/outputreport/outputreport_test.go` `missing '=' separator` cases to `missing '-' separator`.
- [x] 2.4 Run `go test ./...` and confirm the full suite passes.

## 3. Docs and samples

- [x] 3.1 Update `docs/product-requirements.md`: FR-INPUT-02 (grammar/separator), FR-PARSE-02 (examples), FR-AMOUNT-01 (allow internal spaces), FR-MALFORMED-01 (no `-`).
- [x] 3.2 Update the plan example in `docs/product-brief.md` to the new grammar.
- [x] 3.3 Rewrite `sample-input.txt` to a clean new-format example (drop old `Name = amount` lines).
- [x] 3.4 Update `docs/current-state.md` with what changed and an ISO-8601 timestamp.

## 4. Verify and archive

- [x] 4.1 Run the binary end-to-end offline (via the `MONO_CLIENT_INFO_FILE` fixture) against `sample-input.txt`: confirm `12 000 - donates`→12000, a hyphen-name match, an old `=` line skipped with `missing '-' separator` on the right line, `Разом` sums emitted links, and exit codes follow FR-EXIT-01.
- [ ] 4.2 Run `openspec validate change-plan-syntax`, then archive the change to sync live specs.
