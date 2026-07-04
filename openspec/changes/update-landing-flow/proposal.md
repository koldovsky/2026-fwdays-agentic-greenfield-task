# Update landing to the current tailoring flow

## Why

The landing page predates the tailoring-intelligence and history work. It sells
grounded/overclaim bullets and a four-state checklist, but the shipped product
now also has: a fifth "coverable" (blue info) checklist state, a grounded
cover-letter export, and saved tailoring history. None of that is on the page.
The framing is also solution-first — the org's marketing rule is enemy-centric
(lead with the broken status quo, then position Vouch as the honest alternative),
and today the strongest anti-generic-AI contrast is buried mid-page and in the
FAQ (FR-SALES-01/02/03).

This change updates the landing copy + demo to reflect shipped behavior and leads
with the reader's pain — without spending the earned performance budget
(NFR-PERF-04) and without selling anything not yet built (premium PDF-attach,
task 5, is intentionally excluded — honesty is the product, BC-HONESTY-01).

## What Changes

- **Enemy-centric hero.** Rewrite the hero to lead with the pain (generic AI
  resume tools invent experience you then have to defend in the interview), then
  position Vouch as the tool that refuses to. Hero copy moves into `content.ts`
  as a structured `hero` object. LCP element/structure unchanged.
- **Fifth checklist state on the demo.** Add a blue "coverable" (`info`) row to
  the checklist preview and name it in the headline/subtext, so the demo shows
  all five states (met, coverable, partial, gap, overclaim-risk).
- **Sell shipped features.** How-it-works step 03 names the cover-letter export
  and saved history; a new FAQ entry covers cover letters + history. Pricing
  already lists both.
- **Sharpen the pillars** with explicit them-vs-us contrast.
- **Not in scope:** premium PDF-attach copy (feature unbuilt), i18n extraction of
  landing strings (task 10), and any new above-the-fold section (perf).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `marketing-landing`: the static demo shows five checklist states (adds the blue
  coverable/info state); the page represents the cover-letter export and saved
  history; hero framing leads with the problem.

## Impact

- `src/views/landing/lib/content.ts` (hero object, checklist rows, pillars, steps,
  FAQ), `src/views/landing/ui/Hero.tsx` (consume `hero` content).
- No new dependencies, no new hues (the blue reuses the existing `brand` token),
  no structural/section changes. Re-run `perf-audit` (LCP margin ~20 ms).
