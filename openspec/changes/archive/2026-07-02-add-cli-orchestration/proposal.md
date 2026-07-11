## Why

Five capabilities are shipped — `plan-parsing`, `mono-client`,
`jar-matching`, `link-generation`, `output-reporting` — but they are five
separate Go packages with no binary wiring them together. There is still
no `jarsplit` command a user can actually run. This is the last
capability: it turns `argv` into the full pipeline (parse → fetch →
match → link → report) and owns the one piece of behavior no other
capability can own — the process exit code that scripts and the user
rely on to know whether every jar was sent, some were skipped, or
nothing happened at all.

## What Changes

- Add a new `cli-orchestration` capability producing the `jarsplit`
  binary (`cmd/jarsplit`) that:
  - Accepts exactly one positional argument, the plan file path; any
    other argument count is a fatal usage error (supports FR-INPUT-01's
    "explicit file-path argument, stdin not supported" contract at the
    entry point).
  - Parses the plan and validates it **before** making any network call;
    an empty plan (zero valid entries) is a fatal error, and no
    stdout/stderr pipeline output is produced for any pre-fetch fatal
    condition (FR-FAIL-01).
  - Fetches jars exactly once per run via `mono-client`'s `JarFetcher`,
    translating each of its four fatal sentinel errors (missing token,
    401, 429, unreachable) into one distinct stderr message, with no
    automatic retry (FR-API-01, FR-FAIL-02's message-rendering half —
    `mono-client` already owns the error taxonomy itself).
  - Wires the fetched jars and parsed plan through `jar-matching` →
    `link-generation` → `output-reporting` to render the stdout table and
    stderr warnings.
  - Computes the three-tier exit code: `0` (everything matched, no
    warnings), `1` (≥1 link emitted, some jars skipped), `2` (fatal:
    nothing resolvable — bad args, unreadable/empty plan, any fetch
    failure, or zero of N jars matched) (FR-EXIT-01).
- No new third-party dependency: a single positional argument needs no
  CLI framework, so this stays stdlib-only (`os.Args`), keeping
  TC-DEP-01's minimal-supply-chain-surface intent even though a CLI
  library is permitted.

## Capabilities

### New Capabilities
- `cli-orchestration`: wires `argv` through the five existing
  capabilities and owns the parse-before-fetch ordering, fatal-error
  message rendering, and the three-tier exit code contract.

### Modified Capabilities
(none — every existing capability is consumed as-is via its already
exported types/interfaces: `planparsing.ParsePlanFile`,
`monoclient.JarFetcher`, `jarmatching.MatchJars`,
`linkgen.GenerateLinks`, `outputreport.WriteTable`/`WriteWarnings`.)

## Impact

- New `cmd/jarsplit` package (the module's only `main` package),
  depending on all five existing `internal/*` packages.
- `go build ./cmd/jarsplit` (or `go install`) now produces the
  `jarsplit` binary the brief and PRD describe end to end
  (TC-MODULE-01).
- No changes to any existing package — this is purely additive wiring.
- Closes Phase 5, the last phase in
  [openspec-capability-plan.md](../../../docs/openspec-capability-plan.md);
  after this, `jarsplit` is feature-complete against
  `docs/product-requirements.md` modulo the still-open **V-1** manual
  gate on `FR-LINK-01` (confirm a real `?a=N` link prefills `N ₴`).
