# Capability: theming

- **Order:** 03 · **Phase:** 1 · **OpenSpec change:** `add-theming` · **Status:** not started
- **Depends on:** app-shell · **Blocks:** all UI polish
- **Packages:** `apps/mobile`

## Summary

Light / Dark / System theming driven entirely by design tokens, defaulting to Dark. The token
theme already exists (`apps/mobile/src/theme/`, see DESIGN.md); this capability adds the
user-facing switch, persistence, and AA-contrast verification.

## Requirements

| ID | Description |
|----|-------------|
| FR-THEME-01 | Switch Light / Dark / System from settings; default is **Dark** |
| FR-THEME-02 | Selection persists across launches; applies app-wide immediately, no restart |
| FR-THEME-03 | All colors from centralized design tokens (DESIGN.md); no hardcoded colors |
| FR-THEME-04 | Native surfaces (widget, Live Activity) follow **system** appearance, not the in-app override |
| NFR-A11Y-02 | Palette meets WCAG AA contrast in **both** light and dark themes |

## Scope

- Theme setting (Light/Dark/System) in Profile/settings, persisted (e.g. AsyncStorage).
- `ThemeProvider` honors the stored override vs system; instant swap.
- Contrast audit of the token palette in both themes.

## Non-goals

No new palette design — tokens are fixed in DESIGN.md / the `honeydo-design` skill. Native
surfaces deliberately ignore the in-app override (FR-THEME-04).

## Risks / notes

**Brand decision blocks this:** the PRD describes a dark/blackwork identity (BC-BRAND-01) while
the integrated tokens are a warm honey theme. Resolve before finalizing the palette.
