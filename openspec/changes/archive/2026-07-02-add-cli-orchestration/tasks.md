## 1. Package scaffolding

- [x] 1.1 Create `cmd/jarsplit` under the `md/agentic/monojar` module
- [x] 1.2 Add `main.go` with `func main()` calling `os.Exit(run(os.Args[1:], os.Stdout, os.Stderr, monoclient.NewJarFetcher()))`

## 2. Argument validation and plan parsing (FR-INPUT-01 wiring, FR-FAIL-01)

- [x] 2.1 Implement `run(args []string, stdout, stderr io.Writer, fetcher monoclient.JarFetcher) int` in `cmd/jarsplit/run.go`
- [x] 2.2 Validate `len(args) == 1`; on mismatch, print a usage message to `stderr` and return `2` without touching the filesystem or network
- [x] 2.3 Call `planparsing.ParsePlanFile(args[0])`; on a non-nil error, print a fatal message to `stderr` and return `2` without a fetch call
- [x] 2.4 When `len(plan.Entries) == 0`, call `outputreport.WriteWarnings(stderr, nil, parseWarnings, nil)`, print a distinct "empty plan" fatal message, and return `2` without a fetch call

## 3. Jar fetch (FR-API-01, NFR-NET-01, FR-FAIL-02 message rendering)

- [x] 3.1 Wrap the fetch call in `context.WithTimeout(context.Background(), 10*time.Second)`
- [x] 3.2 Call `fetcher.FetchJars(ctx)` exactly once
- [x] 3.3 Implement `describeFetchError(err error) string` mapping `monoclient.ErrMissingToken` / `ErrInvalidToken` / `ErrRateLimited` / `ErrUnreachable` (via `errors.Is`) to four distinct fixed messages, the rate-limited one advising a retry in ~60 seconds, plus a defensive `default` case
- [x] 3.4 On a non-nil fetch error, print `describeFetchError(err)` to `stderr` and return `2`

## 4. Match, link, and report wiring

- [x] 4.1 Call `jarmatching.MatchJars(plan, jars)` to get `matched` and `matchWarnings`
- [x] 4.2 Call `linkgen.GenerateLinks(matched)` to get `links`
- [x] 4.3 Call `outputreport.WriteTable(stdout, links)`; on a non-nil error, print a fatal message to `stderr` and return `2`
- [x] 4.4 Call `outputreport.WriteWarnings(stderr, links, parseWarnings, matchWarnings)`; on a non-nil error, print a fatal message to `stderr` and return `2`

## 5. Exit code decision (FR-EXIT-01)

- [x] 5.1 Implement the exit-code decision: `len(matched) == 0` → `2`; else `len(parseWarnings) + len(matchWarnings) > 0` → `1`; else `0`
- [x] 5.2 Wire this decision as `run`'s final return value after the table/warnings are written

## 6. Tests

- [x] 6.1 Add a fake `monoclient.JarFetcher` test helper (canned `[]Jar` or canned error) in `cmd/jarsplit`
- [x] 6.2 Test: zero args and >1 args each print a usage message and return `2` with no stdout output
- [x] 6.3 Test: unreadable plan path prints a fatal message, returns `2`, and the fake fetcher is never called
- [x] 6.4 Test: a plan with zero valid entries (e.g. all lines malformed) prints its parse warnings, a fatal message, returns `2`, and the fake fetcher is never called
- [x] 6.5 Table-driven test over the four fake-fetcher error conditions: each returns `2` with its own distinct `stderr` message, including the ~60s retry hint for rate-limited, and no message contains a fake token value
- [x] 6.6 Test: all plan entries match cleanly → exit `0`, stdout table has one row per entry plus a correct `Разом` total, `stderr` is empty
- [x] 6.7 Test: a mixed plan (some matched, some unknown/ambiguous/non-UAH, and one malformed line) → exit `1`, stdout has only the matched rows, `stderr` has every warning plus the reconciliation line
- [x] 6.8 Test: fetch succeeds but zero plan entries match any jar → exit `2`, stdout still shows the empty table (`Разом 0 ₴`), `stderr` shows every match warning
- [x] 6.9 Test: the fake fetcher is invoked exactly once across a run with multiple plan entries
- [x] 6.10 One end-to-end test using the real `monoclient.NewJarFetcher()` with `MONO_CLIENT_INFO_FILE` pointed at a temp fixture file and a temp plan file, asserting the full stdout/stderr/exit-code triple for a mixed scenario

## 7. Verification

- [x] 7.1 Run `go build ./...`, `go vet ./...`, `go test ./...`, and `gofmt -l .` across the whole module
- [x] 7.2 Run `go build -o jarsplit ./cmd/jarsplit` and confirm the binary is named `jarsplit` (TC-MODULE-01)
- [x] 7.3 Manually run the built binary against a small real plan file with `MONO_CLIENT_INFO_FILE` set to a fixture, confirming the printed table/total/warnings match expectations end to end
