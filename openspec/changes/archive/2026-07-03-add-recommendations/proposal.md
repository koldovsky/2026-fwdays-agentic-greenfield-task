## Why

Recommendations are the product's primary output — the moment the applicant sees
"where can I realistically get in" (US-1, US-3). The scoring engine produces a chance,
band, and category per program, but those numbers are useless until they are rendered
honestly: grouped and sorted, each with its uncertainty band and a traffic-light risk
signal that never relies on color alone, with a persistent disclaimer and data-freshness
context so no one mistakes an estimate for a guarantee. This change backfills the spec
for the already-implemented `recommendations` capability
(`app/components/planner/{Recommendations,ProgramCard,ChanceRing,CategoryPill,CategoryTabs}.tsx`
and the selectors in `app/lib/recommend.ts`), including the helpful empty state that
keeps the screen from ever going blank (`FR-UX-01`).

## What Changes

- Render a **sorted list of recommendation cards**, one per program, highest-chance
  fitting programs first; programs that do not accept the chosen elective **sink to the
  bottom** with a neutral "Інший предмет НМТ" marker instead of a fake risk color
  (renders `FR-SCORE-03`).
- Each card SHALL show the **chance %** and its **uncertainty band** (lo–hi %) via a
  `.pk-ring` chance ring plus a band label, and the **risk category** via a `.pk-pill`
  category pill (renders `FR-SCORE-02`).
- Signal risk with the **green/amber/red traffic-light code but never color-only**: the
  category pill carries a dot **and** a word, the ring exposes an `aria-label` stating
  the chance and category, and a screen-reader-only summary repeats the chance + band in
  text (`NFR-A11Y-01`, `BC-HONESTY-01`).
- Show a **helpful empty state** with a hint (relax filters / change scores) whenever the
  visible set is empty, never a blank screen (`FR-UX-01`).
- Keep the **honesty framing always present**: the persistent disclaimer (inherited from
  `app-shell`) and the data-freshness label (`DATA_AS_OF`) are shown, and non-fitting
  programs never display an invented chance (`BC-HONESTY-01`).

## Capabilities

### New Capabilities
- `recommendations`: the grouped, sorted recommendation list that renders each program's
  chance %, uncertainty band, and traffic-light risk category (never color-only), sinks
  non-fitting programs to the bottom, shows a helpful empty state, and keeps the honesty
  disclaimer + data-freshness context present.

### Modified Capabilities
<!-- None — recommendations is a new capability; it renders scoring-engine output and consumes app-shell, changing no existing requirement. -->

## Impact

- **Code:** `app/components/planner/Recommendations.tsx`, `ProgramCard.tsx`,
  `ChanceRing.tsx`, `CategoryPill.tsx`, `CategoryTabs.tsx`; selectors in
  `app/lib/recommend.ts` (`selectPrograms`, `matchesCategory`, `categoryLabel`). Reads
  `app/lib/scoring.ts` (evaluation) and `app/lib/programs.ts` (`DATA_AS_OF`).
- **Requirements traced:** owns `FR-UX-01`; renders `FR-SCORE-02`, `FR-SCORE-03`; carries
  `NFR-A11Y-01` and `BC-HONESTY-01`.
- **Downstream:** entry point for `shortlist` (save/compare) and refined by `filtering`;
  no backend or network impact.
