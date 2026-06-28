# ADR-0001: Adopt the existing Kolo360 stack (no migration)

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** orchestrator + user

## Context

Project Factory was retrofitted onto an existing Kolo360 codebase via
`/project-factory:onboard --no-reverse`. Onboarding is non-destructive: it adopts
whatever stack is already present rather than imposing the framework defaults
(e.g. Drizzle, better-auth). The repo already has working slices (token-cost
calculator, data-model foundation, auth) per `docs/current-state.md`.

## Decision

We will adopt the existing stack as-is and govern only new work through the gates:

- **Runtime/framework:** Next.js 16.2.9 (App Router) + React 19.2.4, TypeScript 5 (strict).
  Note: Next 16 renames `middleware` → `proxy` (`proxy.ts`, Node runtime).
- **Database:** Postgres (Neon) via **Prisma 7** (`@prisma/client`, `@prisma/adapter-pg`,
  `pg`). One shared client in `lib/db/`. NOT Drizzle.
- **Auth:** hand-rolled JWT (`jose`) + rotating opaque refresh tokens, httpOnly cookies.
  NOT better-auth. Env secret is `AUTH_JWT_SECRET`.
- **Validation:** Zod 4 at all boundaries; types via `z.infer`.
- **Styling:** Tailwind 4 + Kolo360 design tokens (`app/tokens.css`).
- **Package manager:** the repo carries both `package-lock.json` and `pnpm-lock.yaml`;
  scripts are invoked via `npm run *` (matches `.claude/settings.local.json` allowlist).
- **Test runner:** Vitest 4. No integration/e2e layers yet.
- **Spec tooling:** OpenSpec (`@fission-ai/openspec`) already initialised under `openspec/`.
- **Deploy target:** Vercel.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Adopt existing stack (chosen) | Non-destructive; zero rework; keeps green slices | Stack differs from framework defaults; CI template needs adaptation |
| Migrate to framework defaults (Drizzle/better-auth) | Matches reference docs verbatim | Rewrites working, reviewed, archived slices — out of scope for onboarding |

## Consequences

- The Project Factory loop (agents, workflows, `check-*` scripts, hooks, CI) now
  guards new work; legacy code stays outside the spec chain (`--no-reverse`).
- The bundled CI template (`.github/workflows/ci.yml`) references framework defaults
  (`BETTER_AUTH_SECRET`, `test:integration`, `test:e2e`) that do not match this repo —
  it must be adapted before it is green. See onboarding report / `current-state.md`.
- `qa-verify`'s battery was trimmed to the scripts that exist (no integration/e2e/eval
  layers yet). Re-add them as the orchestrator stands those layers up.
