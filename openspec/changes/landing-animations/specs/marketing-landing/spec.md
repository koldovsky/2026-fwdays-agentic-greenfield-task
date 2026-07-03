## ADDED Requirements

### Requirement: Section scroll-reveal
The system SHALL reveal each below-the-fold landing section (pillars,
before/after, checklist preview, how-it-works, pricing, FAQ, final CTA) with a
single entrance animation the first time it enters the viewport, animating only
`opacity` and `transform` (translate ≤ 16px), running once per section. The
pre-reveal hidden state SHALL be applied only by client-side script, so the
server-rendered HTML shows all content fully visible without JavaScript.
Implements FR-SALES-01, BC-BRAND-01, NFR-PERF-04.

#### Scenario: Section reveals once on scroll
- **WHEN** a below-the-fold section enters the viewport for the first time
- **THEN** it animates in via opacity/transform and remains fully visible; scrolling away and back does not re-run the animation

#### Scenario: No JavaScript
- **WHEN** the page is rendered without client-side JavaScript
- **THEN** every section is fully visible with no hidden pre-reveal state

### Requirement: Hero entrance animation
The system SHALL animate the hero (headline, lead, CTAs, demo card) in on page
load using only `opacity`/`transform`, without delaying the paint of the LCP
element: the LCP element SHALL be painted visible at first render.
Implements FR-SALES-01, NFR-PERF-04.

#### Scenario: Hero animates without hurting LCP
- **WHEN** the landing page loads
- **THEN** the hero elements animate in, and the mobile-throttled Lighthouse LCP stays under 2.5 s (procedure in `docs/perf/log.md`)

### Requirement: CTA micro-interactions
The system SHALL give primary and ghost CTA buttons hover and press
micro-interactions implemented with CSS transitions on `opacity`, `transform`,
and color tokens only — no icon libraries or new brand hues.
Implements FR-SALES-01, BC-BRAND-01, NFR-A11Y-01.

#### Scenario: Hover and press feedback
- **WHEN** the visitor hovers or presses a CTA button
- **THEN** it responds with a token-based transition (color/opacity/transform) and keeps its visible focus style

### Requirement: Reduced-motion and layout-stability guarantees
The system SHALL disable all entrance and reveal animation when the visitor has
`prefers-reduced-motion: reduce` (content simply visible, hover feedback
degrades to color-only), and all motion SHALL animate only `opacity`/`transform`
so cumulative layout shift remains 0. The change SHALL NOT regress the shipped
performance budget (LCP < 2.5 s, TBT < 200 ms, mobile throttled) and SHALL add
no dependency over 3 kb gzipped.
Implements NFR-A11Y-01, NFR-PERF-04, BC-BRAND-01.

#### Scenario: Reduced motion requested
- **WHEN** the visitor's system sets `prefers-reduced-motion: reduce`
- **THEN** no entrance or reveal animation plays and all content is immediately visible

#### Scenario: Perf budget holds
- **WHEN** Lighthouse (mobile, throttled, per `docs/perf/log.md`) runs on the landing page after the change
- **THEN** LCP < 2.5 s, TBT < 200 ms, and CLS = 0
