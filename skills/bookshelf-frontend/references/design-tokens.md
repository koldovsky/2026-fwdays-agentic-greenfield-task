# Bookshelf — Design Tokens (reference)

Authoritative source: `docs/design-system/tokens/*.css` and `styles.css`. This is a
recall aid — when in doubt, read the CSS. Always prefer **semantic aliases** over raw
scales. Dark mode overrides many of these via `:root[data-theme="dark"]`.

## Colors (`tokens/colors.css`)

**Semantic aliases — use these in UI:**
- Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`,
  `--text-inverse`, `--text-link`.
- Surfaces: `--surface-page`, `--surface-card`, `--surface-raised`,
  `--surface-sunken`, `--surface-inset`.
- Borders/rules: `--border-subtle`, `--border-default`, `--border-strong`,
  `--rule-line` (notebook ruled lines).
- Brand action: `--accent`, `--accent-hover`, `--accent-pressed`, `--accent-soft`,
  `--accent-on`.
- Status: `--success`, `--warning`, `--danger` (+ `*-soft` backgrounds).
- Focus: `--focus-ring`.

**Raw scales (don't use directly unless building a token):** `--paper-0..4`,
`--ink-0..6`, `--blue-50..900` (primary `--blue-500 #3a4fe0`).

**Highlighters (notes only):** `--hl-{yellow,amber,coral,pink,purple,blue,teal,green}`
(saturated) and `--hl-<key>-mark` (translucent marker over text). Hex:
yellow `#ffd84d`, amber `#ffaf45`, coral `#ff6f5e`, pink `#ff7fb8`, purple `#b083f5`,
blue `#5ab2ff`, teal `#3ccfbf`, green `#7fd96f`.

## Typography (`tokens/typography.css`)

- Families: `--font-display` (Newsreader serif), `--font-sans`/`--font-body`
  (Hanken Grotesk), `--font-mono`/`--font-meta` (Spline Sans Mono). Roles:
  `--font-title`, `--font-body`, `--font-meta`.
- Scale: `--text-xs 12` · `--text-sm 13` · `--text-base 15` (UI body) ·
  `--text-md 17` (reading body) · `--text-lg 20` · `--text-xl 24` · `--text-2xl 30` ·
  `--text-3xl 38` · `--text-4xl 48` · `--text-5xl 62`.
- Weights: `--weight-regular 400` … `--weight-medium/semibold/bold/extra 800`.
- Leading: `--leading-tight 1.08` · `snug 1.25` · `normal 1.5` · `relaxed 1.65`.
- Tracking: `--tracking-tight -0.02em` (display) · `snug` · `normal` · `wide` ·
  `caps 0.08em` (eyebrows).

## Spacing & layout (`tokens/spacing.css`, 4px base)

- `--space-1 4` · `2 8` · `3 12` · `4 16` · `5 20` · `6 24` · `8 32` · `10 40` ·
  `12 48` · `16 64` · `20 80` · `24 96`.
- Layout: `--container-max 1180px`, `--reading-max 680px` (summary/note column),
  `--sidebar-w 264px`, `--header-h 60px`, `--rule-height 32px`.

## Effects (`tokens/effects.css`)

- Radii: `--radius-xs 4` · `sm 8` (controls) · `md 12` (controls) · `lg 16` (cards) ·
  `xl 22` (modals) · `2xl 30` · `full 999`.
- Borders: `--border-w 1px`, `--border-w-thick 1.5px`.
- Shadows (warm, low): `--shadow-xs … --shadow-xl`, `--shadow-card`. Never cool grey.
- Motion: `--dur-fast 120ms`, `--dur-base 180ms`, `--dur-slow 280ms`;
  `--ease-out` (color/opacity), `--ease-spring` (toggles/swatches, slight overshoot).
- Textures (as `background`): `--texture-rule` (ruled lines), `--texture-dot` (dots).

## Base helpers (`tokens/base.css`)

- Resets + page defaults (body uses `--font-body`/`--surface-page`).
- `h1–h4` default to the serif. `::selection` uses `--hl-yellow-mark`.
- `.bs-eyebrow` — mono uppercase overline.
- Interaction-state classes shipped with components: `.bs-button`, `.bs-iconbtn`,
  `.bs-input`, `.bs-tag`, `.bs-tab`, `.bs-card-int` (hover-lift), `.bs-mark`
  (inline highlighter over text).
