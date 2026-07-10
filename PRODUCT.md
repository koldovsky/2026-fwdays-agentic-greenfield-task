# Product

## Register

product

## Platform

web

## Users

People who **self-host their own book and comic library** — they run Komga, Kavita, or Calibre on a
home server or NAS, and they own both the hardware and the files. They are comfortable with Docker,
ports, CORS, and API tokens. They chose self-hosting specifically to avoid a vendor owning their
reading.

Their context splits in two, and the interface has to hold both:

- **Reading** — on a phone on a commute, on a tablet in bed, frequently with **no network at all**.
  The job is to open the book and disappear into it.
- **Operating** — at a desk, connecting a server, checking why a source is unreachable, installing a
  format they just discovered they need. The job is to understand what the system is doing and fix it.

The job to be done: *read my own books, from my own server, anywhere, and never lose my place.*

## Product Purpose

Edda points at a content server the user already owns, browses that library, downloads books for
**offline** reading, renders them in a clean reader, and syncs reading progress **back to that same
server** so position follows the reader across devices.

It exists because the alternatives each fail one half of the audience: commercial readers (Kindle,
Kobo) own your library and put a store between you and the book; self-host-native tools (Calibre's
desktop UI, bare OPDS clients) respect your ownership but not your attention.

Success looks like:

- The full journey — open a downloaded book, move through it, reconnect — **works with the network
  cut**, and progress reconciles furthest-wins on reconnect.
- A new connector or format is added as a self-contained plugin **without editing the core**.
- The domain model is specified platform-neutrally, so a future native client is built to the **same
  specs** rather than by reverse-engineering the web app.

Explicitly not the product: hosting content, third-party plugin marketplaces, cross-source unified
progress, social reading. (See `doc/plans/goals.md` § Non-goals.)

## Brand Personality

**Quiet · Precise · Self-hosted.**

An instrument, not an appliance. The warmth is genuine — serif type, parchment surfaces, generous
spacing — but it never condescends. Underneath the reading room is a machine whose state is legible:
monospace for ids, versions, and byte sizes; explicit capability probes; a status dot that says
*Reachable* and means it.

Voice: plain, exact, unhurried. It says what happened and what it will do about it. It does not
celebrate, apologize effusively, or dress a failure as an opportunity. When a server rejects a
progress write, it says so.

Emotional goal while reading: **absorption** — the tool disappears.
Emotional goal while operating: **command** — nothing is hidden to seem friendly.

## Anti-references

- **Kindle / Kobo web reader.** Store-first chrome competing with the book: upsells, commerce
  surfaces, navigation clutter wrapped around the text. Edda has no store. Nothing in this app may
  ever try to sell, recommend, or promote. The user already owns every book here.
- **Calibre's desktop UI.** Engineer-first density with no visual care: dated toolbars, cramped
  tables, dialogs stacked on dialogs, every option surfaced at equal weight. **This is the most
  dangerous anti-reference** because the audience overlaps almost exactly — the failure mode is
  assuming that a technical user does not deserve a considered interface. Legibility of machinery is
  not a license for visual neglect.

The shared absolute bans still apply on top of these (side-stripe borders, gradient text, decorative
glassmorphism, hero-metric templates, identical card grids, uppercase tracked eyebrows on every
section, numbered section scaffolding).

## Design Principles

1. **The book outranks the app.** Chrome yields to content. Any pixel of interface competing with the
   text has to justify itself; the reader's default state is the book and almost nothing else. The
   book's typography belongs to readium-css, not to the app's design system — do not let chrome
   styling leak into the page.

2. **Legible machinery.** The user runs the server; treat them as its operator. Sync state, connector
   capabilities, reachability, and storage are shown plainly rather than abstracted into a friendly
   lie. A capability the app lacks is named, not silently degraded. This is what separates Edda from
   the consumer readers — and it is *not* permission to look like Calibre.

3. **Offline is the assumption, not the error.** Being disconnected is the expected condition of a
   commute, not a failure state. Offline UI is a fact reported calmly, never an alarm, an empty
   crash, or a blocked interaction. Anything that works from OPFS must work with the radio off.

4. **Earned familiarity over invention.** A settings panel should behave like a settings panel; a
   button should look like the other buttons. Novelty is spent on the reading experience, not on
   reinventing standard affordances. Consistency screen-to-screen is a virtue here, not a compromise.

5. **The user's library, not ours.** No feeds, ratings, recommendations, or social proof. No
   telemetry dressed as a feature. Every surface reflects content the user already owns, on a server
   they already control.

## Accessibility & Inclusion

**Committed bar: WCAG 2.1 AA across app chrome, and AAA (7:1) for long-form reading text.**

Reading is the core task and reading text earns the stricter bar. Current measured state of the four
reading themes (body text on its own background):

| Theme     | Ratio   | AA (4.5) | AAA (7.0) |
| --------- | ------- | -------- | --------- |
| light     | 13.53:1 | pass     | pass      |
| dark      | 13.67:1 | pass     | pass      |
| parchment | 8.02:1  | pass     | pass      |
| sepia     | 6.89:1  | pass     | **fail**  |

**Known gap:** `sepia` misses AAA by 0.11. Foreground `#5b4a36` → `#584734` yields 7.22:1 with
headroom, at negligible cost to the theme's warmth. Note this is a **two-file** change: the four
theme colors are currently declared twice — in `src/platform/web/reader-frame/reader-css.ts`
(`THEME_COLORS`, what actually renders) and in `src/app/components/reader/DisplayPanel.vue`
(the swatches the user picks from). Patching only the first leaves the picker previewing a color the
reader no longer uses. The duplication is itself worth removing; a shared constant would make this a
one-line fix. This is the one outstanding item against the stated bar.

Already enforced in code and gated by tests:

- axe-core reports **0 serious/critical** on every screen (`pnpm test:a11y`).
- Keyboard operability and focus-trap coverage across all flows.
- A global `:where(...):focus-visible` ring meeting AA non-text contrast (3:1), at zero specificity so
  components may override the style but never remove the indicator.
- `prefers-reduced-motion: reduce` dampens every transition and animation.
- Chrome tokens `--color-muted`, `--color-status`, `--color-warning` were deliberately darkened from
  their maket values to clear AA as text.

Further considerations: the reading themes must remain distinguishable without relying on hue alone,
and reduced-motion is a correctness requirement, not a courtesy — the visual-regression suite depends
on it to capture deterministically.
