# Cadence — DESIGN (visual / UI)

> How Cadence looks and feels: identity, design tokens, layout, screens, components, motion, and
> accessibility. This is the source of visual truth for frontend agents. Technical/engineering
> design lives in [`docs/architecture.md`](architecture.md); numbered behavior in
> [`docs/requirements.md`](requirements.md).
> Captured from the owner's existing prototype design system and reconciled with the ratified
> requirements. Status: **BUILT** — the web UI is implemented against the owner's "Skills-Kiln"
> (delibra) design system; tokens below mirror the shipped `frontend/src/delibra.css` `:root`.
> **The two ratified prototype deviations in section 2 were consciously reversed** at the owner's
> direction, restoring the prototype's original lime + Geist look.

## 1. Identity and principles

- **Instrument panel, not a dashboard.** Dark, calm, precise. The UI recedes; the data and the
  timer are the subject. Think cockpit gauge, not marketing site.
- **Simple surface, deep interior.** The default view is nearly empty — a timer and a heatmap.
  Depth (scores, baselines, coaching) is one layer in, never crowding the first screen. This is the
  product's core tension made visual (NFR-UX-01).
- **Monospace as signal.** Numbers, labels, timestamps, and metadata are monospace with tabular
  figures — it reads as measurement. Prose and headings are the UI sans.
- **Restraint in motion.** Short, eased transitions (rise-on-enter, thumb slides); nothing bounces
  gratuitously. Fully honors `prefers-reduced-motion` (accessibility below).
- **SVG only, never emoji.** Every icon is an inline SVG (stroke 1.5, `currentColor`). Emoji are
  forbidden anywhere in the UI and in coach output (NFR-DES-01).

## 2. Prototype fidelity — NFR-DES-01

The build follows the owner's "Skills-Kiln" (delibra) prototype **as-is**. Two anti-"generic-AI"
deviations were previously ratified here and are now **consciously reversed** at the owner's
direction — the shipped UI restores the prototype's originals:

- **UI typeface: `Geist`** (not Space Grotesk), with `Roboto Mono` for numbers/labels.
- **Accent: lime `#84cc16`** (not violet `#7c6cf0`) for buttons, focus, active states, dots, and
  the running-timer glow.

> **Superseded deviation (kept for the record).** The earlier decision swapped the UI face to
> `Space Grotesk` and the accent to violet `#7c6cf0`, reasoning that Geist is a recognizable
> default "tell" and that lime sits close to the green heatmap (risking a monochrome-AI read).
> After reviewing the built delibra look, the owner chose to keep **lime + Geist**; the
> accent-vs-heatmap proximity is an accepted trade-off. If the "generic-AI" angle matters for a
> given audience, re-open this and square it with [`positioning.md`](positioning.md).

Everything else — the dark base, radial-gradient wash, film grain, card system, mono labels,
custom heatmap, segmented controls — is kept as in the prototype.

## 3. Design tokens

Values below are the **shipped** tokens (`frontend/src/delibra.css` `:root`) — the prototype's
originals (the section-2 deviations were reversed).

```
/* Surfaces */
--bg-base:        #0a0a0c      /* page */
--bg-elevated:    #131316      /* cards, panels, popovers */
--bg-sunken:      #08080a      /* inputs, pills, insets */
--border-subtle:  #1f1f24
--border-strong:  #2a2a30

/* Text */
--text-primary:   #ededf0
--text-secondary: #8b8b94
--text-tertiary:  #5a5a63

/* Brand accent (prototype lime; intentionally close to the heatmap green — see 2) */
--accent:         #84cc16      /* lime */
--accent-soft:    #a3e635      /* brighter lime — hovers, running-timer glow */
--accent-glow:    #84cc1633    /* selection, shadows */

/* Metric zones (score cards) + status */
--zone-good:      #34d399      /* green — at/above baseline */
--zone-warn:      #f59e0b      /* yellow — 5-20% below */
--zone-bad:       #ef4444      /* red — >20% below */
--warning:        #f59e0b
--danger:         #ef4444

/* Heatmap activity scale (KEPT green — this is data, not brand) */
--hm-0: #16161a  --hm-1: #1e3a14  --hm-2: #3d6b1f
--hm-3: #65a83a  --hm-4: #84cc16  --hm-5: #a3e635

/* Type */
--font-ui:   'Geist', -apple-system, sans-serif                       /* wght 400/500/600 */
--font-mono: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace  /* wght 200-500 */

/* Shape + motion */
--radius-card: 16px    --radius-btn: 10px
--ease-out:       cubic-bezier(0.2, 0, 0, 1)
--ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1)
```

