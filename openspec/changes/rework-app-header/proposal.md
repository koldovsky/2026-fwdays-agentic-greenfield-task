# Rework app header (signed-in state + nav isolation)

## Why

The top bar is shell chrome on every route, but three things read as broken
(T4 in `docs/roadmap-2026-07.md`):

- The marketing nav (`Features` → `/#how`, `Pricing` → `/#pricing`) renders on
  every route, including `/tailor` and `/account/*`. Off the landing page those
  anchors jump the user out of the app back to the landing page — nav that
  "leaks" out of the shell (NFR-OBS-02: calm, predictable UI).
- Anchor targets on the landing page sit under the sticky `h-16` header because
  there is no scroll padding, so a `/#pricing` link lands with the section
  heading hidden behind the bar.
- A signed-in user's identity only appears inside the account dropdown; the
  header row itself gives no at-a-glance signal of being signed in.

## What Changes

- `TopBar` gains a `showMarketingNav` prop (default **false**). The landing
  page's `TopBarSession` passes `true`; app-shell routes render the top bar
  without the marketing anchors, so they no longer leak off-landing.
- The signed-in user's first name is shown in the header row next to the account
  burger, truncated for long names, Ukrainian-first via `shared/lib/i18n`.
- `html { scroll-padding-top: 4rem }` (matching `h-16`) in `globals.css` so
  in-page anchor navigation clears the sticky header on every route.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `app-shell`: the top bar's marketing nav is landing-only (not on every primary
  route); the signed-in state shows the user's name in the header; anchor
  navigation accounts for the sticky header height.

## Impact

- Code: `src/widgets/top-bar/ui/TopBar.tsx`, `src/widgets/top-bar/ui/TopBarSession.tsx`,
  `src/app/globals.css`, `src/shared/lib/i18n` (a "signed in as" label if needed).
  Landing already renders `TopBarSession`; app routes render `TopBar` directly.
- Specs: modifies `app-shell`.
- No schema/API change. Footer dead Privacy link is handled by `add-legal-pages`.
