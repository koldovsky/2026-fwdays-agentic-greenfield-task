# DESIGN.md — Kolo360

Design decisions and visual identity. Pairs with `docs/requirements.md` (the PRD —
what the product does) and `docs/product-brief.md` (the narrative). This file is the
source of truth for **how it looks and reads**.

> Full design system lives in [`docs/KoloDesign/`](docs/KoloDesign/): tokens,
> component references, foundation guidelines, UI-kit mockups, and the
> `kolo360-design` skill. When a detail isn't captured here, defer to
> `docs/KoloDesign/readme.md` and `docs/KoloDesign/uploads/kolo360-design-brief.md`.

## The feel in one line

Quiet, warm, paper-like neutrals + one deep evergreen + an editorial serif reserved
for human-written report prose. Dense, hairline-separated UI; no shadows except on
overlays; no gradients; no emoji.

## How it's wired into the app

- **Tokens** — `app/tokens.css` is the live, in-app copy of `docs/KoloDesign/tokens/*`
  (colors, type scale, spacing, radii, motion, layout widths). Imported by
  `app/globals.css`. Curated tokens are re-exposed as Tailwind utilities via
  `@theme inline` (e.g. `bg-paper`, `text-ink`, `text-accent`, `font-sans`); the rest
  are used directly as CSS variables (`var(--radius-md)`, `var(--font-serif)`).
- **Fonts** — loaded with `next/font/google` in `app/layout.tsx` (self-hosted, no
  external request), Latin + Cyrillic, exposed as `--font-inter` / `--font-source-serif`
  / `--font-jetbrains-mono`, which `app/tokens.css` maps onto `--font-ui` / `--font-serif`
  / `--font-mono`.
- **Components** — `docs/KoloDesign/components/**` are reference implementations
  (Button, Card, Chip, StatusBadge, Input, Select, Switch, Textarea, ScaleOption,
  ScaleDots, ProgressBar, NavItem, Dialog, Toast). Port them into real app components
  as capabilities are built; match the reference, don't reinvent.

## Tokens (summary)

- **Color** — paper `#FAF9F6` (app bg), surface `#FFFFFF` (cards), ink `#1A1A18`
  (text), ink-muted `#5B5A55`. Warm-grey border ramp `#F2F1EE → #E8E7E3 → #E0DED8 →
  #C9C7BF`. Exactly **one** accent: evergreen `#2E5E4E` (primary buttons, selection,
  active nav, progress fill, focus ring); green text on tints `#1E6B41`. Status is
  low-chroma: amber, brick red, neutral — always with a text label, never color alone.
  **No gradients. No bluish-purple.**
- **Type** — Inter for all UI/data (11–17px, weights 400/500; 600 only for the
  `Kolo360` wordmark). Source Serif 4 only for report headings (20px) and report body
  (17px/1.75). JetBrains Mono for IDs, reviewer codes, contacts, scale values (10–12px).
- **Spacing & shape** — ~4px base; radius 8px (cards/inputs/buttons), 6px (chips/small
  controls); full circles for dots/avatars. **Borders, not shadows** — 1px hairlines;
  selection promotes to a 2px green border + green tint. Shadows only on dialogs/toasts.
- **Motion** — 120ms ease-out on hover/state; 250–300ms on progress and section
  highlight. No bounce, no decorative animation. Respect `prefers-reduced-motion`.
- **Layout widths** — 640 (respondent form / dialog), 760 (forms / editor), 1100
  (lists / detail / report).

## Hard rules ("no clownery")

- No gradients, glassmorphism, glow, or neon.
- **No emoji anywhere in the UI**; icons only — Lucide, outline, 1.8px stroke,
  `currentColor`, used sparingly.
- No illustration mascots, confetti, or celebratory animation.
- Status communicated with muted tint + text label, never color alone.
- **Sentence case everywhere** (buttons, headings, dialog titles); the only ALL-CAPS
  is the small letter-spaced eyebrow/label treatment. Wordmark is `Kolo360`.
- **No dark mode in v1** — design light-only, but keep tokens semantic so a dark theme
  can be added later without touching components.
- Calm, professional, confidential tone; **no exclamation marks**, no marketing
  adjectives (the product handles sensitive people-data).

## App shells

1. **HR workspace** — left sidebar (220px): `Kolo360` wordmark, nav (Cycles,
   Employees, Templates), user at the bottom. Content area with a sticky page header
   (title + right-aligned primary action). Compact density.
2. **Respondent view** (`/respond/[token]`) — no sidebar, no nav. Single centered
   column, max 640px, mobile-first. Header shows only: who is assessed, assessment
   type, deadline, and a one-line confidentiality note. Reads like a focused document,
   not an admin tool.

## The signature screen — the report

Everywhere else the app is a compact, neutral SaaS tool. The **report** (approval gate)
is treated like a typeset document: serif body, generous measure (~68ch), evidence as
restrained pull-quotes with a thin accent left-rule, flags in the right margin like an
editor's marginalia. Spend boldness here; keep every other screen disciplined and quiet.

## Quality floor

- Responsive: HR workspace down to 1024px (tables scroll below); respondent view down
  to 360px.
- Keyboard: full tab order, Enter submits, Esc closes drawers/dialogs; a visible 2px
  accent focus ring on every interactive element (NFR-A11Y-01).
- WCAG AA contrast (NFR-A11Y-02).
- Every screen designs its empty, loading, and error states — none default to a blank
  area (FR-SHELL-03).