**Page background** (kept): `--bg-base` under two faint radial gradients (warm top-left
`#1a1812`, cool bottom-right `#0c1418`) plus a fixed **film-grain** overlay at opacity 0.04,
`mix-blend-mode: overlay`. This is a signature texture — keep it. `color-scheme: dark`; custom thin
scrollbars; `::selection` uses `--accent-glow`.

## 4. Typography scale

| Role | Font | Size / weight | Notes |
| --- | --- | --- | --- |
| Page title | UI | 20 / 600, tracking -0.01em | screen headers |
| Card title | UI | 15-16 / 600 | |
| Body | UI | 13-14 / 400 | |
| **Micro-label** | mono | 11 / 500, tracking 0.14em, UPPERCASE, secondary | the signature label style over cards, tiles, sections |
| Metadata / time | mono | 11-12, tabular-nums | timestamps, counts, durations |
| Big timer / duration | mono | `clamp(72px, 14vw, 132px)` / **200**, tabular, `--text-primary` with a lime glow pulse while running; colons dimmed to `--text-tertiary` | the hero number |
| Wordmark | mono | 16 / 600, **single line `cadence`** in the header; larger + letter-spaced on auth | header + auth |

## 5. Layout system

- **Header** (sticky, `z-20`): translucent `--bg-base`/0.72 with `backdrop-blur(14px) saturate`,
  bottom hairline. Left: single-line mono **wordmark** (`cadence`) + nav (Timer / Stats /
  Categories, active = subtle filled pill). Right: **streak badge** (mono pill, pulsing `--accent`
  dot) + **user menu** (monogram avatar in `--accent`, dropdown: sign out in `--danger`).
- **Main:** `max-width: 1100px`, centered, padding `40px 28px 80px`.
- **View rhythm:** each screen is a vertical stack (`gap: 24px`) of cards; children **rise in**
  (translateY 8px -> 0, fade) with a 40/100/160/220 ms stagger.
- **Breakpoints:** single-column mobile; grids collapse to 1 column at **760px** (categories,
  stat grids). Tablet/desktop widen the same cards — no separate layouts.

## 6. Motion

Eases: `--ease-out` for entrances and state changes, `--ease-overshoot` for playful confirmations
(toast in). Named animations kept: `rise` (view children), `fade-in` (header), `dd-in` (popovers),
`panel-in` (drawers), `modal-in` (dialogs), `pulse-dot` (streak/live dots), segmented `seg-thumb`
slide (260 ms). **Reduced motion:** `@media (prefers-reduced-motion: reduce)` drops all animation
and transition durations to ~0 and stops the running-timer pulse (accessibility requirement).

## 7. Screens

### 7.1 Auth (login / register)
Centered `auth-card` (`max-width: 360px`, elevated, deep shadow). Large centered wordmark; title +
one-line subtitle; email + password fields; primary submit. Below: an **`OR` mono divider** then
**Google** and **GitHub** OAuth buttons (outlined, brand SVG glyph + label). Footer: switch between
sign in / register (FR-AUTH-01..05). No email verification / reset in v1 (A-5) — the form reflects
that (no "forgot password" link).

### 7.2 Timer (home) — FR-TIMER-*, FR-HEAT-*
- **Timer card** (centered, tall): a **category pill** (dot in category color + name, opens the
  custom dropdown to pick a category — the dropdown carries an inline **"+ New category"** row that
  creates one on the spot) sits above the **big mono timer** (thin weight-200 digits up to 132 px,
  `--text-primary` with a lime glow pulse while running, dimmed colons). Controls below,
  state-driven:
  - *Idle:* single **Start** (primary).
  - *Running:* timer counts up with a soft pulse; **Pause** + **Stop** (Stop opens the save modal).
  - *Paused:* timer frozen, dimmed; **Continue** + **Stop**.
  - **Discard** is a quiet ghost/text control; it always opens a **confirm dialog** before
    discarding (FR-TIMER-04, A-8).
  - Keyboard: Space start/pause, S stop+save, Esc discard-with-confirm (FR-TIMER-05); the shortcut
    hint under the controls renders the keys as `<kbd>` keycaps.
  - The active session is server-authoritative (FR-TIMER-06): on load the card **resumes** any
    running/paused timer via `GET /api/timer/active`, so a reload or a second tab shows it already
    running and controllable. (The ~5 s cross-device live poll from web + extension is a later
    slice.)
