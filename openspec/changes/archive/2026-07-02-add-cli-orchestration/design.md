## Context

All five prior capabilities are pure functions or narrow interfaces with
no knowledge of each other: `planparsing.ParsePlanFile(path) (Plan,
[]Warning, error)`, `monoclient.JarFetcher.FetchJars(ctx) ([]Jar,
error)`, `jarmatching.MatchJars(plan, jars) ([]Matched, []Warning)`,
`linkgen.GenerateLinks(matched) []Link`, and
`outputreport.WriteTable(w, links) error` /
`outputreport.WriteWarnings(w, links, parseWarnings, matchWarnings)
error`. `cli-orchestration` is the only capability that touches `argv`,
`os.Exit`, and the real `os.Stdout`/`os.Stderr` — everything upstream was
deliberately kept injectable/pure specifically so this last step could be
a thin, mechanical wiring layer with its own well-defined job: ordering,
error-message translation, and the exit code.

One implementation detail from `mono-client` matters here:
`httpJarFetcher.FetchJars` does **not** set its own timeout — its doc
comment says "ctx carries the caller's timeout, since the implementations
here do not set a client-level timeout of their own." NFR-NET-01 (bounded
~10s timeout) is only actually enforced if the caller supplies a
`context.WithTimeout`. That caller is `cli-orchestration`.

## Goals / Non-Goals

**Goals:**
- One thin `cmd/jarsplit` binary wiring all five capabilities in the
  order the PRD specifies: parse → fetch → match → link → report → exit.
- Enforce FR-FAIL-01's ordering guarantee in code, not just by
  convention: the fetch call is structurally unreachable until parsing
  has produced at least one valid entry.
- Translate `mono-client`'s four sentinel errors into four distinct,
  token-free stderr messages, with no retry loop anywhere in the call
  path.
- Implement the exact three-tier exit code contract from FR-EXIT-01 as a
  small, pure decision (given: matched count, warning counts) — easy to
  read and to get right.
- Keep `cli-orchestration` itself unit-testable without a live network
  call, consistent with every other capability's `NFR-TEST-01` posture,
  even though `cli-orchestration` isn't named in that requirement's
  capability list.

**Non-Goals:**
- No new CLI features beyond what the PRD specifies — no `--open`, no
  `-h/--help` flag, no subcommands (`BC-SCOPE-02`/Deviations already cut
  these from scope).
- No re-implementation or re-testing of any upstream capability's own
  behavior (matching rules, link format, table format) — this layer only
  tests wiring, ordering, and exit codes.
- No change to any of the five existing packages' public APIs.

## Decisions

**1. `run(args []string, stdout, stderr io.Writer, fetcher
monoclient.JarFetcher) int` is the whole orchestration, `main()` is one
line.**
`main()` is exactly `os.Exit(run(os.Args[1:], os.Stdout, os.Stderr,
monoclient.NewJarFetcher()))`. Injecting the `JarFetcher` (an interface
`mono-client` already exports) rather than calling
`monoclient.NewJarFetcher()` inside `run` is what makes this package
testable: tests can pass a fake `JarFetcher` returning a canned
`[]Jar` or one of the four sentinel errors, without a live network call
and without re-testing `mono-client`'s own HTTP-layer behavior (already
covered by its own test suite). One test still exercises the real
`monoclient.NewJarFetcher()` against a `MONO_CLIENT_INFO_FILE` fixture
for a genuine end-to-end wiring check.

**2. `run` and its helpers live in `package main` (`cmd/jarsplit`), not a
new `internal/` package.**
Alternative considered: `internal/orchestrator` with `cmd/jarsplit/main.go`
reduced to a two-line shim. Rejected — nothing else in the module would
ever import this logic (it's the terminal wiring step, not a reusable
building block), so splitting it out would be an abstraction with no
second caller. Go supports testing `package main` directly
(`cmd/jarsplit/run_test.go`), which is what every other capability's test
file already does for its own package.

**3. No CLI framework; plain `os.Args[1:]`.**
The tool takes exactly one required argument and zero flags
(`--open` and stdin were already dropped from scope). `cobra`/`urfave/cli`
would add a dependency (permitted by TC-DEP-01, but not required) for
functionality — subcommands, flag parsing, generated help — that this
tool doesn't use. `len(args) != 1` is the entire "argument parsing"
logic; a framework here is ceremony without payoff, and skipping it keeps
TC-DEP-01's stated minimal-supply-chain-surface intent.

