# Kolo360 — UI design brief / prompt

> Feed this whole document to the agent together with SPEC.md. It defines the
> visual direction, design tokens, and a screen-by-screen breakdown of every
> page, form, and state. Treat SPEC.md as the source of truth for data and
> logic; treat this file as the source of truth for how things look and read.

## Context

Kolo360 is an internal HR assessment platform: 360° reviews, performance
reviews, and probation check-ins. Feedback is collected via a Telegram agent
or web forms; an AI pipeline drafts reports; HR reviews and approves them.

Audience: one HR professional (power user, daily driver) and occasional
respondents (any employee, often on a phone, once per cycle).

The content is sensitive — people are being evaluated. The interface must
read as calm, confidential, and professional. Think of the register of a
well-designed legal or medical tool: quiet competence, zero playfulness.

## Design direction

**One sentence:** a calm, editorial workspace — dense where HR works with
data, document-like where humans are being discussed.

**The signature element:** the report. Everywhere else the app is a compact,
neutral SaaS tool, but the report view (approval gate) is treated like a
typeset document — serif body, generous measure (~68ch), evidence quotes
styled as restrained pull-quotes with a thin left rule, and calibration flags
living in the right margin like an editor's marginalia. The metaphor is
deliberate: the AI drafted a document, the human edits and signs it. Spend
all boldness here; keep every other screen disciplined and quiet.

**Hard bans (the "no clownery" clause):**
- no gradients, glassmorphism, glow, or neon
- no emoji anywhere in the UI; icons only (Lucide, outline, 16–20px)
- no illustration mascots, confetti, or celebratory animations
- no rainbow of saturated status colors; status is communicated with muted
  tints + text labels, never color alone
- no marketing-style heroes, oversized numbers, or decorative big typography
  on internal screens
- no Title Case; sentence case everywhere, including buttons and headers
- no dark mode in v1 (cut scope); design light-only but keep tokens semantic

## Tokens

**Color** — warm graphite neutrals + one restrained accent:
- `ink-900` #1A1A18 — primary text
- `ink-600` #5B5A55 — secondary text
- `ink-300` #C9C7BF — borders, dividers (hairline, 1px)
- `paper` #FAF9F6 — app background
- `surface` #FFFFFF — cards, panels
- `accent` #2E5E4E — deep pine green: primary buttons, active nav, links,
  focus rings. The only saturated color on most screens.
- Status tints (background + 800-level text of same hue, always with label):
  - collecting / in progress — muted amber tint
  - done / approved — muted green tint
  - pending / draft — neutral gray tint
  - declined / failed / risk flags — muted brick red tint, used sparingly

**Type:**
- UI face: Geist Sans (or Inter as fallback) — 14px base in app chrome,
  weights 400/500 only, tabular numerals (`font-variant-numeric: tabular-nums`)
  for all counts, scores, and dates
- Document face: Source Serif 4 (or Lora) — report body and evidence quotes
  only; 17px/1.7 in the approval gate
- Mono: JetBrains Mono — magic-link tokens, pseudonym tokens (R1, R2, SUBJ),
  technical IDs

**Spacing & shape:** 4px grid; radius 8px on cards and inputs, 6px on badges;
borders over shadows (a single 1px ink-300 border; shadow only on overlays);
max content width 1100px in app, 760px for the report column.

**Motion:** 120–160ms ease-out on hover/focus/expand; no entrance animations,
no parallax; respect prefers-reduced-motion.

## App shell

Two distinct shells:

1. **HR workspace** — left sidebar (220px): logo wordmark (text only),
   nav: Cycles, Templates; bottom: user. Content area with a sticky page
   header (title, primary action right-aligned). Compact density.
2. **Respondent view** (`/respond/[token]`) — no sidebar, no nav. Single
   centered column, max 640px, mobile-first. Header shows only: who is being
   reviewed, which review type, deadline, and a one-line confidentiality note.
   It must feel like a focused document, not an admin tool.

## Screens

### 1. `/cycles` — cycle list (default screen)
- Table (not cards): subject name, methodology badge, deadline, progress
  ("4/6 responded" + thin progress bar), status badge, updated date
