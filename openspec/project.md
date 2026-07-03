# OpenSpec Project Context — Kamerton

**Kamerton** ("камертон" / tuning fork) is a local-first booking agent for a
one-teacher vocal school. Two surfaces: a Telegram bot for leads (grammY, long
polling) and a localhost dashboard for the administrator (Next.js + CopilotKit /
AG-UI over SSE). An agent core drives Claude with a thin, visible tool-use loop;
SQLite (`better-sqlite3`) is the only store. Fully local — no webhooks, no
tunnels, no cloud DB.

## Sources of truth

- `docs/requirements.md` — numbered FR/NFR/TC/BC (the contract; specs cite these ids).
- `docs/product-brief.md` — narrative.
- `DESIGN.md` — visual identity + agent voice rules (BC-BRAND-01).
- `docs/adr/ADR-0001-architecture.md` — local-first architecture, AG-UI transport, guardrails-in-code.
- `docs/adr/ADR-0003-google-calendar-slots.md` — DEMO Google Calendar as schedule source: grid ∩ free/busy, `rankSlots()`, tentative holds, service-account auth.

## Capabilities

MVP: `intake` · `kb-learning` · `slots` · `booking-hitl` · `dashboard`.
Future: `groups` (waitlist included) · `web-booking` (lead-facing concert-hall
seat picker + the same agent over CopilotKit). Guardrail FRs are owned by their
implementing capabilities (FR-GUARD-01→booking-hitl, -02/-06→kb-learning,
-03→slots, -04/-05→intake); the guardrails **eval suite** is cross-cutting
(`evals/cases/fr-guard-*.yaml`). The Question inbox belongs to `kb-learning`,
not `dashboard`.

## Non-negotiables (guardrails live in code, not the prompt)

- The agent never confirms a booking — the `confirmed` transition exists only in
  the dashboard admin handler (FR-GUARD-01, maker ≠ checker).
- Slots only Mon–Fri 10:00–20:00: the grid is deterministic code; the DEMO
  Google Calendar only subtracts availability, and `rankSlots()` scoring is a
  pure function (FR-GUARD-03, FR-SLOT-04, ADR-0003).
- Minimum student age 4, validated in `lib/` (FR-GUARD-04).
- The agent never writes to `knowledge/school.md` (FR-GUARD-06).

## Conventions

- Every MVP FR is cited in exactly one spec; scenarios use GIVEN/WHEN/THEN and
  include error paths. Validate with `openspec validate --all --strict`.
