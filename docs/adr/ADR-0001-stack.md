# ADR-0001: Stack — keyless client app on Next.js 16 App Router, no DB/auth/email

- **Status:** Accepted
- **Date:** 2026-06-29
- **Deciders:** orchestrator + user

## Context

«Гривня» is a public, read-only web app that shows the official NBU exchange
rate, a UAH converter, a ~30-day rate history chart, and a calm trend hint
(see [product-brief.md](../product-brief.md)). It needs no accounts, no
persistence, and no secrets. The repository is a fork of the fwdays homework
starter and **already ships an installed scaffold** — the stack is therefore
*observed*, not chosen from scratch:

- `next@16.2.9`, `react@19.2.4`, `react-dom@19.2.4` (App Router).
- `typescript@^5` with `strict: true` (`tsconfig.json`), path alias `@/* → ./*`.
- `tailwindcss@^4` via `@tailwindcss/postcss`; `eslint@^9` + `eslint-config-next@16.2.9`.

This is **not the Next.js in training data** (16.2 has breaking changes) — agents
must read `node_modules/next/dist/docs/` before writing code (`AGENTS.md`).
A keyless, **database-free** shape is the natural fit for a public, read-only app:
it keeps the project demoable with zero secrets and zero running services.

## Decision

We will build a **database-free, auth-free, email-free, key-free** Next.js 16.2
**App Router** app in TypeScript strict mode, styled with **Tailwind CSS 4**.

- All data comes from the **keyless NBU open API** (see
  [ADR-0002](ADR-0002-nbu-keyless-api.md)), fetched from Server Components /
  Route Handlers; the app runs with **zero env vars**.
- **Domain logic lives in a framework-free `lib/`** (no `next/*`, no `react`, no
  DOM globals) — pure, total, 100% unit-testable with **Vitest**. This is where
  `convert`, `parseAmount`, and `rateMove` live, each with a colocated `*.test.ts`.
- **Charts:** Recharts (single line for rate history). **No map, no Leaflet.**
- **Components:** Server Components by default; `"use client"` only where
  interactivity is required.
- **Verification:** Vitest (unit) + Playwright (e2e + axe a11y, light/dark),
  added when those stages arrive. No DB smoke step exists — the smoke equivalent
  is a real NBU fetch path exercised via a Route Handler and asserted in e2e.
- We **add** later, as needed: `vitest`, `@playwright/test`, `recharts`, `axe`.
- We **do not** add: Postgres/Drizzle, Better Auth, Resend, any analytics/cookies.
- We **do not** auto-generate the agentic scaffolding — the loop is hand-authored
  ([ADR-0003](ADR-0003-prior-art-reuse-boundary.md)).

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Keyless client app on the installed Next 16 stack (chosen) | Matches the scaffold + brief exactly; zero cost/secrets; trivial Vercel deploy; fully demoable | Bound to one data provider (NBU); SSR fetch caching needs care |
| Full Project Factory default stack (Postgres/Drizzle/Better Auth/Resend) | Reuses factory defaults verbatim | Violates the brief: no accounts, no DB, no email; adds cost + secrets we forbid; obscures *my own* engineering |
| Add a DB for "saved currencies / history cache" | Server-side favourites + cache | Out of scope for MVP; the in-memory cache per session is enough (a future ADR can revisit) |
| Different framework (SvelteKit/Astro) | Lighter for a tiny app | Throws away the installed scaffold and the reusable Next.js prior art; no upside for the course |

## Consequences

- **Easier:** no migrations, no auth guards, no seed helpers, no secrets; CI
  needs no services; deploy is a near-static Vercel build; the app starts with
  zero configuration.
- **We accept:** the per-slice loop (Stage 5–7) has no "real-DB smoke test" — the
  smoke equivalent is a real NBU fetch exercised via a Route Handler / Server
  Component and asserted in e2e. Deterministic tests use recorded fixture
  responses, not a seeded DB.
- **Follow-ups:**
  - [ADR-0002](ADR-0002-nbu-keyless-api.md) — NBU as the locked, keyless data source.
  - [ADR-0003](ADR-0003-prior-art-reuse-boundary.md) — what is reused vs. authored.
  - A future `docs/context-architecture.md` records the static-vs-dynamic context budget (Stage 3).
  - NBU attribution is shown in the footer (carried into requirements as a `BC-*`).
- **Environment:** Windows 11; PowerShell primary, Git Bash available. Use
  forward slashes in Node scripts; avoid bashisms in npm scripts.
