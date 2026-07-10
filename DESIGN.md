---
name: Edda
description: A self-hosted-library e-reader — the scriptorium, rendered as software.
colors:
  terre-verte: '#55614c'
  terre-verte-deep: '#454f3c'
  terre-verte-wash: '#e4e7d8'
  sap-green: '#546b3b'
  orpiment: '#7a5f24'
  vellum: '#f0eee9'
  laid-paper: '#f7f5f0'
  blind-tool: '#e6e1d6'
  oak-gall: '#2c2a25'
  silverpoint: '#6b6252'
  ruling: '#ddd7c9'
  chalk: '#f5f2ec'
typography:
  display:
    fontFamily: 'Newsreader, ui-serif, Georgia, Times New Roman, serif'
    fontSize: '2.25rem'
    fontWeight: 400
    lineHeight: 1.11
    letterSpacing: 'normal'
  headline:
    fontFamily: 'Newsreader, ui-serif, Georgia, Times New Roman, serif'
    fontSize: '1.5rem'
    fontWeight: 400
    lineHeight: 1.25
  title:
    fontFamily: 'Newsreader, ui-serif, Georgia, Times New Roman, serif'
    fontSize: '1.125rem'
    fontWeight: 400
    lineHeight: 1.375
  body:
    fontFamily: 'Literata, ui-serif, Georgia, Times New Roman, serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: 'Literata, ui-serif, Georgia, Times New Roman, serif'
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.43
  mono:
    fontFamily: 'ui-monospace, SF Mono, JetBrains Mono, Menlo, Consolas, monospace'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: '0.05em'
rounded:
  control: '0.625rem'
  card: '0.875rem'
  pill: '9999px'
spacing:
  hair: '0.125rem'
  xs: '0.25rem'
  sm: '0.5rem'
  md: '0.75rem'
  lg: '1rem'
  xl: '1.25rem'
components:
  button-primary:
    backgroundColor: '{colors.terre-verte}'
    textColor: '{colors.chalk}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0.625rem 1rem'
  button-primary-hover:
    backgroundColor: '{colors.terre-verte-deep}'
    textColor: '{colors.chalk}'
  button-secondary:
    backgroundColor: '{colors.laid-paper}'
    textColor: '{colors.oak-gall}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0.625rem 1rem'
  button-secondary-hover:
    backgroundColor: '{colors.blind-tool}'
    textColor: '{colors.oak-gall}'
  chip-neutral:
    backgroundColor: '{colors.laid-paper}'
    textColor: '{colors.oak-gall}'
    rounded: '{rounded.pill}'
    padding: '0.25rem 0.75rem'
  chip-capability:
    backgroundColor: '{colors.terre-verte-wash}'
    textColor: '{colors.terre-verte}'
    rounded: '{rounded.pill}'
    padding: '0.25rem 0.75rem'
  card:
    backgroundColor: '{colors.laid-paper}'
    rounded: '{rounded.card}'
    padding: '1.25rem'
  input:
    backgroundColor: '{colors.laid-paper}'
    textColor: '{colors.oak-gall}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0.625rem 0.75rem'
  sidebar-link-active:
    backgroundColor: '{colors.terre-verte-wash}'
    textColor: '{colors.terre-verte}'
    rounded: '{rounded.control}'
    padding: '0.5rem 0.75rem'
  toggle-on:
    backgroundColor: '{colors.terre-verte}'
    rounded: '{rounded.pill}'
    height: '1.5rem'
    width: '2.5rem'
  toggle-off:
    backgroundColor: '{colors.blind-tool}'
    rounded: '{rounded.pill}'
    height: '1.5rem'
    width: '2.5rem'
---

# Design System: Edda

## 1. Overview

**Creative North Star: "The Scriptorium"**

A scriptorium is the room where manuscripts are kept, copied, and repaired. It is warm, quiet, and
full of paper — and it is also a workshop, with sharp tools laid out in plain sight because the person
in the room knows how to use them. Edda is that room. The user self-hosts their own library; they own
the server, the files, and the shelf. The interface owes them both the warmth of the reading room and
the honesty of the workbench.

