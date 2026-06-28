# ADR-0002: Layered context architecture

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** orchestrator + user

## Context

A fresh agent starts each session with blank context — "the agent forgets, the repo
doesn't." Knowledge must live in durable, discoverable files, not in conversation.
Kolo360 already established this before onboarding; this ADR ratifies it.

## Decision

We will keep a layered context architecture, read on demand rather than carried in context:

- **Hub:** `CLAUDE.md` → `@AGENTS.md` — the always-loaded operating rules.
- **Sources of truth:** `docs/requirements.md` (PRD, numbered FR/NFR/TC/BC),
  `docs/product-brief.md` (why), `DESIGN.md` + `docs/KoloDesign/` (how it looks),
  `docs/mvp-capability-plan.md` (slice plan).
- **Working memory / handoff:** `docs/current-state.md` — read first every session,
  updated after every meaningful change, kept to ~one screen.
- **Durable history (on demand, never in context):** `git log`,
  `openspec/changes/archive/`, `openspec/specs/`, `docs/adr/`.
- **Specs:** OpenSpec under `openspec/` — specs cite FR ids; the traceability chain
  (`scripts/check-traceability.mjs`) keeps FR → spec → plan → test → recording intact.

`docs/context-architecture.md` (the framework template stub) complements this map.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Layered files + current-state handoff (chosen) | Survives context resets; auditable | Requires discipline to keep current-state fresh |
| Long-lived conversation memory | No file upkeep | Lost on reset; unauditable; not shared across agents |

## Consequences

- Any session (or fresh agent) can resume from `docs/current-state.md`.
- New slices must cite FR ids in specs and `@trace` ids in tests, or the
  traceability gate stays red.
- History is never duplicated into context — it is queried from git/archive/specs.
