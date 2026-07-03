# Prokhidnyi — Design System

A real, ready-to-use design system for the Prokhidnyi app. Vanilla CSS with custom properties — drops into any web project (React, Vue, plain HTML) with no dependencies or build step.

## Structure

```
design-system/
├── tokens.css        Source of truth: color, type scale, space, shape, shadows (--pk-* variables)
├── typography.css    Font loading (Unbounded, Manrope) + type classes (.pk-h1, .pk-body …)
├── base.css          Resets, body, form elements (slider, input)
├── components.css    Component classes (.pk-btn, .pk-card, .pk-ring, .pk-pill …)
└── index.html        Living reference gallery — open it in a browser to see everything
```

## Getting started

Order matters — `tokens.css` first:

```html
<link rel="stylesheet" href="design-system/tokens.css">
<link rel="stylesheet" href="design-system/typography.css">
<link rel="stylesheet" href="design-system/base.css">
<link rel="stylesheet" href="design-system/components.css">
```

Or in one shot via `@import` in your own CSS:

```css
@import 'design-system/tokens.css';
@import 'design-system/typography.css';
@import 'design-system/base.css';
@import 'design-system/components.css';
```

## Core components

| Class | What it is |
|---|---|
| `.pk-btn--primary` / `--dark` / `--secondary` | Buttons |
| `.pk-icon-btn` | Square icon button (★ / ⇄) |
| `.pk-card` (+`.pk-card--hover`) | Surface card |
| `.pk-pill--safe` / `--real` / `--dream` | Risk-category pill (traffic-light) |
| `.pk-status--saved…--enrolled` | Application status badge (5 stages) |
| `.pk-ring--safe/real/dream` | Chance ring (donut) — % via `--pk-pct` |
| `.pk-chip` / `.pk-tab` / `.pk-segment` | Toggle chips, filter tabs, segmented control |
| `.pk-toggle-row` | Toggle row (benefit) |
| `.pk-range` / `.pk-input` | Score slider, text field |
| `.pk-gradient-panel` | Profile/metric on the navy gradient |
| `.pk-table` | Comparison table |
| `.pk-banner` / `.pk-empty` / `.pk-bars` | Deadline banner, empty state, bar chart |
| `.pk-modal` | Detail modal |

### Example: chance ring

```html
<div class="pk-ring pk-ring--real" style="--pk-pct:54%">
  <span class="pk-ring__val">54%</span>
</div>
```

### Example: recommendation card

```html
<div class="pk-card pk-card--hover">
  <div class="pk-h3">NaUKMA</div>
  <div class="pk-text-sm">Philology · Kyiv</div>
  <span class="pk-pill pk-pill--real"><span class="pk-pill__dot"></span>Realistic</span>
</div>
```

## Tokens

Every value is a CSS variable prefixed `--pk-` in `:root` (see `tokens.css`). Change the theme in one place and the whole UI updates. Key groups: color (`--pk-navy-*`, `--pk-safe/real/dream-*`, `--pk-action`), type scale (`--pk-text-*`, `--pk-font-*`), space (`--pk-space-*`), shape (`--pk-radius-*`), shadows (`--pk-shadow-*`).

## Related documents

- `design-system.md` — system and rules described in prose
- `../PRD.md`, `requirements.md` — product requirements
- `../template/concept.html` — the concept of the app, with a few components from this design system
- `../template/prototype.html` — the app built on this language

> Fonts are loaded via Google Fonts. For offline/self-hosted use, replace the `@import` in `typography.css` with local `@font-face` rules pointing at `.woff2` files.
