## Context

Three modules — `src/food/confirm.ts`, `src/metrics/confirm.ts`, `src/query/answer.ts` — each
declare an identical `const fmt = (n: number): string => (Number.isInteger(n) ? String(n) :
n.toFixed(1))` (trim a trailing `.0` so whole grams/units read cleanly). This is one fact with
three homes — DRY rule #12 — and the backlog's voice surfaces (`clarify`, `food-photo`,
`progress-photo`, `reviews`) would add copies #4-7. `src/util/` already exists (its sibling
`src/util/lang.ts` landed in `shared-lang`), so this change adds `num.ts` alongside it.

## Goals / Non-Goals

**Goals:**
- One home for numeric-prose formatting: `src/util/num.ts`, imported by all three current sites.
- Zero behavior change; existing food/metrics/query suites stay green untouched.
- Direct unit coverage of the formatting table in `test/util/num.test.ts`.

**Non-Goals:**
- No new formatting options (no locale separators, no configurable precision, no rounding-mode
  changes) — verbatim move of the existing one-decimal rule.
- No refactor of the surrounding confirm/answer logic beyond removing the copied line.
- No change to stored DB fields/enums (English-only), unaffected by prose rendering.

## Decisions

- **Home = `src/util/num.ts` (cross-cutting util), not an owning domain module.** Number formatting
  is used by food, metrics, and query alike — no single domain owns it. This matches
  backend-conventions rule #12's "shared `src/util/…` if cross-cutting" and sits beside the
  `src/util/lang.ts` sibling from `shared-lang`.
- **Export surface = `fmt` only.** Single named export; no default export (repo convention).
- **Verbatim move.** Copy the canonical implementation exactly (`Number.isInteger(n) ? String(n) :
  n.toFixed(1)`), then delete the three local copies and add `import { fmt } from '../util/num.js'`.
  Relative import depth is one level up from each `src/<area>/` file (mirrors the `lang.js` import
  already in these files).
- **Keep the doc-comment at the call site, not on the export.** The three files carry a short
  `/** Trim a trailing .0 … */` line; a single canonical form lives on the export in `num.ts`, and
  the per-file comments are removed with the copies.

## Risks / Trade-offs

- **Risk: a copy silently diverged.** Mitigation — the three copies were confirmed identical by
  grep before extraction; the new unit test pins the table, and the untouched food/metrics/query
  suites are the regression guard.
- **Trade-off: kcal is always a whole Int, so `fmt` is a no-op there.** Acceptable and unchanged —
  the helper already handled that (integer branch); no behavior shift.
- **No LLM, no new dependency, no memory-cap impact** — this is a pure code move.
