## 1. Motion foundation (shared)

- [x] 1.1 Add motion tokens (duration, distance, easing) to the `src/app/globals.css` `:root` block and the reduced-motion kill switch (`@media (prefers-reduced-motion: reduce)`); mirror values in `docs/vouch-design-system/` per DESIGN.md sync rule. Tokens `--ease-out`/`--reveal-duration`/`--reveal-distance`/`--hover-duration` live in `:root` (consumed via raw `var()`, not Tailwind utilities, so not `@theme`); the reduced-motion block forces reveals visible AND removes the hero `.rise-in` animation and zeroes `animation-delay`/`transition-delay` (no hidden-then-snap flash, NFR-A11Y-01); mirrored in `tokens/motion.css` + DESIGN.md note
- [x] 1.2 Add the reveal primitive to `shared/ui` (IntersectionObserver toggling `data-revealed`, once-per-element, `matchMedia` reduced-motion guard, SSR-visible default) with unit tests: `shared/ui/reveal`; SSR-visible default (asserted via `renderToStaticMarkup`), useLayoutEffect hide + transition armed a frame later (no fade-out flash), `fade={false}` transform-only for LCP; 6 tests

## 2. Landing sections

- [x] 2.1 Wire scroll-reveal onto the below-the-fold landing sections (pillars, before/after, checklist preview, how-it-works, pricing, FAQ, final CTA) in `views/landing`: each wrapped in `<Reveal>` in `Landing.tsx`; content stays server-rendered (only the wrapper ships JS)
- [x] 2.2 Add the hero entrance animation keeping the LCP element painted visible at first render. Scope: `.rise-in` on the lead/CTA/note only; the h1 headline AND the demo card stay painted static so whichever is the LCP element is never delayed (razor-thin ~20ms budget, unmeasurable in sandbox). NOTE: narrowed from the proposal's "headline + demo card animate" precisely to protect the LCP element (NFR-PERF-04)

## 3. CTA micro-interactions

- [x] 3.1 Add hover/press transitions to `shared/ui` Button (primary + ghost) using existing color tokens; keep visible focus styles (NFR-A11Y-01): hover lift + color/shadow shift on primary+ghost (+secondary/dark), `active:scale`/`translate-y-0` press; global `:focus-visible` halo untouched; disabled link form (aria-disabled `<a>`) mirrors the `disabled:` muted state via `aria-disabled:` + `pointer-events-none` so it shows no hover affordance

## 4. Verify

- [x] 4.1 lint + build + test green (103 files / 640 tests → 641 after the added SSR test); adversarial multi-dimension review workflow run (maker≠checker, 4 lenses + per-finding verify), all confirmed findings fixed (reduced-motion delay flash, disabled-link hover, doc/comment accuracy). **Lighthouse deferred** (no Chrome in sandbox); CLS-0 guaranteed by construction (opacity/transform only), LCP protected by static h1/demo-card. `openspec archive` pending (CLI not installed here)
