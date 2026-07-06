## Why

The landing page currently left-aligns a two-tier hero and stacks the form. A
centered, three-tier hero (eyebrow + display headline + standfirst) with an
inline username + action row reads calmer and puts the entry point front and
center. The mode labels also move to the friendlier **Explore / Compare** framing
used on the entry screen.

## What Changes

- Restyle the landing hero: center-aligned, add an italic serif **eyebrow** line,
  a larger display headline, and a centered standfirst (pure styling).
- Put the username input and submit action on a single inline row, with the
  submit as the light primary button showing a trailing arrow ("Explore →").
- Rename the two landing modes from **View Stats / Battle** to **Explore /
  Compare**, and the compare action from "Fight" to "Compare". (Routes and the
  head-to-head view keep their battle identity.)

No behavioral change to validation, navigation, or the data layer.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `landing-entry`: mode labels renamed (Explore/Compare) and the landing layout
  requirement added (centered hero, inline input + action row).

## Impact

- **Code:** `app/page.tsx`, `app/components/LandingForm.tsx`, `lib/strings.ts`.
- **Specs:** delta to `openspec/specs/landing-entry/spec.md` (FR-LAND-01/02).
- **Design system:** all changes through DS tokens; sentence case; near-iconless
  (the "→" is a text glyph, not an icon set).