- Row click → cycle dashboard
- Primary action: "New cycle"
- Empty state: one sentence ("No cycles yet. Start by choosing a review
  template.") + "New cycle" button. No illustrations.
- Loading: skeleton rows matching table geometry

### 2. `/cycles/new` — create cycle (single page, 3 sections, not a wizard)
- Section "Subject": name (text), role (text, optional)
- Section "Template": radio-card list of available templates — name,
  methodology tag, question count, "preview" link opening a drawer with
  read-only respondent preview
- Section "Reviewers": repeatable rows — name, relation (select: manager /
  peer / report / self / buddy), channel (segmented control: web / telegram),
  contact (email or @username, validated per channel), remove button;
  "Add reviewer" adds a row; deadline (date picker)
- Footer: secondary "Save draft", primary "Launch cycle"; launching shows a
  short confirm dialog noting the template will be snapshotted ("The template
  is copied into this cycle. Later edits to the template won't affect it.")
- Validation: inline, on blur; errors are specific ("Telegram username must
  start with @"), never vague

### 3. `/cycles/[id]` — collection dashboard
- Header: subject, methodology, deadline with days-remaining, status
- Reviewer table: name, relation, channel icon, status badge, last activity,
  per-row actions (copy magic link for web; "remind now" for telegram —
  disabled with tooltip if the 2-reminder limit is reached)
- Slim coverage summary above the table: responses received, required minimum
- Primary action "Analyze" — disabled with explanatory tooltip until the
  minimum is met; while pipeline runs, button becomes inline progress with
  step labels ("Extracting signals… 2/3")
- Declined respondents shown, never hidden

### 4. `/cycles/[id]/report` — approval gate (the signature screen)
- Two-pane layout: report document left (max 760px, serif), flags rail right
  (320px, UI face)
- Report: methodology-defined sections; quantitative results as small clean
  tables or dot-scale rows (1–5 dots, filled = score), never gauges or radial
  charts; evidence quotes set as pull-quotes — serif italic, thin accent left
  rule, source token (R2, peer) in mono below
- Flags rail: one card per flag — type label (contradiction / vague /
  possible bias / low coverage / self gap), one-sentence description,
  "show sources" expanding the related quotes; clicking a flag scrolls the
  report to the related section and highlights it briefly
- Editing: report body is editable in place (subtle dashed outline on hover
  of editable blocks); edited blocks get a small "edited" marker
- Footer bar (sticky): "Approve report" (primary) + approval implications in
  one quiet line ("Approving locks the report. The raw dialogs stay private
  to HR."); after approval the document gets a thin header band: approved
  date, version, by whom
- This screen must pass the squint test as "a document being reviewed",
  not "a dashboard"

### 5. `/templates` — template library
- Two groups: "Methodologies" (seed templates, lock icon + "clone to edit")
  and "Your templates"
- Card per template: name, methodology tag, sections/questions count,
  last edited; actions: clone / edit / archive (archive, never delete)
- Empty "Your templates" state: "Clone a methodology to make it yours."

### 6. `/templates/[id]/edit` — template editor
- Header: template name (inline editable), methodology tag, "Preview as…"
  select (peer / manager / self) opening respondent-view drawer
- Body: sections as collapsible blocks — title, hint, optional competency
  name + behavior markers (markers as a simple editable list)
- Questions inside a section: compact rows — drag is NOT required; reorder
  with up/down icon buttons; each row expands to edit:
  - text (textarea)
  - type (select: open / scale / start-stop-continue)
  - for scale: anchors editor — value + label rows (BARS), add/remove
  - audience: checkbox chips (manager / peer / report / self / buddy)
  - required toggle; follow-up rule toggle ("ask for an example on extreme
    scores") shown only for scale type
- Add buttons are quiet ("+ question", "+ section"), not big dashed zones
- Autosave with a subtle "saved" indicator; no Save button
- Guard: editing is always allowed — a notice explains snapshots ("Running
  cycles use their own copy of this template.")

### 7. `/respond/[token]` — respondent form (mobile-first)
- Intro block: "You're giving feedback on [Name] — [methodology]. Visible to
  HR only, in aggregated form. Not anonymous, but confidential." Plain words.
- One section at a time with a thin progress indicator ("Section 2 of 5") —
  paged, not one infinite scroll
- Scale questions: the anchors ARE the control — vertical radio list where
  each option is the full anchor text (no bare 1–5 number row); selected
  state: accent border + tint
- Open questions: auto-growing textarea, helper text under sensitive ones
  ("A concrete situation from the last few months helps most")
- Required questions block "Next" with a specific inline message
- Autosave per section (magic link = resumable); final screen: one quiet
  confirmation sentence, no confetti
- Must be comfortable on a 360px-wide screen with the keyboard open

## Shared components
- Status badge: tint background, 800-level text, 12px, sentence case
- Methodology tag: outlined, neutral
- Progress bar: 4px, accent fill, no animation stripes
- Confirm dialogs: only for destructive or locking actions (launch, approve,
  archive); body text states the consequence in one sentence
- Toasts: bottom-right, text-only, mirror the action verb ("Report approved")
- Focus: 2px accent ring on every interactive element, always visible

## Quality floor
- Responsive: HR workspace down to 1024px (tables scroll horizontally below),
  respondent view down to 360px
- Keyboard: full tab order, Enter submits forms, Esc closes drawers/dialogs
- All copy in the UI: plain verbs, sentence case, specific over clever;
  errors say what happened and what to do next
- Empty, loading, and error states designed for every screen — none default
  to a blank area
