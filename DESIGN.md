# Design — Kamerton / Vocal-School Booking Agent

The visual identity and voice for this project. **Kamerton** ("камертон" — a
tuning fork) is a calm, Ukrainian-first booking agent for a one-teacher vocal
school. Everything is built around a single honest signal — the **booking
request** and its status (`pending → confirmed / declined`) — on a quiet surface
that never pressures anyone: not the parent writing at 22:30, not the teacher
deciding between lessons.

This file is the brand decision of record (it satisfies `BC-BRAND-01`). It
covers both product surfaces: the **dashboard** (visual system) and the
**Telegram bot** (voice and content rules — Telegram renders no custom UI, so
there the brand *is* the writing).

---

## Where it lives in the repo

| What                     | Path                          | Notes                                                                 |
| ------------------------ | ----------------------------- | --------------------------------------------------------------------- |
| **Design tokens (live)** | `apps/dashboard/styles/tokens/` | Single source of truth for colours, type, spacing, radius, motion. Imported by `globals.css`. |
| **Global stylesheet**    | `apps/dashboard/app/globals.css` | Tailwind + token imports + the Tailwind theme bridge.                 |
| **Fonts**                | `apps/dashboard/app/layout.tsx` | Golos Text + JetBrains Mono via `next/font` (self-hosted, full Cyrillic). |
| **Components (live)**    | `apps/dashboard/components/ds/` | App-Router-ready (`'use client'`). Import from `@/components/ds`.     |
| **Bot voice rules**      | `packages/agent/prompt.md`    | The Voice & content rules below are embedded verbatim into the agent's static context. |
| **Brand assets**         | `apps/dashboard/public/brand/` | `logo-mark.svg` (a minimal tuning fork), `logo-wordmark.svg`.         |

---

## Tokens — consume the semantic aliases, never raw ramps

Tokens are plain CSS custom properties on `:root` (and `[data-theme="dark"]`).
Components and app code read the **semantic aliases**, not the raw colour ramps.

```css
/* Good — semantic, theme-aware */
color: var(--text);
background: var(--surface);
border: 1px solid var(--border);
border-radius: var(--radius-lg);

/* Avoid — raw ramp, won't recolour per theme/role */
color: var(--slate-900);
```

Key aliases: surfaces (`--bg`, `--surface`, `--surface-raised`, `--surface-hover`),
text (`--text`, `--text-secondary`, `--text-muted`, `--text-on-brand`), brand
(`--brand`, `--brand-hover`, `--brand-soft`, `--accent`), borders (`--border`,
`--border-strong`), and the signature **status** roles —
`--status-{pending,confirmed,declined}-{bg,fg,solid}`:

- `pending` — warm amber: a request waiting for the teacher, never alarming;
- `confirmed` — deep green: the only state a human can produce (`FR-GUARD-01`);
- `declined` — muted rose: quiet, respectful, no red-alert theatrics.

Spacing is a 4px grid (`--space-1…10`); radii are `--radius-{sm,md,lg,pill}`
(inputs/buttons 12px, cards 16px, the request card 20px, status badges pill).

### Tailwind bridge

`globals.css` exposes the semantic tokens to Tailwind 4 via `@theme inline`, so
utilities stay theme-aware:

```tsx
<div className="bg-surface text-text border border-border rounded-lg">
  <Badge className="bg-status-pending">…</Badge>
```

Available: `bg-/text-/border-` for `bg`, `surface*`, `brand*`, `accent`, `text*`,
`border*`, `status-{pending,confirmed,declined}`; `font-sans`/`font-mono`;
`rounded-{md,lg,xl}`. Anything not bridged — use `var(--token)` directly.

---

## Type

- **Golos Text** — all UI and display text. A humanist grotesque with full
  Cyrillic, warm enough for a school, sober enough for a control panel.
- **JetBrains Mono** — **every date, time, and age** (slot times, the pending
  queue timestamps, "4 роки"), with **tabular figures** so the queue lines up.

Both load via `next/font` in `app/layout.tsx`, self-hosted (no external font
request — honours `NFR-LOCAL-01`) and bind to `--font-sans` / `--font-mono`.

Scale: `--text-2xs` (11px) → `--text-3xl` (40px, reserved for the pending-queue
count in the dashboard header). Display weights 600–700 with slightly tight
tracking; body 400–500.

---

## Theming (light + dark)

Light is the default. Dark is opt-in by setting `data-theme="dark"` on `<html>`;
every token re-resolves. No colour-scheme media query — the toggle is explicit.

