## Why

The plan-file line grammar `Name = amount` puts the jar name first and separates
with `=`. The user wants the amount first, separated by `-` (`<amount> - <jar name>`),
which reads more naturally for a monthly-budget list and matches how they already
write their plan (`sample-input.txt`). Their real input also writes large amounts
with a thousands space (`12 000`), which the current grammar rejects as malformed.

## What Changes

- **BREAKING**: The plan line grammar changes from `Name = amount` to
  `<amount> - <jar name>`. Old `Name = amount` lines are no longer valid and are
  skipped with a `missing '-' separator` warning.
- The separator becomes `-`. Lines split on the **first** `-`: the left segment is
  the amount, the remainder is the jar name — so jar names may contain `-`
  (e.g. `новий-рік`).
- The amount field now tolerates **internal whitespace as a thousands separator**
  (`12 000` → `12000`): all internal whitespace is stripped before parsing. `_`,
  `,`, decimals, zero, and negatives remain malformed.
- The malformed-line warning text changes from `missing '=' separator` to
  `missing '-' separator`.
- **Unchanged**: comment (`#`) handling, blank/whitespace-only line skipping,
  duplicate-name handling, deterministic plan order, positive-whole-UAH validation,
  and every downstream stage (matching, link generation, output rendering).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `plan-parsing`: the plan line grammar (`FR-INPUT-02`), comment-handling examples
  (`FR-PARSE-02`), amount validation to allow internal spaces (`FR-AMOUNT-01`), and
  malformed-line detection (`FR-MALFORMED-01`) all change to the new `-` grammar.
- `output-reporting`: the malformed-line warning it renders changes from
  `missing '=' separator` to `missing '-' separator`.

## Impact

- **Code**: `internal/planparsing/planparsing.go` (split logic + amount whitespace
  stripping + warning text); a comment in `internal/outputreport/outputreport.go`.
- **Tests**: `internal/planparsing/planparsing_test.go`, `cmd/jarsplit/run_test.go`,
  `internal/outputreport/outputreport_test.go` (grammar fixtures + warning-text
  assertions).
- **Docs**: `docs/product-requirements.md` (FR rows), `docs/product-brief.md`
  (example), `sample-input.txt` (canonical example), `docs/current-state.md`.
- **No new dependencies.** Data structures (`Entry`/`Warning`/`Plan`) and the output
  URL format (`?a=`) are unaffected.
