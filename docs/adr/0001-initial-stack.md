# ADR-0001: Initial Technology Stack

## Status

Superseded by [ADR-0002](0002-browser-first-mvp.md)

## Context

Starting a new invoice management product. Need a stack that supports SSR, secure multi-tenant data, PDF generation, and fast iteration.

## Decision

- **Next.js 16** with App Router and Server Actions
- **TypeScript** strict mode
- **shadcn/ui** + Tailwind CSS v4 for UI
- **Supabase** (Postgres + Auth + Storage) as primary backend
- **Drizzle ORM** for type-safe database access
- **Zod** for validation shared between client and server

## Consequences

- Vercel deployment is straightforward
- RLS in Supabase enforces tenant isolation at the database layer
- Server Actions reduce need for separate REST API for most mutations
- PDF and email integrations added as infrastructure adapters in phase 2+