This resolves the system's central tension. Everything a reader touches is soft: warm parchment
surfaces, serif type, generous spacing, corners rounded like a well-handled board cover. Everything a
*keeper* touches is exact: monospace for ids, versions, byte counts and server descriptors; a status
dot that says **Reachable** and means it; capabilities named rather than silently degraded. Neither
half apologizes for the other. Warmth is not a disguise for the machinery, and legible machinery is
not a license for visual neglect.

The name is not incidental. The *Edda* is a collection of medieval Icelandic manuscripts, and the
palette is that fact made literal: iron-gall ink on vellum, ruled with faint lines, with a single
green-earth pigment for anything the user can act on. This system explicitly rejects the **Kindle /
Kobo web reader** — store-first chrome that competes with the book — and the **Calibre desktop UI** —
engineer-first density with no visual care. The second is the more dangerous of the two, because the
audience overlaps almost exactly.

**Key Characteristics:**

- Warm, near-neutral parchment ground; depth by lightness, never by shadow.
- Exactly one action color. Its rarity is what makes it read as "you may act here."
- Two serifs on a display/text contrast axis, plus monospace as a third, strictly semantic voice.
- Flat at rest. Hairline rules do the work borders normally ask shadows to do.
- Fixed rem type scale — this is product UI, not a landing page. Nothing is fluid.
- The book is never styled by this system. Chrome stops at the iframe boundary.

## 2. Colors

Iron-gall ink on vellum: a warm, low-chroma ground carrying one green-earth accent, with two further
pigments reserved strictly for machine state.

### Primary

- **Terre Verte** (`#55614c`): the green-earth pigment; the system's only action color. Primary
  buttons, the active nav row's text, capability chips, the progress-bar fill, focus rings, the toggle
  in its "on" state. If an element is Terre Verte, the user can act on it or has selected it.
- **Terre Verte Deep** (`#454f3c`): hover and active state on primary buttons. Nowhere else.
- **Terre Verte Wash** (`#e4e7d8`): the pale wash behind the active sidebar row, the capability chip,
  and the wordmark's leaf medallion. This is the accent at 10% strength, used to indicate "current"
  without shouting.

### Secondary

Semantic only. These two pigments encode machine state and are **never** decorative.

- **Sap Green** (`#546b3b`): a source is reachable. The connected status dot, and the word
  "Reachable" as text. Deliberately darkened from the maket's `#6f8f4f` so it clears WCAG AA as text.
- **Orpiment** (`#7a5f24`): a capability is absent but the system still works — e.g. a connector with
  no progress API. Warning, not error. Darkened from `#b08f4e` for the same reason.

### Neutral

The tonal stack. Read it as three sheets: one pressed in, one flat, one raised.

- **Vellum** (`#f0eee9`): the page itself. App and body background, and the sidebar's ground.
- **Laid Paper** (`#f7f5f0`): a sheet laid on top. Cards, panels, inputs, the raised segment of a
  segmented control. **Lighter** than the canvas.
- **Blind Tool** (`#e6e1d6`): an impression pressed into the board — blind tooling, in bookbinding, is
  an image stamped without ink or gold. Wells and troughs: progress-bar tracks, the segmented
  control's container, the off-state toggle, badge pills. **Darker** than the canvas.
- **Oak Gall** (`#2c2a25`): the ink. Headings, body copy, anything the user reads.
- **Silverpoint** (`#6b6252`): the faint drawing medium. Secondary text, descriptors, inactive
  segments, mono metadata. Darkened from the maket's `#857c6b` to clear AA at 4.5:1.
- **Ruling** (`#ddd7c9`): the scribe's guide lines. Every hairline border and divider, always 1px.
- **Chalk** (`#f5f2ec`): pounce, for preparing vellum. Text and icons on top of Terre Verte.

### Reading Themes

These are **not** part of this system's token layer, and are listed here only so the boundary is
visible. The four reading themes live in `src/platform/web/reader-frame/reader-css.ts` and are applied
as readium-css inside the origin-isolated reader frame. Body-text contrast, measured:

