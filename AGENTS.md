<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design system — GitHub Battle

This project ships a design system. **Read [`DESIGN.md`](./DESIGN.md) before
building or restyling any UI** — it is the contract for how the app looks.

- **Foundations/spec:** [`design-system/`](./design-system/) is the canonical
  reference kit (tokens, component sources, UI-kit recreations, `readme.md`).
  Don't hand-invent colors, type, or spacing — lift the values from here.
- **Runtime tokens:** [`app/tokens/`](./app/tokens/) + `app/globals.css`. Semantic
  tokens are exposed as Tailwind utilities (`bg-surface`, `text-text-muted`,
  `border-border`, `font-serif`, `rounded-lg`, `max-w-content`, …). Style through
  those — never raw hex or the raw stone/terracotta scales.
- **Non-negotiables:** dark by default (class-based `.dark`); serif (Newsreader)
  for headings and big numbers, sans (Geist) for UI/body, light weights;
  warm-neutral palette (never pure grey/black); calm, purposeful motion that
  respects `prefers-reduced-motion`; **near-iconless and emoji-free**; sentence
  case; address the reader as *you*.
- If you add a token, update **both** `app/tokens/` and `design-system/tokens/`
  and document it in `DESIGN.md`.
