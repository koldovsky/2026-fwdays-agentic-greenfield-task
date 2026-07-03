# Honeydo — Design System

Honeydo is a warm, cozy iOS personal time tracker. The brand runs on a **honey
theme** — golden, tactile, calm but productive — with a subtle honeycomb/hexagon
motif through cards, progress, and the streak. Default theme is **Dark** (warm dark
gray, not black); Light is an amber-on-cream token swap.

The full source — tokens, components, guidelines, UI kit, and brand specimens — is
installed as a skill at [`.agents/skills/honeydo-design/`](.agents/skills/honeydo-design/).
This file is the **production reference**: the canonical token values and the rules
for applying them in [`apps/mobile/`](apps/mobile/) (Expo/RN). When in doubt, read the
skill's [`readme.md`](.agents/skills/honeydo-design/readme.md) — it is the source of
truth for voice, motion, and visual intent.

## Golden rules

1. **Tokens only — never raw hex in app code.** Every color, size, radius, and
   duration comes from a named token (see below). Light/Dark must remain a swap, not
   a redesign. Never reach past the semantic aliases (`accent`, `text`, `surface`…)
   into the raw `honey-l-*` / `honey-d-*` palette.
2. **The web CSS in the skill is reference, not a dependency.** `apps/mobile` is
   React Native — there is no DOM, no CSS variables, no `color-mix()`. Port the token
   values into a typed RN theme object (see "Using tokens in React Native"). Do not
   try to ship the skill's `.css`/`.jsx` files in the app.
3. **Dark is the default.** Build for dark first; verify light as the swap.
4. **One primary action per screen, one sentence per helper line.** Warm, second
   person, sentence case. See "Voice".

## Color tokens

Use the **semantic aliases**. Each resolves to a different raw value per theme.

| Semantic        | Dark (default) | Light     | Use                                            |
| --------------- | -------------- | --------- | ---------------------------------------------- |
| `bg`            | `#1C1A17`      | `#FFFBF2` | Screen background (warm dark gray / cream)     |
| `surface`       | `#262220`      | `#FFFFFF` | Card / sheet fill                              |
| `surfaceAlt`    | `#2A2520`      | `#FFF4DE` | Grouped fields, secondary fill                 |
| `accent`        | `#FFB23E`      | `#F5A300` | Honey amber — the single bold accent           |
| `accentPressed` | `#E0922A`      | `#C97A04` | Pressed accent                                 |
| `highlightGold` | `#FFC75A`      | `#FFC75A` | Gradient/highlight gold                        |
| `text`          | `#F4ECDD`      | `#2A2118` | Primary text (warm-tinted, not gray)           |
| `textMuted`     | `#B8A88E`      | `#7A6A55` | Secondary text (warm taupe)                    |
| `border`        | `#3A332B`      | `#F0E2C8` | 1px warm hairline                              |
| `success`       | `#7BC57F`      | `#3E8E4F` | Goal-met / done (honeyed green)                |
| `successSoft`   | `#243023`      | `#E3F1DE` | Success background fill                         |
| `onAccent`      | `#2A1B05`      | `#2A1B05` | Text/icons **on** amber fills (AA both themes) |

Derived fills (compute from the resolved theme, since RN has no `color-mix`):

- `runningGlow` = `accent` at 55% alpha · `runningGlowSoft` = `accent` at 18%
- `fillFaint` = `text` at 6% · `fillSoft` = `text` at 10%
- `accentFaint` = `accent` at 14% · `accentSoft` = `accent` at 22%

**Rules:** the running-timer state **glows amber** (border → amber + glow ring), it
never changes hue. Shadows are warm-tinted `rgba(42,27,5,…)`, never harsh black.

## Typography

Brand fonts are **SF Pro Rounded** (headings + all numeric readouts) and **SF Pro
Text** (body). These are Apple system fonts — on iOS they resolve natively; the
documented webfont fallbacks are **Nunito** / **Nunito Sans** (bundle via
`expo-font` if a non-Apple target ever matters).

- `fontRounded`: SF Pro Rounded → Nunito
- `fontText`: SF Pro Text → Nunito Sans
- `fontNumeric`: SF Pro Rounded, **tabular numerals**, tracking `-0.02em` — for every
  timer/total readout.

Scale (px): `timer 56` · `display 40` · `largeTitle 34` · `title 28` · `title2 22` ·
`headline 17` · `body 17` · `callout 16` · `subhead 15` · `footnote 13` · `caption 12`.

Weights: `regular 400` · `medium 500` · `semibold 600` · `bold 700` · `heavy 800`.
Line heights: `tight 1.05` · `snug 1.2` · `normal 1.35` · `relaxed 1.5`.

Headings use `fontRounded` + bold + tight tracking. Section labels (TODAY, QUICK
START, APPEARANCE) are the **only** ALL-CAPS — short eyebrows with light tracking.

