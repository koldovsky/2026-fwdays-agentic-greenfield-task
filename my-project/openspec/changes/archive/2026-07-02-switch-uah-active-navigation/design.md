# Design

`lib/format.ts` centralizes Ukrainian amount formatting with exactly two decimal places and the `грн` suffix. Dashboard, inventory, and procurement consume this single formatter.

`components/navigation.tsx` is a small client boundary that reads `usePathname`, applies a CSS-module active style, and exposes `aria-current="page"`. Exact and nested section routes match; sibling prefixes do not.

## Verification

Tests were observed red while both modules were absent, then green after implementation. Unit/render tests cover currency output, absence of dollar markers, active-route matching, a single `aria-current`, and authenticated shell integration. Playwright asserts UAH and active navigation in the rendered application.