```html
<html lang="uk" data-theme="dark">   <!-- dark -->
<html lang="uk">                      <!-- light (default) -->
```

All combinations meet **WCAG AA** contrast, including status badges on both themes.

---

## Components

Import from the barrel:

```ts
import { Button, Card, StatusBadge, RequestCard, SlotChip, ChatStream } from "@/components/ds";
```

**Core:** `Button`, `IconButton`, `Input`, `Badge`, `Card`, `Chip`, `Icon`.
**Domain:** `RequestCard` (the hero — fields fill in live as `STATE_DELTA`
events arrive), `LessonBrief` (goal, tastes, dream song, experience — the
teacher's prep sheet inside the request card, `FR-INTAKE-06`), `StatusBadge`
(+ `statusTone`), `SlotChip` (weekday + mono time), `ChatStream` (streamed agent
text with a typing shimmer), `DecisionBar` (Confirm / Propose another time /
Decline — the only place `confirmed` can be born), `QuestionInbox` (unanswered
lead questions with a frequency counter and a one-action answer field — the only
place the knowledge base can grow, `FR-KB-02/03`), `EventLog` (the raw AG-UI
feed behind a collapsed panel, `FR-DASH-02`).

They are client components styled entirely with the tokens above, so they
recolour with the theme automatically. `apps/dashboard/app/page.tsx` is a small
working example (pending queue + one live conversation).

### Icons — Lucide

Icons come from **Lucide** at a calm **1.75 stroke** via `lucide-react`. The
`Icon` component wraps it; pass a name (`<Button iconLeft="check">`). Booking
statuses must go through **`StatusBadge`** — the single source of truth mapping
`pending/confirmed/declined` to icon + colour. Icons inherit `currentColor`.

---

## Voice & content rules

The product writes like the teacher's most patient colleague, not a sales bot.
These rules bind **both** surfaces and are embedded into the agent's prompt.

- **Ukrainian-first.** All lead-facing text and the dashboard UI are Ukrainian.
  English appears only in developer artefacts (code, the event log).
- **Kind refusals: say no warmly, then offer the nearest yes.** Under-4 → "від
  4 років — чекатимемо на вас"; piano → voice trial instead; Saturday → the
  nearest weekday options. Every refusal ends with a door left open.
- **No pressure vocabulary.** Never "останнє місце", "тільки сьогодні",
  "поспішайте". Slots are stated plainly; scarcity is never performed.
- **One question at a time.** The intake conversation asks for exactly one
  missing field per message — parents answer from a phone, often one-handed.
- **Curiosity, not an interrogation.** The get-to-know questions (goal, tastes,
  dream song) sound like a friendly chat, never a form: "Яку пісню ви б
  залюбки заспівали?", not "Вкажіть репертуарні вподобання". Skipping is always
  fine — "можемо з'ясувати це вже на занятті".
- **Every goal is a good goal.** Karaoke, the stage, or quietly beating
  shyness — the agent mirrors the lead's words back with respect and never
  ranks ambitions ("для караоке — чудова ціль", full stop, no "лише").
- **Times and ages are exact and mono.** "вт, 17:00–18:00", "4 роки" — in
  JetBrains Mono with tabular figures on the dashboard; never "близько п'ятої".
- **Effectively no exclamation marks.** The single sanctioned exception is the
  final booking confirmation, which may carry one — and may carry the one
  sanctioned emoji, 🎵. Nowhere else, and never on the dashboard.
- **Sentence case.** UPPERCASE only for tiny mono micro-labels with wide
  tracking on the dashboard, e.g. "ОЧІКУЮТЬ · 3".
- **The agent never speaks for the teacher.** Decisions are relayed as facts
  ("Підтверджено: вівторок, 17:00"), not as the bot's own generosity.

---

## Accessibility & motion

- **Focus is always visible** — `base.css` applies `--focus-ring` (a 3px soft
  ring in `--brand-soft`) on `:focus-visible`; never remove it.
- **AA contrast** in both themes, status badges included.
- **Live regions, politely.** New `pending` requests announce via
  `aria-live="polite"` — the dashboard informs, it does not startle.
- **Calm motion, nothing bounces.** Fast (140ms) feedback; the request-card
  fields fade in as they fill; the streaming shimmer is opacity-only. All
  durations collapse to 0 under `prefers-reduced-motion`, and no animation ever
  blocks interaction.