## Spacing, radius, layout

- **Spacing** (4pt base): `1=4 2=8 3=12 4=16 5=20 6=24 7=32 8=40 9=56 10=72`. Default
  screen gutter is **20px**.
- **Radius**: `xs 8 · sm 12 · md 16 (default card) · lg 22 (sheet/large card) · xl 28
  · pill 999 (buttons/chips)`. The app icon uses the iOS continuous-corner squircle.
  Nothing sharp.
- **Layout**: tab bar `84px` (incl. home-indicator safe area), nav `52px`, content
  width cap `430px`.

## Elevation & motion

- **Shadows** (warm-tinted): `shadow1 0 1 2 /.06` · `shadow2 0 2 8 /.08` ·
  `shadow3 0 8 24 /.10` · `shadow4 0 16 40 /.14`, all `rgba(42,27,5,α)`. The running
  timer adds an amber **glow** ring.
- **Cards**: surface fill + 1px warm border + soft warm shadow.
- **Backgrounds**: mostly flat warm surfaces. Heroes/empty states get the faint
  honeycomb texture + a soft amber radial from the top. Gradients are reserved for
  the amber icon/avatar/jar marks (gold → amber).
- **Motion** — calm, no harsh bounces. Easing: `standard cubic-bezier(.4,0,.2,1)`,
  `settle (.22,1,.36,1)`, `spring (.34,1.4,.64,1)` used sparingly, `out (.16,1,.3,1)`.
  Durations: `fast 140 · base 240 · slow 420 · pour 700`. Press = soft scale-down
  (0.92–0.96), never color-only. Running timer = gentle amber glow pulse (2.6s).
  In RN, animate only `transform`/`opacity` (Reanimated), and **always honor
  `prefers-reduced-motion`** (`AccessibilityInfo.isReduceMotionEnabled`) — the
  resting/end state is the visible one; animation only enhances.

## Iconography

- **Icons**: ship **Apple SF Symbols** on-device. The skill mocks use **Lucide** as
  the open CDN stand-in (rounded 2px stroke) — match that weight/feel.
- **App marks** (jar, drop, crescent, hexagon): simple geometric amber SVG.
- **Emoji**: essentially none in chrome. Only sanctioned glyphs are the bee 🐝
  (streak/empty) and a flame for the streak count — small accents, never body copy.
- The **honeycomb hexagon** is the brand glyph (logo, empty state, streak cell).

## Voice

Warm, encouraging, a little playful — never corporate, never cluttered. Second
person ("your hive", "you're 1h ahead"); the app is "Honeydo", never "we". Sentence
case everywhere except ALL-CAPS section eyebrows. Durations are human ("32m",
"2:15:00"), not "0h 32m 00s". Honey vocabulary (hive, sweet, warm, keep it warm) —
one metaphor per screen, max. Never twee.

## Using tokens in React Native

The skill's CSS is the canonical value list; the app consumes a **typed theme
object** derived from it. Centralize it (e.g. `apps/mobile/src/theme/`) so screens
never hardcode values:

```ts
// apps/mobile/src/theme/tokens.ts — values mirrored from
// .agents/skills/honeydo-design/tokens/*.css (semantic aliases per theme)
export const dark = {
  bg: '#1C1A17', surface: '#262220', surfaceAlt: '#2A2520',
  accent: '#FFB23E', accentPressed: '#E0922A', highlightGold: '#FFC75A',
  text: '#F4ECDD', textMuted: '#B8A88E', border: '#3A332B',
  success: '#7BC57F', successSoft: '#243023', onAccent: '#2A1B05',
} as const;
export const light = { /* …Light column above… */ } as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 72 } as const;
export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const dur = { fast: 140, base: 240, slow: 420, pour: 700 } as const;
```

Provide the active theme via React context + a `useTheme()` hook so the Light/Dark
swap stays a single switch. Keep this object in sync with the skill tokens — they are
the source of truth.

## Where things live

| Need                              | Look at                                                              |
| --------------------------------- | ------------------------------------------------------------------- |
| Full intent, voice, motion detail | [`.agents/skills/honeydo-design/readme.md`](.agents/skills/honeydo-design/readme.md) |
| Canonical token values            | [`.agents/skills/honeydo-design/tokens/`](.agents/skills/honeydo-design/tokens/)     |
| Component specs & props           | [`.agents/skills/honeydo-design/components/`](.agents/skills/honeydo-design/components/) |
| Screen reference / click-through  | [`.agents/skills/honeydo-design/ui_kits/honeydo/`](.agents/skills/honeydo-design/ui_kits/honeydo/) |
| Brand/platform specimens          | [`.agents/skills/honeydo-design/guidelines/`](.agents/skills/honeydo-design/guidelines/) |
