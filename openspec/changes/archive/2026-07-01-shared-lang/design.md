## Context

Three modules — `src/food/confirm.ts`, `src/metrics/confirm.ts`, `src/query/answer.ts` — each
declare an identical `type Lang = 'uk' | 'ru' | 'en'`, the regexes `UK_CHARS = /[іїєґ]/i` and
`CYRILLIC = /[а-яё]/i`, and the same `detectLang` function (UK check first, then Cyrillic, else
`en`). This is one fact with three homes — DRY rule #12 — and the backlog's voice surfaces
(`clarify`, `food-photo`, `progress-photo`, `reviews`) would add copies #4-7. `src/util/` does
not exist yet.

## Goals / Non-Goals

**Goals:**
- One home for language detection: `src/util/lang.ts`, imported by all three current sites.
- Zero behavior change; existing food/metrics/query suites stay green untouched.
- Direct unit coverage of the detection table in `test/util/lang.test.ts`.

**Non-Goals:**
- No new detection rules, languages, or heuristics (e.g. no mixed-language scoring).
- No refactor of the surrounding confirm/answer logic beyond removing the copied lines.
- No change to stored DB fields/enums (English-only), per invariant #6.

## Decisions

- **Home = `src/util/lang.ts` (cross-cutting util), not an owning domain module.** Language
  detection is used by food, metrics, and query alike — no single domain owns it. This matches
  backend-conventions rule #12's "shared `src/util/…` if cross-cutting" and establishes the
  `src/util/` tree the code-structure plan (requirements §4) anticipates.
- **Export surface = `detectLang` + `Lang` only.** The regexes stay module-private
  implementation detail; no consumer references them directly today, so they are not exported.
- **Verbatim move.** Copy the canonical implementation exactly (UK_CHARS before CYRILLIC), then
  delete the three local copies and add `import { detectLang, type Lang } from '../util/lang'`.
  Relative import depth is one level up from each `src/<area>/` file.

## Risks / Trade-offs

- **Risk: a copy silently diverged.** Mitigation — the three copies were confirmed identical by
  grep before extraction; the new unit test pins the table, and the untouched food/metrics/query
  suites are the regression guard.
- **Trade-off: `Lang` is imported as a type across module boundaries.** Acceptable — it is a
  string-literal union with no runtime footprint (`import type`), so no memory/cost impact.
- **No LLM, no new dependency, no memory-cap impact** — this is a pure code move.
