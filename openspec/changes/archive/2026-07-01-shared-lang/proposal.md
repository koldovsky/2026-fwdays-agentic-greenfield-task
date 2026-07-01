## Why

`detectLang`, the `Lang` type, and the `UK_CHARS`/`CYRILLIC` regexes are copy-pasted
**verbatim** into three modules — `src/food/confirm.ts`, `src/metrics/confirm.ts`, and
`src/query/answer.ts`. Three homes for one fact is the canonical violation of
[backend-conventions](../../../.claude/skills/backend-conventions/SKILL.md) rule #12 (DRY),
surfaced by the `/run-backlog` step-7 duplication gate. It also directly serves invariant #6
(mirror the user's language in prose): every voice surface needs this detector, and the next
ones on the backlog (`clarify`, `food-photo`, `progress-photo`, `reviews`) would each write
copy #4-7 unless one shared home exists first. No US — tech debt paydown, done now to stop the
duplication from spreading.

## What Changes

- Add `src/util/lang.ts` exporting `detectLang(text: string): Lang` and `type Lang = 'uk' | 'ru' | 'en'`.
- Repoint `src/food/confirm.ts`, `src/metrics/confirm.ts`, `src/query/answer.ts` to import from
  `src/util/lang.ts`; delete the three local copies of the type, regexes, and function.
- Add `test/util/lang.test.ts` covering the detection table (uk via `іїєґ`, ru via `а-яё`,
  en default).
- **No behavior change.** The existing food/metrics/query suites stay green byte-for-byte.

## Capabilities

### New Capabilities
- `language-detection`: shared prose-language detector (`uk`/`ru`/`en`) used by every
  user-facing surface to mirror the user's language (invariant #6). Owns the detection rules
  that were previously embedded, un-specced, in three modules.

### Modified Capabilities
<!-- None. food-logging, body-metrics, nutrition-query keep identical observable behavior;
     this is an internal extraction, not a requirement change. -->

## Impact

- **Code:** new `src/util/lang.ts`; edits to three `confirm.ts`/`answer.ts` importers (delete
  local copies, add import); new `test/util/lang.test.ts`. Touches files from already-archived
  changes (food-text, metrics, query) — hence its own change, not folded into a feature.
- **Invariants:** #6 (language mirroring) — behavior preserved, now single-sourced. English-only
  DB fields/enums unaffected (this touches prose-language selection, not stored values).
- **Memory-cap / LLM-cost:** none — no new dependency, no runtime allocation change, no LLM call.
  Net effect is a small reduction in duplicated code shipped in the image.
- **Dependencies:** none added.