| Theme       | Background | Foreground | Ratio   | AA   | AAA      |
| ----------- | ---------- | ---------- | ------- | ---- | -------- |
| `light`     | `#faf8f3`  | `#2b2a26`  | 13.53:1 | pass | pass     |
| `sepia`     | `#f1e7d0`  | `#5b4a36`  | 6.89:1  | pass | **fail** |
| `dark`      | `#1b1714`  | `#e7e1d4`  | 13.67:1 | pass | pass     |
| `parchment` | `#d9d0b0`  | `#3a3424`  | 8.02:1  | pass | pass     |

PRODUCT.md commits to AAA (7:1) for reading text. `sepia` is the outstanding gap.

### Named Rules

**The One Green Rule.** Terre Verte is the only accent in the system. It marks action, selection, and
focus — never decoration, never a mood, never a section divider. A screen with two accent colors has
one too many. If a new state needs a color, the answer is almost always a neutral plus a shape change.

**The Two Palettes Rule.** Chrome colors live in `src/app/styles/main.css` under `@theme`. Book colors
live in readium-css inside the reader frame. **These never cross.** No Tailwind class may style the
page content, and no reading-theme value may leak into the app shell. The origin isolation of the
reader frame is a security boundary; treat the palette split as its visual counterpart.

**The Darker-Means-Deeper Rule.** Elevation in this system is lightness. Raised surfaces go *lighter*
(Laid Paper); recessed wells go *darker* (Blind Tool). Never invert this to make something "pop."

## 3. Typography

**Display Font:** Newsreader (with `ui-serif`, Georgia, Times New Roman)
**Body Font:** Literata (with `ui-serif`, Georgia, Times New Roman)
**Label / Mono Font:** the system monospace stack (`ui-mono`, SF Mono, JetBrains Mono, Menlo)

**Character:** Two serifs, paired on the display/text contrast axis rather than the usual serif/sans
one. Newsreader is high-contrast and comparatively delicate; Literata was drawn for screen text —
sturdier, larger x-height, low stroke contrast. At their intended sizes they read as two clearly
different voices. Monospace is the third voice and it means one thing only: this is a fact the machine
produced.

Both faces are self-hosted via `@fontsource`. `font-size-adjust: from-font` keeps the fallback
metrically close during `font-display: swap`, so nothing reflows on font load.

### Hierarchy

- **Display** (Newsreader, 400, `2.25rem` / `3rem` at `md` on book titles, line-height 1.11): page
  titles — "Your library", "Downloads", "Extensions" — and the book title on its detail page. Also the
  reading-progress percentage, where the figure is the subject of the card.
- **Headline** (Newsreader, 400, `1.5rem`, line-height 1.25): the Edda wordmark, and the book title
  overlaid on cover art.
- **Title** (Newsreader, 400, `1.125rem`, line-height 1.375): card and panel headings.
- **Body** (Literata, 400, `0.875rem`, line-height 1.43): the workhorse. Nearly all UI text. Prose
  caps at 65–75ch; tabular and compact UI may run denser.
- **Label** (Literata, 500, `0.875rem`): buttons, active nav rows, anything that must read as
  actionable. Weight, not color, carries the emphasis.
- **Mono** (system monospace, 400, `0.75rem`, letter-spacing `0.05em`): ids, versions, byte sizes,
  page counts, server descriptors, badge counts, and the uppercase section labels in the sidebar.

### Named Rules

**The Monospace-Means-Machine Rule.** Monospace is reserved for facts the machine produced and the
user may need to read character by character: `komga · localhost:25600`, `v1.2.0`, `432 pages`,
`14.2 MB`. It is never used for prose, never for emphasis, and never for style. This rule is the
"legible machinery" principle expressed in type — it is how the interface tells a self-hoster which
strings are load-bearing.

**The 14px Test.** Newsreader and Literata are both serifs, which is exactly the pairing hazard the
rules warn about. They are distinguishable because they operate at different sizes. Newsreader below
`1rem` loses its contrast and starts to look like a slightly wrong Literata. **Audit test:** set a
Newsreader string at `0.875rem` next to a Literata one; if you cannot tell them apart at a glance, the
pairing has failed and that string should be Literata.

