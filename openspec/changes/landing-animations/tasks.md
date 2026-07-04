## 1. Motion foundation (shared)

- [x] 1.1 Add motion tokens (duration, distance, easing) to `src/app/globals.css` `@theme` and the reduced-motion kill switch (`@media (prefers-reduced-motion: reduce)`); mirror values in `docs/vouch-design-system/` per DESIGN.md sync rule — tokens `--ease-out`/`--reveal-duration`/`--reveal-distance`/`--hover-duration`; reduced-motion block forces reveals visible; mirrored in `tokens/motion.css` + DESIGN.md note
- [x] 1.2 Add the reveal primitive to `shared/ui` (IntersectionObserver toggling `data-revealed`, once-per-element, `matchMedia` reduced-motion guard, SSR-visible default) with unit tests — `shared/ui/reveal`; SSR-visible default, useLayoutEffect hide + transition armed a frame later (no fade-out flash), `fade={false}` transform-only for LCP; 5 tests

## 2. Landing sections

- [x] 2.1 Wire scroll-reveal onto the below-the-fold landing sections (pillars, before/after, checklist preview, how-it-works, pricing, FAQ, final CTA) in `views/landing` — each wrapped in `<Reveal>` in `Landing.tsx`; content stays server-rendered (only the wrapper ships JS)
- [x] 2.2 Add the hero entrance animation (headline, lead, CTAs, demo card) keeping the LCP element painted visible at first render — CSS `.rise-in` on lead/CTA/note only; h1 AND demo card stay painted static so whichever is the LCP element is never delayed (razor-thin ~20ms budget, unmeasurable in sandbox)

## 3. CTA micro-interactions

- [x] 3.1 Add hover/press transitions to `shared/ui` Button (primary + ghost) using existing color tokens; keep visible focus styles (NFR-A11Y-01) — hover lift + color/shadow shift on primary+ghost (+secondary/dark), `active:scale`/`translate-y-0` press; global `:focus-visible` halo untouched

## 4. Verify

- [~] 4.1 Re-run the Lighthouse procedure from `docs/perf/log.md` (before/after), assert LCP < 2.5 s, TBT < 200 ms, CLS = 0, append deltas to the log; run agent-verify + checker-review and update `docs/current-state.md` — lint + build + 640 tests green; adversarial multi-dimension review workflow run (maker≠checker). **Lighthouse deferred** (no Chrome in sandbox); CLS-0 guaranteed by construction (opacity/transform only), LCP protected by static h1/demo-card
