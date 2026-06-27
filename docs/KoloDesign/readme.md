# Kolo360 Design System

Kolo360 is an internal **360° feedback & performance-review tool** for HR managers. An HR
manager runs *cycles* (a review of one subject), invites *reviewers* over web or Telegram,
and once enough responses arrive, an AI drafts a structured **report** that the manager
edits and approves. Respondents fill a focused, mobile-friendly form.

This design system was extracted from the working Kolo360 prototype (`Kolo360.dc.html` in
the source project). It captures the product's calm, editorial, data-dense aesthetic so new
screens and assets stay consistent.

> **Source of truth:** the original interactive prototype, `Kolo360.dc.html`. When in doubt,
> open it and match it.

---

## The feel in one line
Quiet, warm, paper-like neutrals + one deep evergreen + an editorial serif reserved for
human-written report prose. Dense, hairline-separated UI; no shadows except on overlays;
no gradients; no emoji.

---

## CONTENT FUNDAMENTALS

**Voice.** Plain, calm, professional, slightly formal. The product handles sensitive
people-data, so copy is reassuring and precise — never playful, never hypey. No exclamation
marks, no marketing adjectives.

**Casing.** Sentence case everywhere — buttons (`New cycle`, `Launch cycle`, `Approve
report`), headings (`Growth areas`), dialog titles (`Approve report?`). The only ALL-CAPS is
the small letter-spaced **eyebrow/label** treatment (`SUBJECT`, `REVIEWERS`, `CALIBRATION
FLAGS`, table column heads). The wordmark is `Kolo360`.

**Person.** Addresses the respondent as **you** ("Your answers are included in the report").
Refers to the subject in third person by name ("Marina demonstrates…"). HR-facing chrome is
impersonal and instructional.

**Status words** are lower-case, single words: `collecting`, `done`, `draft`, `sent`,
`responded`, `approved`, `declined`. Flag types are short noun phrases: `contradiction`,
`possible bias`, `low coverage`.

**Microcopy leans toward reassurance about confidentiality:** "Visible to HR only, in
aggregated form. Not anonymous, but confidential.", "Approving locks the report. The raw
dialogs stay private to HR." State this plainly, once, where the user acts.

**Numbers & data** are terse: `5/6 responded`, `4.1 / 5`, `13 days left`, `Jun 25`. Always
tabular-aligned. Dates are `MMM D`.

**No emoji. No icons inside sentences. No filler.** Every label earns its place.

---

## VISUAL FOUNDATIONS

**Color.** A warm greyscale built on paper `#FAF9F6` (app bg) and white `#FFFFFF` (cards),
with text in near-black `#1A1A18` and muted `#5B5A55`. Borders are a graded warm-grey ramp
(`#F2F1EE → #E8E7E3 → #E0DED8 → #C9C7BF`). Exactly **one** accent: deep evergreen `#2E5E4E`,
used for primary buttons, selection, active nav, progress fill, and the report's quote rule.
Green text on light tints uses `#1E6B41`. Status is low-chroma: amber (`#FEF9EC`/`#92690E`),
red (`#FDEEED`/`#8B2E28`), neutral (`#F2F2F1`). **No gradients anywhere. No bluish-purple.**

**Type.** Three families, strictly zoned:
- **Inter** — all UI chrome and data. Runs small & dense (11–17px). Weights 400/500; 600 only
  for the `Kolo360` wordmark. No 700 bold in UI.
- **Source Serif 4** — *only* report section headings (20px) and report body prose (17px,
  1.75 line-height). The serif is the signal that text was written by/for a human.
- **JetBrains Mono** — IDs, reviewer codes (`R2`), contacts (`@handle`), scale values, channel
  chips. 10–12px.

**Spacing & density.** ~4px base. UI is dense (4–16px gaps, 7–9px control padding); the report
is airy (24–44px). Content widths are fixed: 640 (form/dialog), 760 (new cycle / editor),
1100 (lists/detail/report).

**Borders, not shadows.** Surfaces separate by **1px hairline borders**, never shadow.
Selection promotes a border to **2px** and swaps the fill to a green tint. Shadows appear
only on floating layers: dialogs `0 8px 32px rgba(0,0,0,.12)`, toast `0 4px 16px
rgba(0,0,0,.18)`.

**Corner radii.** Two values do almost everything: **6px** (chips, small controls, table
action buttons) and **8px** (cards, inputs, buttons, dialogs). Dots and avatars are full
circles. Nothing is sharper than 6px; nothing is more rounded than a pill.

**Cards** = white fill + `#E8E7E3` 1px border + 8px radius, no shadow. Hover on clickable
rows lightens to `#F7F6F2`. Selected cards: 2px green border + `#F5FAF8` fill.

**Backgrounds** are flat paper. No imagery, no texture, no pattern, no full-bleed photos.
The product is text & data; whitespace does the work.

**Motion.** Quick and functional. 120ms ease-out on hover/state changes; 250–300ms on
progress bars and the report's section-highlight. A toast slides up 8px + fades over 150ms.
**No bounce, no spring, no decorative animation.**

**Hover / press.** Hover = subtle fill shift (rows → `#F7F6F2`) or border-color change.
Primary buttons darken slightly on hover. No scale/transform on press, no glow.

**Scale dots.** Scores render as a row of five 10px dots — filled `#1A1A18`, empty `#DEDCD5`
— next to a `4.1 / 5` mono-ish numeral. This is the signature data viz; bars are reserved for
progress/coverage.

**Progress bars** are 4px tall, `#E0DED8` track, `#2E5E4E` fill, 2px radius.

---

## ICONOGRAPHY

Icons are **Lucide** (1.8px stroke, round caps/joins, `currentColor`), used sparingly — only
in the sidebar nav (clock for Cycles, file for Templates), the templates "Methodologies"
lock, the respondent success check, and small remove (×) affordances. They are inline SVG
strokes inheriting text color, **never filled**, never multicolor. Sizes 13–22px.

No icon font, no emoji, no unicode-glyph icons (except the small `▸/▾` chevrons and `←/→`
arrows used as plain text in buttons). When you need an icon, pull it from Lucide
(https://lucide.dev, CDN-available) and match the 1.8px stroke. Do **not** hand-draw new
SVGs or introduce a second icon family.

There is no logo asset beyond the `Kolo360` wordmark set in Inter 600.

---

## INDEX / MANIFEST

Root:
- `styles.css` — global entry; `@import`s all tokens. Consumers link this.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skill wrapper.

Tokens (`tokens/`):
- `fonts.css` — Inter / Source Serif 4 / JetBrains Mono (Google Fonts).
- `colors.css` — neutrals, brand green, status, semantic aliases.
- `typography.css` — families, scale, weights, line-heights.
- `spacing.css` — spacing scale, radii, borders, elevation, motion, layout widths.

Foundation cards (`guidelines/`) — specimen cards shown in the Design System tab
(Type, Colors, Spacing, Brand groups).

Components (`components/`) — reusable React primitives: Button, Badge, StatusBadge, Card,
Input, Select, Switch, ScaleDots, ProgressBar, Chip, NavItem.

UI kit (`ui_kits/kolo360/`) — full-screen recreations: cycles list, cycle detail, report,
respondent form.
