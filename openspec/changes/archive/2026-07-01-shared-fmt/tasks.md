## 1. Extract the shared module

- [x] 1.1 Create `src/util/num.ts` exporting `fmt(n: number): string` — `Number.isInteger(n) ?
  String(n) : n.toFixed(1)`, verbatim from the current copies. Explicit return type + a one-line
  doc-comment (trim a trailing `.0`) per backend-conventions.

## 2. Repoint the three importers

- [x] 2.1 `src/food/confirm.ts`: delete the local `fmt` const + its doc-comment; add
  `import { fmt } from '../util/num.js';` (keep existing call sites).
- [x] 2.2 `src/metrics/confirm.ts`: same deletion + import.
- [x] 2.3 `src/query/answer.ts`: same deletion + import.
- [x] 2.4 Grep `src/` for any remaining `const fmt` / `toFixed(1)` formatter definition — confirm
  `src/util/num.ts` is the only home (zero duplicates). Unrelated `Number.isInteger` uses
  (validation in `bot.ts`/`questions.ts`) are not this helper and stay.

## 3. Verify no behavior change

- [x] 3.1 Add `test/util/num.test.ts` covering the formatting table: integer → no decimal,
  fractional → one decimal (rounding, e.g. `89.25`→`"89.3"`), whole-valued float (`90.0`→`"90"`),
  negatives.
- [x] 3.2 Run `npm test` — new num suite green AND the existing food/metrics/query suites pass
  unchanged (regression guard for invariant #2, no behavior change).
- [x] 3.3 Run `npm run lint`, `npm run format:check`, `npm run typecheck` — all green.

## 4. Review

- [x] 4.1 Hand the diff to a SEPARATE reviewer subagent (the `review` skill: Standards + Spec
  axes) before commit. Maker ≠ checker; no self-approval. Resolve every finding.