**The Fixed-Scale Rule.** This is product UI. The scale is fixed rem, never `clamp()`. A heading that
shrinks inside a sidebar looks broken, not responsive. Book titles step `text-4xl → md:text-5xl` at a
breakpoint, and that is the only size change in the system.

## 4. Elevation

This system is tonal-first and very nearly flat. Depth is carried by the three-step lightness stack
(Blind Tool → Vellum → Laid Paper) and by 1px Ruling hairlines. Shadow exists, but it is ambient
rather than structural: its only job is to keep a card's bottom edge from dissolving into the canvas.
Notably, `--shadow-card` is tinted with the ink color (`rgb(44 42 37)`) rather than pure black, so the
shadow stays inside the warm palette instead of graying it.

### Shadow Vocabulary

- **Card** (`box-shadow: 0 1px 2px rgb(44 42 37 / 0.04), 0 1px 3px rgb(44 42 37 / 0.05)`): the
  default resting shadow on cards and panels. 4% and 5% alpha — a whisper.
- **Riser** (Tailwind `shadow-sm`): the raised segment of a segmented control, and the toggle's thumb.
  Just enough to say "this one is on top of the track."
- **Hover** (Tailwind `shadow-md`, on `interactive` cards only): the single place shadow responds to
  state, via `transition-shadow`.

### Named Rules

**The Whisper Rule.** If you notice the shadow before you notice the border, the shadow is too dark.
The hairline is the primary separator; the shadow only softens the edge beneath it.

**The Flat-At-Rest Rule.** Surfaces are flat until the user interacts. No element is born elevated.
Shadow is a response — hover, press — not a decoration applied at render.

## 5. Components

Bookbinder's hardware: crafted, exact, unshowy. Everything is soft-cornered and calm at rest, gives
one small honest response when pressed, and never decorates. Two radii do all the work — `0.625rem`
for controls, `0.875rem` for cards — plus a pill for anything that encodes a value rather than an
action.

Motion throughout is 150–250ms, conveys state, and nothing else. There are no orchestrated page-load
sequences; the app loads into a task. `prefers-reduced-motion: reduce` collapses every transition to
`0.001ms` globally — this is both an accessibility requirement and the determinism guarantee that lets
the visual-regression suite capture without racing an animation.

### Buttons

- **Shape:** softly rounded (`0.625rem`), `0.625rem 1rem` padding, label type at weight 500.
- **Primary:** Terre Verte ground, Chalk text. The single forest action — "Continue reading",
  "Connect".
- **Secondary:** Laid Paper ground, Oak Gall text, 1px Ruling border. "Cancel", "Offline", an
  available extension's "Install".
- **Hover:** primary darkens to Terre Verte Deep; secondary fills to Blind Tool.
- **Press:** `active:scale-[0.97]`. This is the whole tactile vocabulary of the system.
- **Disabled:** 50% opacity, `not-allowed` cursor, and the press transform is suppressed — a disabled
  control must not appear to respond.

### Chips

- **Neutral:** Laid Paper ground, 1px Ruling border, pill radius. Metadata: "432 pages".
- **Capability:** Terre Verte Wash ground, Terre Verte text, transparent border, and a leading check
  glyph. Declares a capability the connector actually has: "Progress sync".
- Chips never carry actions. A chip that can be clicked is a button wearing the wrong clothes.

### Cards / Containers

- **Corner Style:** `0.875rem` — a full step softer than controls, so a card never reads as pressable.
- **Background:** Laid Paper on Vellum.
- **Border:** 1px Ruling, always. The border is the separator; see The Whisper Rule.
- **Shadow Strategy:** resting Card shadow; `interactive` cards transition to Hover shadow.
- **Internal Padding:** `1.25rem`.
- Cards are never nested. If content inside a card needs a container, it needs a rule or a well, not
  another card.

### Inputs / Fields

- **Style:** Laid Paper ground, 1px Ruling border, `0.625rem` radius, `0.625rem 0.75rem` padding.
- **Focus:** border shifts to Terre Verte and a `2px` ring at 40% Terre Verte appears. Composite
  fields use `focus-within` so the whole row lights up, not just the bare input.
