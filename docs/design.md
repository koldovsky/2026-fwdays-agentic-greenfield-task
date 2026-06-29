# Handoff: Поливайко — Plant Watering App Design System

## Overview
**Поливайко** is a small web/mobile app that reminds casual plant owners (people with a few houseplants) to water their plants. This package contains the design system — color palette, typography, iconography, base controls, plant cards — and a working home-screen prototype showing the plant list with watering reminders.

The intended feel is **organic, soft and natural**: rounded corners, warm paper backgrounds (never sterile white), botanical line icons, a living-green primary with earthy brown accents and a near-black graphite for text.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing the intended look and behavior. They are **not production code to copy directly**.

The HTML uses an internal "Design Component" runtime (`support.js`, `<x-dc>`, `<sc-for>`, `<sc-if>`). **Ignore that runtime.** Your task is to **recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.) using its established patterns, component library and conventions. If no codebase exists yet, choose the most appropriate framework (e.g. React + your CSS solution of choice) and implement the designs there.

Read the `.dc.html` as a visual spec: every value (color, size, radius, spacing, font) is inlined and listed below in **Design Tokens**.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii and interactions are specified. Recreate the UI pixel-faithfully using the codebase's existing primitives, then map the literal values below onto your design tokens / theme.

---

## Design Tokens

### Colors
Greens
- `forest` **#2F6B3F** — primary (buttons, active states, healthy status, progress fill)
- `pine` **#213D2A** — deep green (hero bg, summary card, dark surfaces)
- `sage` **#7E9B6E** — secondary green
- `moss` **#A7BE92** — light green tint
- `mist` **#DDE7CF** — soft surface / chips / soft buttons

Earth
- `bark` **#5A4232** — dark brown (section sub-labels, dark text on warm surfaces)
- `clay` **#A9744E** — terracotta accent (numbering, "soon" status, secondary CTA)
- `sand` **#E6D7BE** — warm tan surface

Neutrals & status
- `paper` **#F4F1E8** — app background
- `cloud` **#FBFAF5** — card surface
- `ink` **#1B1E18** — primary text / near-black
- `stone` **#6E7268** — muted/secondary text
- `border` **#E2DDCF** — hairline borders/dividers
- text-disabled / placeholder **#9A9588**, tab-inactive **#B6B1A4**
- Status — healthy: dot **#2F6B3F** on chip **#DDE7CF** (text #213D2A); soon: dot **#A9744E** on chip **#F6E7D6** (text #5A4232); overdue/needs-water: dot **#B5462E** on chip **#F3DAD0** (text #7A2E1C); danger button **#B5462E** (hover **#9D3B25**).
- Selection highlight: bg **#C7D9B0**, text **#1B1E18**.

