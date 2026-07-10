# Project brief

## Purpose

**Weather Explorer** — Ukrainian-first, privacy-first web app that helps an
anonymous visitor decide whether a weekend trip is weather-worth-it. Built as
the homework project for **fwdays Academy · Agentic Engineering: Greenfield**,
delivered through the **Project Factory** spec-driven workflow.

Fork of: [koldovsky/2026-fwdays-agentic-greenfield-task](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task).

## Scope

**In scope (MVP):** 7-day forecast, comfort scoring, city search, map, animated
background, weekend compare (up to 3 cities), footer jokes, QA proof pack.

**Out of scope:** accounts, push notifications, native app, paid API keys,
analytics, application-set cookies.

## Stakeholders / users

- **Primary user:** anonymous visitor planning a weekend trip (no roles, no sign-in).
- **Course evaluators:** look for agentic-engineering process evidence, not stack size.
- **Product owner (workshop):** sign-off via `docs/qa/mvp-acceptance-report.md`.

## Repository layout (coarse)

| Path | Role |
|------|------|
| `app/` | Next.js 16 App Router pages (thin server components) |
| `components/` | React UI (client where needed: map, search, animations) |
| `lib/` | Pure domain logic — **no** `next/*` or React (`TC-PURE-01`) |
| `openspec/specs/` | Capability contracts (OpenSpec) |
| `openspec/changes/archive/` | Completed slice proposals, designs, tasks |
| `docs/memory/` | Agent Memory Bank (operational summaries) |
| `docs/qa/` | Traceability matrix, demo recordings, acceptance report |
| `evals/` | Output eval cases (quality bar beyond unit tests) |
| `scripts/check-*` | Deterministic gates (trace, trajectory, recordings) |
| `.agents/skills/` | Dynamic context: project-factory, vercel-react-best-practices |

## Links

- Requirements: `docs/requirements.md`
- Product narrative: `docs/product-brief.md`
- Visual identity: `DESIGN.md`
- Handoff / gates: `docs/current-state.md`
- Homework submission guide: `docs/homework-submission.md`