- **Heatmap card:** the signature custom **SVG heatmap** (GitHub-style: weeks as columns, Mon..Sun
  as rows, with month + weekday labels), centered, with a **segmented period control** in the card
  header (**Month / Quarter / 6 Months / Year**). Green `--hm-*` scale (level 0-4); a floating
  tooltip on hover shows the date + tracked duration. (Click-to-open a day's sessions in a side
  panel is a later slice.)

### 7.3 Stats — FR-STATS-*, FR-METR-*
- **Summary tiles:** a row of mono-labelled tiles — Today / This Week / This Month / All-time /
  **Streak** — big tabular numbers (FR-STATS-01).
- **Metric score cards (NEW, FR-STATS-05):** one card per metric M1-M5. Each shows the metric's
  **micro-label**, its **value** (big mono, rounded to ≤2 decimals), a **zone dot/bar** in
  `--zone-good/warn/bad`, and the
  **baseline delta** as `+N` / `-N` with an up/down SVG arrow (FR-METR-06). While the baseline is
  still forming (<7 days), the zone renders as a neutral **"building — day N/30"** chip instead of
  a color (architecture.md 3.8). A one-line plain caption states what the score means.
- **Charts:** bar-by-day, donut-by-category, per-category line (FR-STATS-02..04). Chart.js styled
  to tokens: no gridline clutter, rounded bars, mono tabular tooltips (`--bg-elevated`/0.95),
  category colors from the user's palette. Empty state: a centered "Start your first session…".
- **Session log** (lives on **Stats only** — deliberately off the timer home): the list of saved
  sessions with manual **add / edit / delete** (FR-SESS-03..06). Manual add/edit forms use the
  custom **date-time picker** (section 8) for start/end and each pause boundary, plus an
  **"add pause"** control (A-6). Every discard/edit/delete raises the bottom-left **undo
  notification** (section 8, FR-NOTIF-01).

### 7.4 Categories — FR-CAT-*
Responsive **3-col grid** of **category cards**: a color **swatch header** (80 px, category color
with a soft bottom gradient), name, description, and mono stats (total time, session count).
Hover reveals **edit / delete** actions (delete = archive, so historical data is preserved —
architecture.md 7). "+ New category" uses a native color input (the one intentional native control)
plus name + description.

### 7.5 AI coach drawer (NEW) — FR-SHELL-02, FR-COACH-*
- **Floating coach button:** bottom-**right** on every screen, circular, `--accent`, SVG glyph.
- **Drawer:** slides from the right (reuse the side-panel pattern, `panel-in`, ~400 px). Top: the
  latest **insight card** — 2-4 observations + 1-2 recommendations rendered as compact rows, each
  with subtle chips referencing which metric it draws on; a quiet state when the coach has nothing
  to say ("nothing notable this week"). Below: a **chat thread** (user right, coach left) with an
  input at the bottom. Coach replies in the user's language (en/uk); UI chrome stays English
  (FR-COACH-06). Numbers render exactly as provided by the snapshot (grounding, FR-COACH-02). No
  emoji. Error/fallback state on a failed model call (FR-COACH-07).

## 8. Component library

- **Buttons:** primary (accent fill), secondary (elevated + border), ghost (border only), text
  (used for destructive-quiet, hovers to `--danger`), `sm`, and `icon-btn` (28 px, SVG). Radius
  `--radius-btn`.
- **Inputs:** `--bg-sunken`, subtle border, focus = `--accent` border + `--bg-elevated`, caret
  `--accent`. `time`/`date` are mono tabular. **Labels** are mono uppercase micro-labels.
- **Custom dropdown (`cdd`):** the primary select control — pill trigger (dot + label + chevron),
  an elevated panel that drops directly under the trigger, a check on the selected option, an
  inline **"+ New category"** creator (colour + name — creates on the spot and selects it), and
  close-on-outside-click. Drives the category picker on the timer and in the manual add/edit forms.
  (The save-session modal keeps a compact styled native `<select>`.)
