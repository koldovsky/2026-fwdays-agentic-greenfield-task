# DESIGN.md — Надворі (Weather Explorer)

This is the design decision for the project (it resolves `BC-BRAND-01`,
previously "pending DESIGN.md"). It tells you how to build UI that looks and
feels like **Надворі** ("outdoors") — a calm, Ukrainian-first weather app whose
single honest signal is the **comfort score** (0–100).

> **Lead with one number, then the detail.** Calm over loud. Honest &
> accessible. Ukrainian-first copy with **no exclamation marks**.

---

## Where things live

| What                                          | Path                                                 | Use                                                                                                                                                       |
| --------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical design system** (source of truth) | `docs/design-system/Weather Explorer Design System/` | Read before changing tokens, adding components, or doing visual work. Has full guidelines, component `.jsx`/`.d.ts`/`.prompt.md`, and a reference UI kit. |
| **Token CSS, wired into the app**             | `app/design-system/tokens/`                          | Compiled into the build. These are copies; edit the canonical source first, then sync.                                                                    |
| **Token entry point**                         | `app/design-system/index.css`                        | Imports every token layer (fonts excluded — see below).                                                                                                   |
| **Global stylesheet**                         | `app/globals.css`                                    | Imports Tailwind + the design system, bridges fonts, and exposes tokens to Tailwind utilities.                                                            |
| **Brand assets**                              | `public/brand/`                                      | `logo-mark.svg` (sun-over-horizon), `logo-wordmark.svg`.                                                                                                  |
| **Portable skill**                            | `docs/design-system/.../SKILL.md` (`nadvori-design`) | Invoke to generate on-brand artifacts or production code.                                                                                                 |

The canonical folder is the source of truth. `app/design-system/tokens/` is a
build-consumable copy — **if you change a token, change it in the canonical
folder and copy it across** (fonts are the deliberate exception).

---

## How it's integrated

- **Tokens** → `app/globals.css` imports `app/design-system/index.css`, which
  `@import`s the token layers (colors, typography, spacing, radius, shadows,
  motion, base).
- **Fonts** → loaded with `next/font/google` in `app/layout.tsx` (self-hosted,
  no render-blocking Google request, no layout shift), **not** via the design
  system's `tokens/fonts.css`. `next/font` exposes `--font-onest` and
  `--font-jetbrains-mono`; `globals.css` points `--font-sans` / `--font-mono`
  at them with the literal family names as fallbacks.
- **Tailwind v4** → `globals.css` re-exports the semantic tokens through
  `@theme inline`, so utilities like `bg-surface`, `text-brand`,
  `text-comfort-good`, `rounded-lg`, `shadow-md`, `font-mono` resolve to the
  design system.
- **Locale & theme** → `<html lang="uk" data-theme="light">`. The body defaults
  to `bg-bg text-text font-sans`.

---

## Working rules

**Always consume semantic aliases, never raw ramps.** Use `--brand`, `--text`,
`--surface`, `--border`, `--comfort-good-*` (or their Tailwind equivalents
`brand`, `text`, `surface`, `border`, `comfort-good`…). Do not reach for
`--sky-500` / `--slate-900` directly.

**Type.** Onest for all text and display; **JetBrains Mono with tabular figures
for every numeric** — temperatures, the clock, lat/lon, precipitation, wind.
Add `font-mono` (or the `.tnum` helper) to any element showing aligned numbers.
Degrees use a tight `°` ("24°").

**Color.** Sky-blue is primary (`--brand`), warm amber is the sun accent
(`--accent`). Comfort semantics are **muted, not neon**: good `#3f9d6b`, fair
`#cf9230`, poor `#c75d4f`, each with a soft tint (badge bg), foreground (text on
tint), and solid (the score circle).

**Shape & elevation.** Radii: inputs/buttons 12px (`rounded-md`), cards 16px
(`rounded-lg`), panels 22px (`rounded-xl`), chips/comfort badges/toggles fully
pill (`rounded-pill`). Shadows are soft, cool-tinted, low; elevation rises with
interactivity (hover/popover/hero), never as decoration. No colored
left-borders, no gradient fills.

**Motion.** Calm and unhurried — gentle `--ease-out` for entrances, fast (140ms)
for hover/press. **Nothing bounces.** Buttons press to 0.99, icon buttons to
0.94, cards lift 2px. All decorative motion **must** collapse under
`prefers-reduced-motion` (the motion tokens already zero out durations).

**Accessibility (hard constraints).** WCAG AA in light + dark
(`NFR-A11Y-02`); a visible focus ring everywhere — `:focus-visible` shows
`--focus-ring` and it is never removed (`NFR-A11Y-01`).

**Icons.** Lucide line icons at **1.75 stroke**, 24px grid. Weather conditions
go through `ConditionIcon` (single source of truth). Icons inherit
`currentColor`.

**Themes.** Full light + dark via `[data-theme="dark"]` on `<html>`. Toggle by
swapping the attribute; no toggle UI is wired up yet.

---

## Voice & content

- **Ukrainian-first.** English appears only as small system labels (e.g. the
  "WEATHER EXPLORER" lockup subtitle). UI strings belong in `lib/i18n/uk.ts`
  with an `en.ts` fallback.
- **No exclamation marks anywhere** (`BC-BRAND-01`). Calm, practical, never
  hyped — reads like a level-headed friend.
- **One number, then the detail.** Lead with the decision, follow with evidence:
  _"82 — тепло, без дощу, легкий вітер."_
- **Honest, never overstated.** Comfort rationale is a single Ukrainian
  sentence, ≤ 80 characters, no emojis. When it's poor, say so kindly.
- **Casing.** Sentence case for readable text; UPPERCASE only for tiny mono
  micro-labels with wide tracking ("СХІД · ЗАХІД", "ВИХІДНІ").
- **Emoji.** Effectively none. The one sanctioned exception is the country flag
  emoji in a city search result (`FR-SEARCH-02`).
- **Privacy.** No analytics, cookies, or trackers (`BC-PRIVACY-*`).

---

## Using the components

The canonical folder ships React components (core: `Button`, `IconButton`,
`Input`, `Switch`, `Tabs`, `Badge`, `Card`, `Chip`, `Icon`; weather:
`ConditionIcon`, `ComfortBadge`, `DayCard`, `Clock`, `CityResult`). Each has a
`.jsx`, a `.d.ts`, and a `.prompt.md` describing its API and intent, and the
full app is recreated in `ui_kits/weather-explorer/`.

These are not yet ported into `app/`. When you build a feature, read the
relevant `.prompt.md` + `.jsx` for the exact API and styling, then implement it
as a project component (TypeScript, strict) consuming the tokens above. Keep the
behavior and visual contract identical.
