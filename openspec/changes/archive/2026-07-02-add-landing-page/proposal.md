## Why

Vouch has no public front door. The PRD requires a marketing landing that sells
the honesty differentiator with a static before/after demo and a pricing table
(FR-SALES-01/02/03), and a reference design already exists at
`docs/vouch-design-system/vouch-landing-example.html`. This change turns that
reference into a real, accessible `views/landing` slice so anonymous visitors can
understand the product and start their first free tailoring.

## What Changes

- New `views/landing` slice composing the full marketing page as server-rendered
  sections: sticky header nav, hero + signature demo card, honesty pillars,
  grounded before/after, match-score checklist, how-it-works, pricing table, FAQ
  accordion, final CTA, footer.
- Extract the existing hero out of `src/app/page.tsx` and mount `views/landing`
  there (thin route leaf → view), completing next step 3 of `docs/current-state.md`.
- Reuse `shared/ui` kit (Button, Badge, StatusPill, MatchScore, GroundingBadge)
  and existing design tokens — no new brand hues, emoji, exclamation points, or
  icon libraries (BC-BRAND-01).
- Primary CTA routes to `/tailor`; the demo/checklist content is static example
  data (no sign-in, no network) per FR-SALES-02.
- FAQ accordion is the only interactive piece; everything else is static and
  accessible (NFR-A11Y-01), with no third-party trackers on the page (BC-PRIVACY-01).

## Capabilities

### New Capabilities
- `marketing-landing`: the public landing page — hero, static honest-demo,
  before/after, checklist preview, pricing, FAQ, CTAs — as an FSD `views/landing`
  slice. Serves FR-SALES-01/02/03.

### Modified Capabilities
<!-- None. app-shell already covers the shell/CTA empty state; this adds the marketing surface. -->

## Impact

- New: `src/views/landing/**` (ui + index barrel), example fixture data.
- Changed: `src/app/page.tsx` (renders `views/landing` instead of inline hero).
- Depends on: existing `shared/ui`, design tokens in `src/app/globals.css`,
  fonts in `src/app/layout.tsx`. No new runtime dependencies.
- Serves: FR-SALES-01/02/03, NFR-A11Y-01, BC-BRAND-01, BC-PRIVACY-01.
