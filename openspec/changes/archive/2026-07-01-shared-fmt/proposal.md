## Why

`const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1))` — the
trailing-`.0` trim used to render grams/units in prose — is copy-pasted **verbatim** into three
modules: `src/food/confirm.ts`, `src/metrics/confirm.ts`, and `src/query/answer.ts`. Three homes
for one fact is the same [backend-conventions](../../../.claude/skills/backend-conventions/SKILL.md)
rule #12 (DRY) violation as its just-archived sibling `shared-lang`, in the same three files,
surfaced by that change's `/run-backlog` step-7 duplication scan. Every voice surface that renders
a number needs this helper, and the next backlog items (`clarify`, `food-photo`, `progress-photo`,
`reviews`) would each write copy #4-7 unless one shared home exists first. No US — tech-debt
paydown, done now to stop the duplication from spreading.

## What Changes

- Add `src/util/num.ts` exporting `fmt(n: number): string` (integer → `String(n)`, else
  `n.toFixed(1)`).
- Repoint `src/food/confirm.ts`, `src/metrics/confirm.ts`, `src/query/answer.ts` to import from
  `src/util/num.ts`; delete the three local copies of the function.
- Add `test/util/num.test.ts` covering the formatting table (integer → no decimal, fractional →
  one decimal, negatives, `.0`-valued floats).
- **No behavior change.** The existing food/metrics/query suites stay green byte-for-byte.

## Capabilities

### New Capabilities
- `number-formatting`: shared numeric-prose formatter (`fmt`) used by every user-facing surface to
  render grams/units without a trailing `.0`. Owns the formatting rule that was previously embedded,
  un-specced, in three modules.

### Modified Capabilities
<!-- None. food-logging, body-metrics, nutrition-query keep identical observable behavior;
     this is an internal extraction, not a requirement change. -->

## Impact

- **Code:** new `src/util/num.ts`; edits to three `confirm.ts`/`answer.ts` importers (delete local
  copy, add import); new `test/util/num.test.ts`. Touches files from already-archived changes
  (food-text, metrics, query) — hence its own change, not folded into a feature. Sits next to the
  `src/util/lang.ts` established by `shared-lang`.
- **Invariants:** #2 (numbers rendered in code, never by the model) — behavior preserved, now
  single-sourced. English-only DB fields/enums unaffected (this touches prose rendering, not stored
  values).
- **Memory-cap / LLM-cost:** none — no new dependency, no runtime allocation change, no LLM call.
  Net effect is a small reduction in duplicated code shipped in the image.
- **Dependencies:** none added.
