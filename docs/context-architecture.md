# Context architecture — «Гривня»

> How context is budgeted across the project so agents stay cheap and accurate.
> The principle: **static context is paid for on every turn — keep it small and
> durable; everything else is pulled on demand.**

---

## The two tiers

**Static context** — loaded into *every* agent turn. Expensive. Must be small,
durable, cross-cutting, and rarely changing.

- [`AGENTS.md`](../AGENTS.md) (+ `CLAUDE.md` → `@AGENTS.md`): the Next.js-16
  preamble, where the product docs live, the session-handoff rule, the design-system
  pointer, and the load-on-demand skill list. **No per-domain detail.**

**Dynamic context** — pulled only when relevant to the task at hand. Cheap because
it is not always present.

| Need | Where it lives | Pulled when |
|---|---|---|
| What/why/for-whom | `docs/product-brief.md` | framing a capability |
| Exact requirements | `docs/requirements.md` (`FR/NFR/TC/BC`) | building or verifying anything |
| Accepted decisions | `docs/adr/*` | a decision is in question |
| Current behaviour (specs) | `openspec/specs/<cap>/spec.md` | working in that capability |
| In-flight change | `openspec/changes/<id>/` | implementing a slice |
| Brand / UI rules | `DESIGN.md` + `hryvnia-frontend-design` skill | any UI work |
| Where we are | `docs/current-state.md` | starting a session |
| Domain code | `lib/<domain>/` + colocated tests | editing that domain |

---

## Budget rules

1. **AGENTS.md stays lean.** If it grows past ~2–3 screens, demote per-domain
   detail into the relevant spec, `DESIGN.md`, or code. AGENTS.md holds only rules
   that apply across *every* slice.
2. **One source of truth per fact.** Requirements live in `requirements.md`;
   behaviour in `openspec/specs/`; brand in `DESIGN.md`. Other docs *link*, never
   duplicate. (`current-state.md` records deltas, not specs.)
3. **Specs are loaded by capability, not all at once.** An agent building the
   converter reads the `converter` spec, not all eight.
4. **Skills are load-on-demand.** The design and currency skills carry their own
   detail; AGENTS.md only names them so they can be pulled when needed.
5. **Tests and types are the cheapest context.** A colocated `*.test.ts` and a
   `.d.ts` tell the next agent what a module does without prose.

---

## What is deliberately *not* in static context

- The full requirements list, all specs, the QA pack, the design tokens — all
  pulled on demand.
- Per-capability error-handling detail — lives in each spec's scenarios.
- The history-endpoint shape — recorded in `ADR-0002` and the `rate-history` spec,
  resolved live at build time, not carried in AGENTS.md.

---

## Why this matters here

This is a small app, so the discipline is the point, not the necessity: the
project demonstrates that context is *engineered* — a tiny always-on core, a clear
map to dynamic sources, and one source of truth per fact — rather than a single
giant prompt that pays for everything on every turn.
