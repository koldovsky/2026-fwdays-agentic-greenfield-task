## Why

`jarsplit` needs a way to turn a user-authored `plan.txt` into validated,
structured jar/amount entries before anything else in the pipeline (API calls,
matching, link generation) can run. Per
[docs/openspec-capability-plan.md](../../../docs/openspec-capability-plan.md),
`plan-parsing` has no dependencies on any other capability and is a pure
function over text, so it's the first capability to build — it can be
implemented and fully unit-tested offline, in parallel with `mono-client`.

## What Changes

- Add a plan-parsing package that reads a plan file path, splits it into
  lines, and produces validated `(name, amount, line number)` entries.
- Implement the `Name = amount` grammar: trim whitespace around name and
  amount; skip blank/whitespace-only lines silently; strip `#` comments
  (leading or inline-after-whitespace, but `#` adjacent to non-space text is
  literal and part of the name).
- Validate amounts as positive whole UAH integers; reject decimals, zero,
  negatives, and digit separators (`_`, `,`) as malformed.
- Detect structurally malformed lines (no `=`, empty name, invalid amount)
  and skip them with a warning that includes the line number, without
  blocking the rest of the file.
- Detect duplicate jar names across lines and skip every occurrence with a
  warning listing the offending line numbers — no amount is summed or kept.
- Treat a missing or unreadable plan file path as a fatal error.
- Preserve plan order in the output so downstream stages produce
  deterministic, stable results.

## Capabilities

### New Capabilities
- `plan-parsing`: parses and validates a `plan.txt` file into an ordered list
  of jar-name/amount entries, applying the comment/whitespace grammar,
  amount validation, and duplicate/malformed-line detection rules from the
  PRD. Downstream capabilities (`jar-matching`, `cli-orchestration`) consume
  its output but this change only covers parsing and validation in
  isolation.

### Modified Capabilities
(none — this is the first capability implemented; no existing specs yet.)

## Impact

- **New code**: a plan-parsing package (e.g. `internal/planparsing` or
  similar under the `md/agentic/monojar` module) with an exported parse
  function, its input/output types, and table-driven unit tests.
- **No API/network/CLI wiring yet** — this capability is pure and offline;
  it does not read `MONO_TOKEN`, call monobank, or expose a `jarsplit`
  binary. Those land in later capabilities (`mono-client`,
  `cli-orchestration`) per the phased plan.
- **Dependencies**: none. `TC-LANG-01` (Go 1.24.4) and `TC-DEP-01` (stdlib
  only) apply — no third-party parsing libraries.
