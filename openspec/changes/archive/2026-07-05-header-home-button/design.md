## Context

The `Header` is a server component rendering `Logo` + `ThemeToggle`. The logo
already links home. Hiding the new control on `/` requires the current pathname,
which is only available client-side.

## Goals / Non-Goals

**Goals:** an obvious, keyboard-accessible way home from any sub-route, styled
through DS tokens, hidden on the landing page.

**Non-Goals:** browser-history "back" semantics (this always goes to `/`, not the
previous page); replacing the logo link.

## Decisions

- **Small client component reading `usePathname`.** The control is a client island
  (`HomeLink`) that returns `null` when `pathname === "/"`. Keeping it a focused
  island leaves the rest of the header a server component.
- **Text label, not an icon.** Renders the word "Home" (sentence case) — the
  product is near-iconless (BC-BRAND-03), so no chevron/icon set is introduced.
- **Placement:** right side of the header, before the theme toggle, so it reads as
  an explicit action distinct from the logo on the left.
- **`next/link`** for client-side navigation, consistent with `Logo`.

## Risks / Trade-offs

- [Redundant with the logo] → Mitigated by hiding it on `/` and labeling it clearly;
  the two controls coexist elsewhere as logo (identity) vs. Home (action).
