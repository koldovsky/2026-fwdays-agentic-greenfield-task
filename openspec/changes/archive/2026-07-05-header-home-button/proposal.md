## Why

The header logo links home (FR-SHELL-03), but there is no explicit, labeled way
back to the landing page. From a deep `/stats/{u}` or `/battle/{u1}/{u2}` view a
visitor has to know the logo is clickable. An explicit "Home" control makes the
way back obvious.

## What Changes

- Add an explicit, labeled **Home** control to the header that navigates to `/`.
- Show it only on sub-routes; omit it on the landing page to avoid a redundant
  self-link (the logo remains the home affordance there).

No breaking changes; the existing logo-links-home behavior is unchanged.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `shell`: the header gains an explicit labeled home-navigation control in
  addition to the existing logo link.

## Impact

- **Code:** `app/components/Header.tsx` and a small client component that reads the
  current path (`usePathname`) to hide the control on `/`.
- **Design system:** text-labeled link styled through semantic tokens; stays
  near-iconless and sentence case (BC-BRAND-03, DESIGN.md).
- **Specs:** delta to `openspec/specs/shell/spec.md`.
