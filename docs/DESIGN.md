# Cadence — DESIGN (visual / UI)

> How Cadence looks and feels: identity, design tokens, layout, screens, components, motion, and
> accessibility. This is the source of visual truth for frontend agents. Technical/engineering
> design lives in [`docs/architecture.md`](architecture.md); numbered behavior in
> [`docs/requirements.md`](requirements.md).
> Captured from the owner's existing prototype design system and reconciled with the ratified
> requirements. Status: DRAFT — refine during the UI slice. **Two ratified deviations from the
> prototype are pending final color/type confirmation (section 2).**

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

## 2. Ratified deviations from the prototype (NFR-DES-01)

The prototype's bones stay; its two strongest "generic AI" tells are replaced. **These are the
values to confirm/adjust first during the UI slice** — everything else in this doc is settled.

**Decision (proposed, confirm during UI slice):**
- **UI typeface: Geist -> `Space Grotesk`.** Geist is the most recognizable default tell; Space
  Grotesk keeps the technical-but-distinct feel with real character. Mono stays `Roboto Mono`
  (not a tell). *Alternative: `Archivo` or `Instrument Sans`.*
- **Accent: lime `#84cc16` -> `#7c6cf0` (violet).** The lime is the second tell and it collided
  with the green heatmap, making everything read monochrome-AI. A violet accent **decouples brand
  from data**: the heatmap keeps its green activity scale, the accent (buttons, focus, active
  states, dots) becomes violet. *Alternative: cyan `#22d3ee`.*

Everything else — the dark base, radial-gradient wash, film grain, card system, mono labels,
custom heatmap, segmented controls — is kept as-is.

## 3. Design tokens

Values below reflect the prototype with the two deviations applied (changed rows marked *).

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

/* Brand accent (decoupled from data) */
--accent:         #7c6cf0      /* * was #84cc16 */
--accent-soft:    #9a8cf5      /* * was #a3e635  (big timer glow, emphasis) */
--accent-glow:    #7c6cf033    /* * selection, shadows */

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
--font-ui:   'Space Grotesk', -apple-system, sans-serif   /* * was Geist */
--font-mono: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace

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
| Big timer / duration | mono | 30-56 / 300, tabular, `--accent-soft` + glow | the hero number |
| Wordmark | mono | 14, two lines (thin secondary over bold primary) | header + auth |

## 5. Layout system

- **Header** (sticky, `z-20`): translucent `--bg-base`/0.72 with `backdrop-blur(14px) saturate`,
  bottom hairline. Left: two-line mono **wordmark** + nav (Timer / Stats / Categories, active =
  subtle filled pill). Right: **streak badge** (mono pill, pulsing `--accent` dot) + **user menu**
  (monogram avatar in `--accent`, dropdown: account, sign out in `--danger`).
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
  custom dropdown to pick/create a category) sits above the **big mono timer**. Controls below,
  state-driven:
  - *Idle:* single **Start** (primary).
  - *Running:* timer counts up with a soft pulse; **Pause** + **Stop** (Stop opens the save modal).
  - *Paused:* timer frozen, dimmed; **Continue** + **Stop**.
  - **Discard** is a quiet ghost/text control; it always opens a **confirm dialog** before
    discarding (FR-TIMER-04, A-8).
  - Keyboard: Space start/pause, S stop+save, Esc discard-with-confirm (FR-TIMER-05).
  - The active session is server-authoritative and mirrored live (5 s) from web and extension
    (FR-TIMER-06) — if it started elsewhere, this card shows it already running.
- **Heatmap card:** the signature custom **SVG heatmap**, centered, with a **segmented period
  control** in the card header (Week / Month / Quarter / 6M / Year). Month = single dense row
  (22 px cells); longer periods = calendar (Mon..Sun rows). Green `--hm-*` scale; hover tooltip
  shows the date + tracked duration; a click opens that day's sessions in the side panel.

### 7.3 Stats — FR-STATS-*, FR-METR-*
- **Summary tiles:** a row of mono-labelled tiles — Today / This Week / This Month / All-time /
  **Streak** — big tabular numbers (FR-STATS-01).
- **Metric score cards (NEW, FR-STATS-05):** one card per metric M1-M5. Each shows the metric's
  **micro-label**, its **value** (big mono), a **zone dot/bar** in `--zone-good/warn/bad`, and the
  **baseline delta** as `+N` / `-N` with an up/down SVG arrow (FR-METR-06). While the baseline is
  still forming (<7 days), the zone renders as a neutral **"building — day N/30"** chip instead of
  a color (architecture.md 3.8). A one-line plain caption states what the score means.
- **Charts:** bar-by-day, donut-by-category, per-category line (FR-STATS-02..04). Chart.js styled
  to tokens: no gridline clutter, rounded bars, mono tabular tooltips (`--bg-elevated`/0.95),
  category colors from the user's palette. Empty state: a centered "Start your first session…".
- **Session log:** the list of saved sessions with manual **add / edit / delete** (FR-SESS-03..06);
  a day's sessions also open in the **side panel** from the heatmap. Manual add/edit forms include
  an **"add pause"** control (each pause with start/end, A-6). Every discard/edit/delete raises the
  bottom-left **undo notification** (section 8, FR-NOTIF-01).

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
- **Custom dropdown (`cdd`):** the ONLY select control (no native `<select>`) — pill trigger (dot +
  label + chevron), fixed-position elevated panel, a check on the selected option, an inline
  "+ new" option, hover/highlight states, keyboard nav. Drives category pickers in the timer, save
  modal, manual-add, and edit.
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
(pencil), trash, chevrons, arrow-up/down (deltas), category dot, coach (chat/spark), Google and
GitHub brand glyphs. **No emoji, ever** (NFR-DES-01). Category swatches and metric zone dots are
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
