# Decision log

Lightweight chronological notes. Authoritative rationale for behavior changes
belongs in `docs/adr/` when present. Link from here to the ADR.

## How to record

- **ADR present:** one line here + link to `docs/adr/<file>.md`.
- **No ADR:** short entry: Context → Decision → Consequence.

---

## 2026-06 — Project Factory for MVP delivery

- **Context:** fwdays homework rewards process evidence, not product size.
- **Decision:** Adopt full Project Factory loop — OpenSpec specs, 9 capability
  slices, test-first, review gates, QA proof pack.
- **Consequence:** 32 FRs traced; archived changes under `openspec/changes/archive/`;
  deterministic `scripts/check-*` gates.

## 2026-06 — Framework-free `lib/` domain layer

- **Context:** comfort scoring and forecast parsing must be unit-testable without Next.js.
- **Decision:** `lib/` has no `next/*`, React, or DOM imports (`TC-PURE-01`).
- **Consequence:** `comfortScore()` and parsers live in `lib/scoring/`, `lib/forecast/` with Vitest.

## 2026-06 — Keyless Open-Meteo + OSM only

- **Context:** zero paid API keys (`NFR-COST-01`), privacy-first (`BC-PRIVACY-*`).
- **Decision:** Open-Meteo for forecast/geocoding; Leaflet + OSM tiles for map.
- **Consequence:** no accounts, no cookies; geolocation only on explicit user action.

## 2026-06-30 — Memory Bank layer adopted

- **Context:** agents need durable cross-session knowledge beyond `current-state.md`;
  reference pattern in `agent-ide-bootstrap`.
- **Decision:** Add `docs/memory/*` + always-on Cursor rules (`memory-bank.mdc`,
  `docs-maintenance.mdc`); keep Project Factory handoff in `docs/current-state.md`.
- **Consequence:** agents read memory before non-trivial edits; `activeContext.md`
  tracks homework submission; no duplication of OpenSpec detail in memory files.

## 2026-06-30 — Static vs dynamic context boundary

- **Context:** `AGENTS.md` must stay lean; per-domain detail is expensive on every turn.
- **Decision:** Static = `AGENTS.md` + rules; dynamic = skills, specs, `current-state.md`,
  memory bank read on demand. See `docs/context-architecture.md`.
- **Consequence:** promote to static only what is needed on most turns.

---

## 2026-06-30 — Homework submitted (fwdays Greenfield)

- **Context:** course requires PR with name, video, agentic-practice description on fork.
- **Decision:** branch `homework/submission` → PR #1; video in `docs/homework-demo/`; Memory Bank for cross-session handoff.
- **Consequence:** CI green after `fetch-depth: 0` + `@vitest/coverage-v8`; submission link sent; repo idle until new scope.

<!-- Append new entries below -->
