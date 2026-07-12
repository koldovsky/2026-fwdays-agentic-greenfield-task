# 11 — Reconcile the WEG3D Fin design system with the spec

Type: grilling
Status: open
Blocked by: 05, 08

## Question

The design system landed while this map was being charted, and it already
disagrees with the decisions taken during charting.

**(a) Status vocabulary.** `Design.md:121` and `src/lib/design-system.ts:15-22`
encode `void`. Map decision 4 says `cancelled`. `src/lib/design-system.ts:5-11`
labels statuses in **English**; map decision 8 says the UI speaks Ukrainian. And
both files treat `overdue` as a stored status, while map decision 4 derives it —
so `InvoiceStatus` may need to split into a stored type and a display type
(ticket `08(c)`).

**(b) Which token file is canonical — three files, three answers.**

- `src/styles/design-tokens.css:3` says the source of truth is
  `docs/Design System/design-tokens.css`.
- `Design.md:149` agrees, and asks that the docs copy be kept in sync.
- `AGENTS.md` rule 8 says the opposite: edit `src/styles/design-tokens.css`
  first, mirror to `docs/`.

They have **already diverged**: `src/styles/design-tokens.css` defines
`--wf-accent-border`, `--wf-success-soft` and `--wf-danger-soft`, which the
declared "source of truth" does not contain. Pick one canonical file and delete
the ambiguity — a second copy that must be "kept in sync" is a copy that will
not be.

**(c) Fonts.** `Design.md:19` says the typography is Geist. `BC-BRAND-01` and
`docs/invoice-template.html` say the invoice document uses Inter.

Ticket `01` settled the facts: **Geist, Geist Mono and Inter all ship a
`cyrillic` subset**, which covers every Ukrainian letter. And
`subsets: ["latin"]` in `src/app/layout.tsx:6-9` never dropped Cyrillic — it
only skipped its `<link rel="preload">`, so Ukrainian text flashes in the
fallback font on a cold load. **The fix is one word:
`subsets: ["cyrillic", "latin"]`,** on both Geist and Geist Mono.

What is left to decide: the app font and the document font. They need not be the
same — but if the PDF path chosen in ticket `05` embeds a font, ticket `01`
showed it needs **one unsubsetted TTF/WOFF carrying both scripts**, which
neither `next/font` nor `@fontsource` provides. Decide where that file comes
from, and whether shipping two fonts (Geist for the app, Inter for the document)
is worth the bytes.

**(d) Ownership.** Once the spec lives in `openspec/specs/`, what is `Design.md`
— a spec, a reference, or a duplicate? And what is the `AGENTS.md`
`design-system-rules` block?

## Note

Nothing here questions the visual design itself. Creating or redesigning the
design system is **out of scope** (see the map). This ticket only makes the
design system and the spec stop contradicting each other.
