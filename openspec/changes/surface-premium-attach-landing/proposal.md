# Surface the shipped premium PDF-attach on the landing

## Why

The `update-landing-flow` change intentionally kept premium PDF-attach off the
landing because the feature was unbuilt at the time (its guard §3.1 cites
BC-HONESTY-01, and a scenario asserts "no unbuilt PDF attach advertised"). The
`premium-attach` capability has since shipped (`add-premium-pdf-attach`,
FR-PAYWALL-01/02, BC-HONESTY-01/02): a paid user can attach their original CV PDF,
which enriches the GENERATION pass only and never reaches the grounding pass.

That guard is now stale. The landing already sells the other Pro outputs
(cover-letter export, saved history) but omits this shipped Pro input. This change
represents it honestly, in the same calm enemy-centric voice: text extraction
flattens your document; Pro lets the tailor work from your full original PDF,
while every line stays grounded in what your CV actually says.

## What Changes

- **Pricing.** Add the original-PDF attachment to the Pro plan feature list (it is
  a paid capability, gated server-side; free users get a disabled premium
  affordance in the app).
- **FAQ.** Add one entry explaining the original-PDF attachment: what it does
  (feeds the tailor the full document for richer, more faithful rewriting), what
  it does not do (never invents, never enters the grounding pass, honesty
  unchanged), and that it is a Pro feature.
- **Not in scope:** any new above-the-fold section (perf), i18n extraction of
  landing strings (separate change), and at-rest PDF storage (T5 is
  request-scoped by decision D1).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `marketing-landing`: the page now represents the shipped premium original-PDF
  input (pricing + FAQ), superseding the prior "PDF attach is not advertised"
  scenario. Honesty framing preserved: the attachment enriches generation only,
  never grounding, and never fabricates (BC-HONESTY-01).

## Archive ordering

This change's delta MODIFIES the "Landing represents the full export flow"
requirement, which is currently an ADDED block in the still-unarchived
`update-landing-flow` change (not yet in the baseline `marketing-landing` spec). A
MODIFY resolves against baseline, so `update-landing-flow` MUST be archived first
(folding that requirement + its "no unbuilt PDF attach advertised" scenario into
baseline); only then does this MODIFY correctly supersede it. Archive order:
`update-landing-flow` → `surface-premium-attach-landing`.

## Impact

- `src/views/landing/lib/content.ts` (Pro plan feature, one FAQ item).
- No new dependencies, no new hues, no emoji/exclamation points (BC-BRAND-01), no
  structural/section changes, no new above-the-fold content. Motion/perf
  unchanged; re-run `perf-audit` (LCP margin ~20 ms) when Chrome is available.
