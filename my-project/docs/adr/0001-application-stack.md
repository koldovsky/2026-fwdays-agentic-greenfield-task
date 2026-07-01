# ADR-0001: Next.js with JSON repository storage

- **Status:** Accepted
- **Date:** 2026-07-01
- **Deciders:** Project owner and Project Factory orchestrator

## Context

The approved MVP is a locally runnable, single-process manufacturing inventory prototype. TC-1 requires Next.js and TC-2 requires the seven supplied JSON datasets; TC-3 explicitly excludes horizontal scaling for this phase.

## Decision

Use the current installed Next.js App Router with React and TypeScript. Implement server-rendered pages and server-side mutations behind typed services. Persist with a Node.js JSON repository using FIFO write serialization, staged temporary files, and atomic rename. Use signed local sessions and Vitest plus Playwright for verification.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Next.js + JSON repository | Matches the requested prototype and runs without external infrastructure | Single-process only; requires careful transactional handling |
| Next.js + PostgreSQL | Strong concurrency and relational constraints | Contradicts the explicit MVP storage requirement and adds setup cost |
| Client-only SPA | Simple static hosting | Cannot safely own credentials or file persistence |

## Consequences

- Local startup requires only Node.js and npm.
- Repository and services must prevent direct UI filesystem access.
- Production or multi-instance deployment requires the Future relational-storage migration.