Striped photo placeholders use `repeating-linear-gradient(45deg, <tintA>, <tintA> 12px, <tintB> 12px, <tintB> 24px)` — green tints (#DDE7CF / #D2DEC0) or sand tints (#E6D7BE / #DCCBAF).

### Typography
Google Fonts: `Quicksand` (400–700), `Mulish` (400–700, italic 400), `Spline Sans Mono` (400–500).
- **Quicksand** — headings/display. Weights 600/700, letter-spacing −0.01em to −0.02em on large sizes.
- **Mulish** — body text and inputs. 400 body, 600 emphasis. Latin name labels are Mulish italic.
- **Spline Sans Mono** — small meta labels, hex codes, section numbers, data badges.

Scale (px): Display 64 · H1 46 (screen H1 28) · H2 34 · H3 20–22 · Lead 20 · Body 16–18 · Small 14 · Caption 12–13. Line-height ~1.55–1.65 for body, ~1.02–1.05 for display.

### Spacing & shape
- Radii: inputs/segments **13px**; soft buttons **14px**; cards **18–22px**; summary card **22px**; pills/toggles **999px**; phone screen **37px**, phone body **48px**.
- Section vertical rhythm: ~72px top padding, 24px bottom, separated by 1px `#E2DDCF` divider. Content max-width **1080px**, horizontal padding 56px.
- Buttons: text 13px/24px padding (`padding:13px 24px`); icon buttons 48×48; in-card full-width buttons `padding:12px`.
- Shadows: avoid harsh shadows. Only the phone mockup uses one: `0 30px 60px -20px rgba(33,61,42,.45)`.

---

## Components

### Buttons
- **Primary** — bg `forest`, text `paper`, radius 14, Quicksand 600 15px; hover bg #275834. Optional leading droplet icon.
- **Secondary (outline)** — transparent bg, 1.5px `forest` border, `forest` text; hover bg `mist`.
- **Soft** — bg `mist`, text `pine`; hover #CBDCB8.
- **Ghost** — transparent, `stone` text; hover bg #EEE9DC.
- **Danger** — bg `#B5462E`, text `paper`; hover #9D3B25 (used for overdue "Полити зараз").
- **Icon button** — 48×48, radius 14. Filled (clay bg + paper plus-icon) or outline (cloud bg, 1.5px border; hover border `forest`).

### Inputs
- Text input: bg `paper`, 1.5px `border`, radius 13, padding `12px 15px`, Mulish 15px. Focus: border `forest`, bg `cloud`. Label: 13px/600 `bark`, 7px below.
- Search input: same + leading 18px magnifier icon (`stone`), left padding 42px.
- **Segmented control** (frequency picker): track bg `paper`, 1.5px border, radius 13, 4px padding; segments flex:1, radius 9, 8px padding; selected = `forest` bg + `paper` 700 text; idle = #9A9588 600 text.

### Toggles / selection
- **Switch**: 52×30 track radius 999; on = `forest`, off = `#D8D2C2`; knob 24×24 `cloud`, 3px inset.
- **Checkbox**: 24×24 radius 8; checked = `forest` bg + paper check (stroke-width 3); unchecked = 2px `#D8D2C2` border on `paper`.

### Progress / meters
- Track: 12px tall, bg `#E6E1D3`, radius 999. Fill radius 999 — `forest` for soil moisture (positive), `clay` for "time until next watering" (countdown). Label row above: left `stone` 13px, right bold colored value.
- **Slider**: 6px track, `forest` fill, 22×22 knob = `cloud` with 3px `forest` border; mono value label to the right.

### Iconography
Line icons, **stroke 1.8, round caps/joins, no fill**, single color (`forest` or `bark`); 34px in the swatch grid, 15–26px inline. A filled variant exists (light `moss` fill + `forest` stroke). Set: water-drop (the brand glyph, also used for the "water" action), leaf, sprout, sun, pot, reminder/bell. Tab bar reuses leaf (home), bell (reminders), calendar, profile, plus the center plus-FAB.

### Plant card
Radius 22, bg `cloud`, 1px `border`, overflow hidden.
- **Image area** 150px tall — striped placeholder; bottom-left mono filename chip on translucent cloud bg (radius 7); top-right **status pill** (dot + label, radius 999, colors per status above).
- **Body** padding `18px`: title Quicksand 700 20px; latin name Mulish italic 13px `#9A9588`; status line (15px droplet icon + 13px text — `stone` normally, `#B5462E`/600 when overdue); full-width action button (soft for healthy "Доглянути", primary for "Полити", danger for "Полити зараз").

---

## Screens / Views

### Home — "Доброго ранку"
**Purpose:** glance at what needs watering today and water it in one tap.

**Layout** (phone, 380px device / 37px-radius screen, 780px tall, vertical flex):
1. **Status bar** — `9:41` left, `Поливайко` wordmark right, 13px/700 ink.
2. **Header** — date line (`Понеділок, 30 червня`, 14px `stone`) + H1 `Доброго ранку 🌿` (Quicksand 700 28px); right: 44px circle avatar, `mist` bg, `forest` 700 initial.
3. **Summary card** — `pine` bg, radius 22, padding ~20px, paper text, with a decorative `forest` circle (opacity .5) bleeding off bottom-right. Label "Сьогодні полити" + big count (Quicksand 700 40px) + "рослини".
4. **List** — scrollable. Uppercase Quicksand 600 15px `bark` section header "Потребують поливу", then reminder rows.
5. **Tab bar** — `cloud` bg, 1px top border, 5 slots; center is a 48px `forest` FAB (radius 16, paper plus). Active tab = `forest`, inactive = `#B6B1A4`.

**Reminder row:** `cloud` card, 1px border, radius 20, padding 14, flex gap 14 — 54px striped thumb (radius 15) · name (Quicksand 700 17px) + due line (13px, color by urgency) · trailing 46px square action. Pending = `forest` droplet button; done = `mist` square with `forest` check.

**Empty / all-done state:** centered leaf icon + "Усі политі! 🌱" (Quicksand 700 18px `pine`) + reassurance line.

---

## Interactions & Behavior
- **Water action:** tapping a row's droplet button (or a card's water button) marks that plant watered → the today-count decrements, the row's trailing control swaps to a `mist`+check confirmation, and the due text becomes "Полито щойно ✓" in `forest`. When count hits 0, the list is replaced by the all-done empty state.
- Hover states defined for every interactive element (see Components).
- Focus state on inputs: border → `forest`, bg → `cloud`.
- Transitions: keep them gentle/short (≈150–200ms ease) for color/background changes; no harsh motion. Animate count changes and the row swap subtly if the framework allows.

## State Management
- `wateredById: Record<string, boolean>` (or a `Set` of watered plant ids) — the only mutable state in the prototype.
- Derived: `reminders` (each plant + `done`/`pending`, urgency-colored due text), `todoCount = plants not yet watered today`, `allDone = todoCount === 0`.
- In production, back this with the plant model: `{ id, name, latinName, photoUrl, intervalDays, lastWateredAt, status }`. Status (healthy / soon / overdue) is derived from `lastWateredAt + intervalDays` vs. now. "Watered today" should reset on a daily boundary; persist `lastWateredAt`.

## Assets
- **Fonts:** Quicksand, Mulish, Spline Sans Mono (Google Fonts).
- **Icons:** simple botanical line icons — recreate with the codebase's icon system (e.g. lucide/heroicons) or the inline SVGs in the HTML (stroke 1.8, round caps). The water-drop glyph is the brand mark; keep it consistent.
- **Photos:** none included — all plant images are striped placeholders. Replace with real plant photos (rounded corners, object-fit: cover).
- No third-party brand assets are used.

## Files
- `Plant Care Design System.dc.html` — the full design system + home-screen prototype (open in a browser to view). All literal style values live here.
- `support.js` — the prototype runtime only; **do not port it**.
- `design.md` — this document (self-sufficient spec).
