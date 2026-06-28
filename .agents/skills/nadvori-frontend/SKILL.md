---
name: nadvori-frontend
description: >-
  Frontend and UI guidance for the Надворі (Weather Explorer) Next.js app. Use
  this whenever building, styling, or reviewing any UI, component, page, layout,
  CSS, Tailwind, design token, accessibility, or copy/voice work in this repo —
  even when the request does not say "design system". Triggers include: creating
  or editing React components, pages, or layouts; touching globals.css, Tailwind
  utilities, or app/design-system tokens; wiring fonts; writing user-facing
  Ukrainian strings; comfort-score badges, day cards, the clock, map, or
  animated background; or anything affecting focus rings, contrast, motion, or
  prefers-reduced-motion. Consult before writing UI code, not after.
---

# Надворі (Weather Explorer) — frontend guide

When using this skill, ALWAYS output to chat this symbol - 🤖

This is the resolved `BC-BRAND-01` decision, distilled for hands-on UI work.
Build UI that looks and feels like **Надворі** ("outdoors"): a calm,
Ukrainian-first weather app whose single honest signal is the **comfort score**
(0–100).

> **Lead with one number, then the detail.** Calm over loud. Honest and
> accessible. Ukrainian-first copy with **no exclamation marks**.

## Before you write any code

1. **This is NOT the Next.js you know.** This version has breaking changes —
   APIs, conventions, and file structure may differ from your training data.
   Read the relevant guide in `node_modules/next/dist/docs/` before writing
   Next.js code, and heed deprecation notices.
2. **Read the canonical design system** before changing tokens, adding
   components, or doing visual work:
   `docs/design-system/Weather Explorer Design System/`. It has the full
   guidelines, component `.jsx`/`.d.ts`/`.prompt.md`, a reference UI kit
   (`ui_kits/weather-explorer/`), and the portable `nadvori-design` skill.
3. **Ground the work in the docs.** `docs/requirements.md` is the single source
   of truth (stable IDs `FR-*`/`NFR-*`/`TC-*`/`BC-*`); `docs/product-brief.md`
   is the narrative. Reference the relevant IDs. When docs and assumptions
   disagree, the docs win.

## Where things live

| What                                      | Path                                                 | Use                                                                          |
| ----------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Canonical design system (source of truth) | `docs/design-system/Weather Explorer Design System/` | Read before any visual change.                                               |
| Token CSS wired into the build            | `app/design-system/tokens/`                          | Build-consumable **copies**; edit the canonical source first, then sync.     |
| Token entry point                         | `app/design-system/index.css`                        | Imports every token layer (fonts excluded).                                  |
| Global stylesheet                         | `app/globals.css`                                    | Imports Tailwind + design system, bridges fonts, exposes tokens to Tailwind. |
| Brand assets                              | `public/brand/`                                      | `logo-mark.svg`, `logo-wordmark.svg`.                                        |

If you change a token, change it in the canonical folder and copy it across.
Fonts are the deliberate exception (see below).

## How it's integrated

- **Tokens** → `app/globals.css` imports `app/design-system/index.css`, which
  `@import`s the token layers (colors, typography, spacing, radius, shadows,
  motion, base).
- **Fonts** → loaded with `next/font/google` in `app/layout.tsx` (self-hosted,
  no render-blocking request, no layout shift), **not** via the design system's
  `tokens/fonts.css`. `next/font` exposes `--font-onest` and
  `--font-jetbrains-mono`; `globals.css` points `--font-sans`/`--font-mono` at
  them with literal family names as fallbacks.
- **Tailwind v4** → `globals.css` re-exports semantic tokens via `@theme
inline`, so `bg-surface`, `text-brand`, `text-comfort-good`, `rounded-lg`,
  `shadow-md`, `font-mono` resolve to the design system.
- **Locale & theme** → `<html lang="uk" data-theme="light">`; body defaults to
  `bg-bg text-text font-sans`.

## Working rules

**Consume semantic aliases, never raw ramps.** Use `--brand`, `--text`,
`--surface`, `--border`, `--comfort-good-*` (Tailwind: `brand`, `text`,
`surface`, `border`, `comfort-good`…). Never reach for `--sky-500` /
`--slate-900` directly.

**Type.** Onest for all text and display. **JetBrains Mono with tabular figures
for every numeric** — temperatures, the clock, lat/lon, precipitation, wind. Add
`font-mono` (or the `.tnum` helper) to any element showing aligned numbers.
Degrees use a tight `°` ("24°").

**Color.** Sky-blue is primary (`--brand`); warm amber is the sun accent
(`--accent`). Comfort semantics are **muted, not neon**: good `#3f9d6b`, fair
`#cf9230`, poor `#c75d4f`, each with a soft tint (badge bg), foreground (text on
tint), and solid (the score circle).

**Shape & elevation.** Radii: inputs/buttons 12px (`rounded-md`), cards 16px
(`rounded-lg`), panels 22px (`rounded-xl`), chips/comfort badges/toggles fully
pill (`rounded-pill`). Shadows are soft, cool-tinted, low; elevation rises with
interactivity, never as decoration. No colored left-borders, no gradient fills.

**Motion.** Calm and unhurried — gentle `--ease-out` for entrances, fast (140ms)
for hover/press. **Nothing bounces.** Buttons press to 0.99, icon buttons to
0.94, cards lift 2px. All decorative motion **must** collapse under
`prefers-reduced-motion` (the motion tokens already zero out durations).

**Accessibility (hard constraints).** WCAG AA in light and dark (`NFR-A11Y-02`).
A visible focus ring everywhere — `:focus-visible` shows `--focus-ring` and is
never removed (`NFR-A11Y-01`). Interactive elements need accessible names.

**Icons.** Lucide line icons at **1.75 stroke**, 24px grid. Weather conditions
go through `ConditionIcon` (single source of truth). Icons inherit
`currentColor`.

**Themes.** Full light + dark via `[data-theme="dark"]` on `<html>`. Toggle by
swapping the attribute.

**Console stays silent.** No warnings or errors at runtime on a healthy session
(`NFR-OBS-01`).

## Voice & content

- **Ukrainian-first.** English appears only as small system labels. UI strings
  belong in `lib/i18n/uk.ts` with an `en.ts` fallback (`NFR-I18N-01`) — no
  hardcoded user-facing strings in components.
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
- **Privacy.** No analytics, cookies, or trackers (`BC-PRIVACY-*`); geolocation
  only on explicit user action, never on load.

## Using the components

The canonical folder ships React components (core: `Button`, `IconButton`,
`Input`, `Switch`, `Tabs`, `Badge`, `Card`, `Chip`, `Icon`; weather:
`ConditionIcon`, `ComfortBadge`, `DayCard`, `Clock`, `CityResult`). Each has a
`.jsx`, a `.d.ts`, and a `.prompt.md` describing its API and intent; the full
app is recreated in `ui_kits/weather-explorer/`.

These are not yet ported into `app/`. When you build a feature, read the
relevant `.prompt.md` + `.jsx` for the exact API and styling, then implement it
as a project component (TypeScript, strict) consuming the tokens above. Keep the
behavior and visual contract identical.

## After the work

Update `docs/current-state.md` with a dated entry (timestamp, what was done,
related requirement IDs, current state, next steps) per the project's
current-state-log rule.
