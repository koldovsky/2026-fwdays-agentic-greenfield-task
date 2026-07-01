## 1. Extract the shared module

- [x] 1.1 Create `src/util/lang.ts` exporting `type Lang = 'uk' | 'ru' | 'en'` and
  `detectLang(text: string): Lang` (UK_CHARS `/[іїєґ]/i` checked before CYRILLIC `/[а-яё]/i`,
  else `en`); regexes stay module-private. Explicit return type per backend-conventions.

## 2. Repoint the three importers

- [x] 2.1 `src/food/confirm.ts`: delete local `Lang`, `UK_CHARS`, `CYRILLIC`, `detectLang`;
  add `import { detectLang, type Lang } from '../util/lang.js';` (keep existing call sites).
- [x] 2.2 `src/metrics/confirm.ts`: same deletion + import.
- [x] 2.3 `src/query/answer.ts`: same deletion + import.
- [x] 2.4 Grep `src/` for any remaining `detectLang`/`type Lang`/`UK_CHARS`/`CYRILLIC`/`іїєґ`/`а-яё`
  definition — confirm `src/util/lang.ts` is the only home (zero duplicates).

## 3. Verify no behavior change

- [x] 3.1 Add `test/util/lang.test.ts` covering the detection table: uk via `іїєґ` (incl. mixed
  like `їжа`), ru via `а-яё`, en default (Latin / digits / empty).
- [x] 3.2 Run `npm test` — new lang suite green AND the existing food/metrics/query suites pass
  unchanged (regression guard for invariant #6, no behavior change).
- [x] 3.3 Run `npm run lint`, `npm run format:check`, `npm run typecheck` — all green.

## 4. Review

- [x] 4.1 Hand the diff to a SEPARATE reviewer subagent (the `review` skill: Standards + Spec
  axes) before commit. Maker ≠ checker; no self-approval. Resolve every finding.