- **Valid / reachable:** the probe row's border turns Sap Green the moment the server answers. State
  is shown on the field itself, not in a toast.

### Navigation

- **Desktop:** a `16rem` sidebar on Vellum with a right Ruling border. Rows are `0.5rem 0.75rem`,
  `0.625rem` radius. Active is Terre Verte Wash + Terre Verte + weight 500 **and** `aria-current="page"`;
  inactive is Oak Gall, hovering to a Laid Paper fill. Badge counts sit right-aligned in a Blind Tool
  pill, in mono.
- **Section labels:** uppercase mono at `0.75rem`, `0.05em` tracking, Silverpoint. These are nav
  region labels — "Sources", "Settings" — and are the one sanctioned uppercase-tracked form in the
  system.
- **Mobile:** below `md`, the sidebar becomes `hidden` and a bottom tab bar takes over
  (Home / Library / Search / Settings). Responsive behavior here is structural, never fluid type.

### Signature: the Cover Overlay

Book covers are arbitrary user artwork, so they are the one surface where the token system cannot
reach. Titles are set over the cover in Newsreader at `white/90`, with mono metadata at `white/70` and
a `white/15` scrim chip for the page count. **This is the only sanctioned use of a non-token color in
the app**, and it exists because no palette token can guarantee contrast against an unknown image. Any
new use of `text-white` outside a cover overlay is drift.

## 6. Do's and Don'ts

### Do:

- **Do** define every chrome color in `src/app/styles/main.css` under `@theme`, and reference it by
  token. The file's own comment is the law: "Every chrome color lives here; components reference
  tokens (no ad-hoc hex elsewhere)."
- **Do** reserve Terre Verte (`#55614c`) for action, selection, and focus. See The One Green Rule.
- **Do** use monospace for machine facts — ids, versions, byte sizes, page counts — and nothing else.
- **Do** go *lighter* to raise a surface (`#f7f5f0`) and *darker* to recess one (`#e6e1d6`).
- **Do** separate surfaces with a 1px Ruling (`#ddd7c9`) hairline first; reach for shadow only to
  soften the edge underneath.
- **Do** keep the type scale fixed in rem. Product UI, not a landing page.
- **Do** give every interactive control all seven states: default, hover, focus, active, disabled,
  loading, error. Shipping four of seven is shipping a broken control.
- **Do** let the global `:where(...):focus-visible` ring stand. It is written at zero specificity so a
  component may *restyle* the indicator but can never accidentally remove it.
- **Do** teach the interface in empty states. "No sources yet" should explain how to add one.

### Don't:

- **Don't** build anything that resembles the **Kindle / Kobo web reader**: no store surfaces, no
  upsells, no recommendations, no chrome competing with the book. The user already owns every book
  here.
- **Don't** slide toward the **Calibre desktop UI**: no cramped toolbars, no dialogs stacked on
  dialogs, no surfacing every option at equal weight. A technical user still deserves a considered
  interface. Legible machinery is not a license for visual neglect.
- **Don't** let chrome styling cross into the book. No Tailwind class may style page content; the
  reader frame is a separate origin and a separate palette. See The Two Palettes Rule.
- **Don't** define a reading-theme color in more than one place. The four themes are currently
  duplicated between `reader-frame/reader-css.ts` and `components/reader/DisplayPanel.vue` — a swatch
  that disagrees with the CSS it previews is a lie. Extract a shared constant.
- **Don't** introduce a second accent color. If a new state needs distinguishing, change the shape,
  the weight, or the neutral — not the hue.
- **Don't** use `text-white`, `bg-white`, or a raw hex anywhere except a cover overlay, where the
  background is unknowable artwork.
- **Don't** use `clamp()` for UI type. A heading that resizes inside a sidebar looks broken.
- **Don't** set Newsreader below `1rem` in body contexts. Apply The 14px Test.
- **Don't** nest cards. Ever.
- **Don't** animate anything that doesn't convey state. No orchestrated entrances; the app loads into
  a task.
- **Don't** reach for a modal first. The capability-missing sheet earns its modal because it
  interrupts a genuinely blocked action; almost nothing else does.
- **Don't** ship a shadow you can see before you see the border.