- **Date-time picker (`dtf`):** a custom calendar + time popover that replaces the native
  `datetime-local` (whose OS popup can't be themed). Trigger shows the chosen moment + a calendar
  glyph; the panel has a **Mon-first month grid** (prev/next month, today ring, selected day filled
  `--accent`), a mono `HH:MM` time field, and **Now** / **Done**. Same `YYYY-MM-DDTHH:mm` value
  contract as the native control. Used for every start/end/pause boundary in the add/edit forms.
- **Segmented control (`seg-control`):** pill track with an animated `seg-thumb`; mono uppercase
  labels. Used for all period switches (heatmap, stats). Small variant available.
- **Cards:** `--bg-elevated`, `--border-subtle`, `--radius-card`, 32 px padding, inset top
  highlight + soft drop shadow; `card-header` (title + `card-meta` mono) + body.
- **Score card:** as in 7.3 — the one genuinely new card type; the zone color is the only strong
  color on an otherwise calm card.
- **Modals (`dialog`):** elevated, `--border-strong`, backdrop blur; the save modal features a
  large mono **duration** readout in `--accent-soft` with glow; `modal-in` scale. Used for save,
  manual add, edit, and the **discard confirm** (FR-TIMER-04).
- **Side panel:** right drawer (400 px) for a day's sessions and (reused) the coach.
- **Undo notification (FR-NOTIF-01):** appears **bottom-left**, elevated with a left accent border,
  for **5 seconds** after a discard / edit / delete; shows what changed + an **Undo** button;
  auto-dismiss commits. (Distinct position from ordinary toasts, which sit bottom-right.)
- **Toast:** transient bottom-right confirmations (`toast-in` overshoot); `.error` variant uses a
  `--danger` left border.

## 9. Iconography

Inline SVG set, stroke 1.5, `currentColor`, ~16-20 px: play, pause, stop, discard (x), plus, edit
(pencil), trash, calendar, check, chevrons, arrow-up/down (deltas), category dot, coach
(chat/spark), Google and GitHub brand glyphs. **No emoji, ever** (NFR-DES-01). Category swatches and metric zone dots are
solid color chips, not icons.

## 10. States (every data surface defines all four)

- **Empty:** calm centered copy inviting the first action ("Start your first session…"), never a
  blank card. Metrics on empty history show zeros/`building`, not errors (E-1).
- **Loading:** skeletons matching the final footprint (cards keep their height); no layout shift.
- **Error:** inline, contained, calm — a card-level message with a retry where relevant; never a
  full-screen error or a silent blank. Coach failures show the fallback card (FR-COACH-07, E-8).
- **Live:** the running timer pulses; a small live dot marks the active session; cross-device
  updates arrive within ~5 s (architecture.md 5).

## 11. Accessibility

- **Focus:** `:focus-visible` = 2 px `--accent` outline, 2 px offset; all interactive elements
  keyboard-reachable, custom dropdown/segmented control included.
- **Contrast:** text tokens meet AA on the dark surfaces; zone colors are paired with an
  arrow/label (not color alone) so deltas are not color-only signals.
- **Reduced motion:** honored globally (section 6).
- **Keyboard:** timer shortcuts Space / S / Esc (FR-TIMER-05); Esc also closes dialogs/drawers.
- **Semantics:** dialogs use native `<dialog>`; the custom dropdown exposes `aria-expanded` /
  option roles; the live timer is announced politely.

## 12. Requirement mapping

| Area | Requirements |
| --- | --- |
| Three routes + coach button/drawer | FR-SHELL-01, FR-SHELL-02, FR-COACH-* |
| Timer card + states + shortcuts + confirm-discard | FR-TIMER-01..06, A-8 |
| Heatmap + period control | FR-HEAT-01, FR-HEAT-02 |
| Summary tiles + score cards + charts + session log | FR-STATS-01..05, FR-METR-*, FR-SESS-03..06 |
| Manual add/edit with pauses | FR-SESS-03, FR-SESS-04, A-6 |
| Category grid + archive-on-delete | FR-CAT-01..03 |
| Coach drawer, grounding, language, no emoji | FR-COACH-01..07, NFR-DES-01 |
| Undo notification (bottom-left, 5 s) | FR-NOTIF-01 |
| Auth + OAuth screens | FR-AUTH-01..05 |
| Live / reduced-motion / focus / keyboard | NFR-DATA-01, NFR-DES-01, NFR-UX-01 |
