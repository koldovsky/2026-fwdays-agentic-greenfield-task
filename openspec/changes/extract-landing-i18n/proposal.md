# Extract landing copy into shared/lib/i18n

## Why

Every landing string (~130) is hardcoded English: in `views/landing/lib/content.ts`
and directly inside the section components (section heads, "Your CV" / "Tailored
for this job" labels, the final-CTA panel, the footer credit). The i18n
`Dictionary` has no `landing` block, so the landing is the last EN-only surface
and the largest blocker to the Ukrainian-first app (NFR-I18N-01, BC-BRAND-01).
Task 10 (whole-app UA/EN toggle) cannot land while the landing bypasses i18n.

This change moves all landing copy into `shared/lib/i18n` (ua + en), routes the
components through `t(locale)`, and keeps the page rendering English for now
(font-safety, below), clearing the debt without changing what a visitor sees.

## What Changes

- **Contract.** Add a `landing` block to `i18n/types.ts` `Dictionary`. Text only;
  translatable collections (pillars, steps, plans, faq, checklist rows,
  before/after, demo) are keyed by stable ids, NOT index-zipped arrays.
- **Copy.** Author the full `landing` section in `en.ts` (current copy verbatim)
  and `ua.ts` (Ukrainian). The existing i18n parity + no-emoji/exclamation tests
  extend to the new keys automatically.
- **Assemblers.** `content.ts` becomes `(locale)` functions that merge the i18n
  text with the structural constants that stay local (accent, checklist status,
  grounding, price, `featured`, numbers, hrefs). Section components take a
  `locale` prop (default `"en"`) and read copy through these.
- **Font-safety (critical).** `t()` defaults to `ua`; the display fonts are
  latin-only until task 10 wires a Cyrillic subset. So every landing call site
  passes an EXPLICIT `"en"` for now. The landing keeps rendering English; task 10
  flips the locale and wires the fonts.
- **Not in scope:** the Cyrillic fonts, the locale cookie/toggle, and dynamic
  `<html lang>` (all task 10); no copy changes, no layout/section changes.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `marketing-landing`: landing copy resolves through `shared/lib/i18n` (ua + en);
  no landing UI string is hardcoded in a component. Rendered locale is pinned to
  English until the Cyrillic fonts land (task 10).

## Impact

- `src/shared/lib/i18n/{types,en,ua}.ts` (new `landing` block, ~130 strings ×2).
- `src/views/landing/lib/content.ts` (const exports → `(locale)` assemblers).
- `src/views/landing/ui/*` (thread `locale`, read copy via i18n): Landing, Hero,
  Pillars, BeforeAfter, ChecklistPreview, HowItWorks, Pricing, Faq, FinalCta,
  Footer, StructuredData.
- Tests: update `Faq.test.tsx` (source questions from the assembler); i18n parity
  test already covers key parity. No new deps, no new hues, no perf-relevant
  change (server-rendered strings only); re-run `perf-audit` when Chrome is available.

## Open question (flagged for the team)

The Ukrainian copy is authored faithfully but SHOULD get a native marketing-voice
review before task 10 makes it visible. It is not on-screen yet (EN is pinned), so
this is safe to refine later.
