## 1. Motion foundation (shared)

- [ ] 1.1 Add motion tokens (duration, distance, easing) to `src/app/globals.css` `@theme` and the reduced-motion kill switch (`@media (prefers-reduced-motion: reduce)`); mirror values in `docs/vouch-design-system/` per DESIGN.md sync rule
- [ ] 1.2 Add the reveal primitive to `shared/ui` (IntersectionObserver toggling `data-revealed`, once-per-element, `matchMedia` reduced-motion guard, SSR-visible default) with unit tests

## 2. Landing sections

- [ ] 2.1 Wire scroll-reveal onto the below-the-fold landing sections (pillars, before/after, checklist preview, how-it-works, pricing, FAQ, final CTA) in `views/landing`
- [ ] 2.2 Add the hero entrance animation (headline, lead, CTAs, demo card) keeping the LCP element painted visible at first render

## 3. CTA micro-interactions

- [ ] 3.1 Add hover/press transitions to `shared/ui` Button (primary + ghost) using existing color tokens; keep visible focus styles (NFR-A11Y-01)

## 4. Verify

- [ ] 4.1 Re-run the Lighthouse procedure from `docs/perf/log.md` (before/after), assert LCP < 2.5 s, TBT < 200 ms, CLS = 0, append deltas to the log; run agent-verify + checker-review and update `docs/current-state.md`
