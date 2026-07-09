# Landing animations

## Why

The landing page is fully static and reads flat; restrained motion (reveal on
scroll, hero entrance, CTA micro-interactions) strengthens the editorial brand
and guides visitors toward the primary CTA (FR-SALES-01, BC-BRAND-01). It must
not spend the performance budget the page just earned — Lighthouse ≥ 90 mobile
(NFR-PERF-04), LCP < 2.5 s, TBT < 200 ms, CLS 0 — or degrade accessibility
(NFR-A11Y-01).

## What Changes

- Scroll-reveal on landing sections below the fold (pillars, before/after,
  checklist preview, how-it-works, pricing, FAQ, final CTA): fade/translate in
  once as they enter the viewport.
- Hero entrance: the supporting copy (lead, CTAs, note) animates in on load. The
  h1 headline and demo card stay painted static so the LCP element is never
  delayed (NFR-PERF-04).
- Hover/press micro-interactions on CTA buttons (primary and ghost).
- All motion is disabled (instant, fully visible end state) when the visitor
  has `prefers-reduced-motion: reduce`.
- Implementation budget: CSS transitions/animations and/or the Web Animations
  API; a helper library only if ≤ 3 kb gzipped. No animation framework, no new
  icon/motion asset libraries.
- Motion uses only `opacity`/`transform` — zero layout shift (CLS stays 0) and
  no regression of the shipped perf budgets (LCP < 2.5 s, TBT < 200 ms mobile
  throttled; see `docs/perf/log.md`).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `marketing-landing`: adds motion requirements to the landing page — section
  scroll-reveal, hero entrance, CTA micro-interactions — each constrained by
  reduced-motion support, CLS 0, and the existing performance budget.

## Impact

- Code: `src/views/landing/ui/*` (sections, hero), `src/shared/ui` Button
  (hover/press states), possibly a small `shared/lib`/`shared/ui` reveal helper
  (IntersectionObserver). No route, API, or data changes.
- Dependencies: none expected; at most one ≤ 3 kb gzipped helper.
- Perf: guarded by re-running the Lighthouse procedure in `docs/perf/log.md`
  before and after (NFR-PERF-04).
- Scheduling: implement after the current main-flow work (`add-persistence` /
  `add-auth` remainder), before any new feature changes.
