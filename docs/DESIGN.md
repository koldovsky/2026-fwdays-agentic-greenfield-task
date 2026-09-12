# Ticket2MD — Design System

Foundation: [Pico CSS](https://picocss.com) v2, classless mode. Pico supplies the component styling and base design tokens (CSS custom properties); this document records our decisions on top of it. Everything below not confirmed yet is `proposed`.

## Principles

- Minimal and calm: the popup is a tool, not a product tour. No animations except the loader.
- Native feel: system font stack (Pico default), OS-driven light/dark theme.
- Everything themable via Pico CSS variables — no hardcoded colors in markup.

## Color tokens

Theme follows `prefers-color-scheme`; both themes come from Pico and are only overridden where listed.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--pico-primary` | `#0172ad` (Pico azure) | `#01aaff` | Export button, links, loader |
| Success | Pico green (`#398712` / `#7fbf3f`) | | State 3 message accent |
| Error | Pico red (`#d93526` / `#f06048`) | | State 4 message accent |
| Icon background | `#1b2832` (graphite, both themes) | | Toolbar icon |
| Icon glyph | `#ffffff` | | "md" letters |
| Icon accent | `#01aaff` | | Download arrow in icon |

## Toolbar icon

- Rounded rectangle (radius ≈ 20% of size), graphite `#1b2832` background.
- Lowercase "md" in a bold system/geometric sans, white, optically centered.
- A small azure down-arrow after the letters, hinting at download (dropped at 16 px if unreadable).
- Sizes: 16, 32, 48, 128 px. Single source SVG, rasterized at build time.

## Popup composition

Fixed width 320 px, height by content. One column, Pico spacing defaults.

### State 1 — idle
```
┌──────────────────────────────┐
│ Export ticket to MD          │  ← <h1>, Pico heading
│                              │
│ ☑ Anonymize names            │  ← checkbox, checked by default
│                              │
│ [        Export        ]     │  ← primary button, full width
└──────────────────────────────┘
```
When the tab is not a recognized ticket page (FR-04): same layout, button disabled, muted hint "Open a Jira ticket" under the title.

### State 2 — in progress
Title stays; controls replaced by a centered Pico loader (`aria-busy="true"`) with the label "Exporting…".

### State 3 — success
Title stays; green-accented message "Export completed successfully." No auto-close. When the `.md` exported but one or more attachments could not be downloaded (FR-12 partial success), an optional caveats `<details>` block appears below the message listing the attachments that failed. This is a variant of the success state, not a new state (FR-09) — hard failures (no `.md` produced) still use State 4.

### State 4 — error
Title stays; red-accented message "Export failed" plus a details block (Pico `<details>`) listing specifics, e.g. attachments that could not be downloaded (FR-12).

## Typography

Pico defaults: system font stack, base 16 px. Popup title uses `<h1>` scaled by Pico; no custom fonts (keeps the bundle small and local — NFR-01/NFR-05).

## Accessibility

- WCAG AA contrast in both themes (Pico tokens already comply; verify the icon and accent overrides).
- Loader announced via `aria-busy`; state changes in a polite live region.
- Full keyboard operability: checkbox and button reachable and activatable without a mouse.
- `prefers-reduced-motion`: the loader falls back to a static "Exporting…" label.
