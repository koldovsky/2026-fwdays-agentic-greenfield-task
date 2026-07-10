# Landing animations — design

## Context

`views/landing` is a fully server-rendered composition; after the perf rework
the only client JS is the framework runtime (FAQ is native `<details>`), and
the page meets LCP < 2.5 s / TBT < 200 ms / CLS 0 mobile-throttled
(`docs/perf/log.md`) toward NFR-PERF-04. The brand is restrained/editorial
(BC-BRAND-01): motion must feel like typography, not fireworks. NFR-A11Y-01
requires the page to stay fully usable with `prefers-reduced-motion: reduce`.

## Goals / Non-Goals

**Goals:**

- Reveal below-the-fold sections on first scroll into view; animate the hero
  in on load; add hover/press micro-interactions to CTA buttons.
- Zero CLS, no perf-budget regression, reduced-motion respected everywhere.
- Keep the landing's client-JS footprint near zero.

**Non-Goals:**

- No motion elsewhere in the app (`/tailor`, future views).
- No parallax, scroll-linked (scrub) animation, page transitions, or Lottie/
  video assets.
- No animation framework (framer-motion, GSAP, etc.).

## Decisions

1. **CSS-first; JS only to add a class.** Hero entrance and CTA
   micro-interactions are pure CSS (`@keyframes` / `transition` on
   `opacity`/`transform`). Scroll-reveal uses one tiny `IntersectionObserver`
   that toggles a `data-revealed` attribute — no per-frame JS, no WAAPI needed.
   Alternative considered: a ≤ 3 kb reveal lib (e.g., a headless
   in-view helper) — rejected while a ~30-line observer suffices; the ≤ 3 kb
   cap from the proposal remains the fallback ceiling.
   Alternative considered: CSS-only `animation-timeline: view()` — rejected
   for now (browser support too narrow for a marketing page).
2. **Progressive enhancement, SSR-safe.** Sections render fully visible in
   HTML; the "hidden" pre-reveal state is applied only when JS runs (e.g., a
   class set by the observer script before first reveal). No-JS visitors,
   crawlers, and the LCP element see complete content — the hero headline/lead
   (the LCP element) is either excluded from entrance animation or animates
   opacity from a visible-enough state within the same paint, so LCP is not
   delayed.
3. **Transform/opacity only, `once` semantics.** Reveals run once per element
   (unobserve after reveal), translate ≤ 16 px, duration 300–500 ms, standard
   ease-out. Nothing animates `height`/`margin`/layout — CLS stays 0.
4. **Reduced motion is a hard gate.** One `@media (prefers-reduced-motion:
   reduce)` block neutralizes all entrance/reveal animation (elements simply
   visible); the observer script also checks `matchMedia` and skips entirely.
   Hover states degrade to color-only changes.
5. **One shared primitive.** A `Reveal`-style wrapper (or `data-reveal`
   attribute convention) lives in `shared/ui` so `views/landing` stays a thin
   composition and the FSD import rule holds (views → shared).

## Risks / Trade-offs

- [Observer script reintroduces client JS to the landing] → keep it a single
  tiny module (< 1 kb), loaded with the existing runtime; verify TBT via the
  `docs/perf/log.md` Lighthouse procedure before/after.
- [Hero entrance delays LCP] → LCP element paints visible (decision 2);
  Lighthouse re-run is the exit gate.
- [Pre-reveal hidden state flashes for slow JS] → hidden state only applied by
  JS itself (never in SSR HTML), so worst case is "no animation", never
  "invisible content".
- [Brand drift toward flashy motion] → durations/distances fixed in tokens;
  checker-review audits against BC-BRAND-01.

## Open Questions

- None blocking; token values (duration/distance/easing) to be finalized in
  implementation against `docs/vouch-design-system/` guidelines.