**4. `context.WithTimeout(context.Background(), 10*time.Second)` wraps
the one `FetchJars` call.**
This is where NFR-NET-01 actually gets enforced, since `mono-client`
deliberately pushed timeout ownership to the caller (see Context). The
value matches the "~10 s" already specified in the requirement and
already exercised by `mono-client`'s own `ErrUnreachable`-on-timeout
test (which supplies its own short-lived context).

**5. Fatal-vs-full-output boundary: nothing is rendered until parsing
produced ≥1 entry *and* the fetch succeeded; everything is rendered once
both are true, even if zero jars end up matched.**
Concretely: bad args, an unreadable plan file, and any fetch failure
print exactly one fatal line and exit `2` — no call to
`outputreport.WriteTable`/`WriteWarnings` at all. An **empty plan**
(parses cleanly but yields zero valid entries) is treated slightly
differently: any parse-level warnings that explain *why* it's empty (e.g.
every line was malformed) are still rendered via
`outputreport.WriteWarnings` before the fatal exit — they're diagnostic,
not "guessed output," and FR-RESOLVE-03's "helps the user fix typos"
philosophy argues for surfacing them rather than swallowing them. Once
the fetch succeeds, though, "zero of N jars matched" is rendered through
the exact same `WriteTable`/`WriteWarnings` calls as any partial-match
run (1 of N, 2 of N, ...) — the only difference from a normal partial run
is which exit code the count maps to. Treating "0 of N" as a special
"stay silent" case would mean the one run where the user most needs to
see *every* warning (nothing was sent) prints the least information —
the opposite of `BC-SAFE-01`'s intent.

**6. Exit code is a pure function of three counts, checked in this
order:** `matchedCount == 0` → `2`; else `len(parseWarnings) +
len(matchWarnings) > 0` → `1`; else → `0`.
This directly encodes FR-EXIT-01: since `jar-matching` guarantees every
plan entry becomes exactly one `Matched` or one `Warning`, `matchedCount
== totalEntries` is equivalent to `len(matchWarnings) == 0`, so the
`else` branches correctly require *both* warning lists empty for exit
`0`. No separate "N of M" arithmetic is needed beyond the slice lengths
already in hand from `MatchJars`/`ParsePlanFile`.

**7. Fetch-error messages are a small `switch` on `errors.Is`, not a
pass-through of `err.Error()`.**
Four `errors.Is` checks against `monoclient.Err*` map to four fixed,
hand-written messages (missing token; invalid/expired token; rate
limited, with the ~60s retry hint FR-FAIL-02 asks for; unreachable). A
`default` case handles any other error defensively (not expected from
`monoclient.JarFetcher` today, but `run` takes the interface, not the
concrete type). Fixed messages, rather than `err.Error()`, give exact
control over wording independent of `mono-client`'s internal error-wrap
chain, while still relying on `mono-client`'s own guarantee (already
spec'd and tested there) that no error message ever contains the token.

## Risks / Trade-offs

- **Risk:** Treating "empty plan" and "zero matched" differently
  (Decision 5) is a nuanced rule that a future reader might "simplify"
  into always-silent or always-verbose. → **Mitigation:** the rationale
  (diagnostic value vs. guessed output) is written into this decision and
  into the spec's scenarios directly, and the behavior is pinned by
  tests for both branches.
- **Risk:** The fixed fetch-error messages (Decision 7) duplicate wording
  that could drift from `mono-client`'s own error taxonomy if it changes.
  → **Mitigation:** the `switch` matches on the exported sentinel values
  (`errors.Is`), not string content, so a wording change inside
  `mono-client` can't silently break this mapping — only an actual
  taxonomy change (new/removed sentinel) would, and that would already
  need a `mono-client` spec update of its own.
- **Trade-off:** No `--help`/usage text beyond a one-line "wrong number
  of arguments" message. Accepted — the brief's entire interface is `jarsplit
  plan.txt`; a fuller help system is speculative scope the PRD's
  Deviations section already argues against.

## Open Questions

None — every input this capability needs (`JarFetcher` interface,
sentinel errors, `Plan`/`Matched`/`Warning`/`Link` shapes,
`WriteTable`/`WriteWarnings` signatures) already exists and is stable
across the five shipped capabilities.
