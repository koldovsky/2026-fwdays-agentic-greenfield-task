# ADR-0002: Browser-First MVP Architecture

## Status

Accepted

## Context

ADR-0001 assumed a multi-tenant SaaS with Supabase, Drizzle, Server Actions,
payment tracking, and email delivery. The Agentic Engineering course MVP and
wayfinder map (`.scratch/mvp-spec-coherence/map.md`) narrowed scope to a
**browser-first invoice generator** for a single ФОП:

- Invoice register, supplier profiles, and client directory in browser storage
- Bilingual document from `docs/invoice-template.html`
- PDF via a **stateless** Vercel Route Handler (headless Chromium); server holds no data
- Manual status labels (`draft`, `sent`, `paid`, `cancelled`); `overdue` derived at display
- Form input with live preview; chat/LLM deferred to Future
- No accounts, organizations, payment ledger, or email integration

## Decision

1. **Drop** Supabase, Drizzle, Server Actions, and `src/lib/db/` from MVP scope.
2. **Persist** all user data in the browser (localStorage / IndexedDB).
3. **Render PDF** with `POST /api/pdf`: receive invoice payload, print template, return PDF, forget request.
4. **Keep** Next.js 16 App Router, TypeScript strict, shadcn/ui, Tailwind v4, WEG3D Fin.
5. **Authoritative requirements** in `openspec/specs/<capability>/spec.md`; `docs/requirements.md` retains FR IDs for traceability.

## Consequences

- ADR-0001 is superseded; enterprise features remain documented only as Future.
- `openspec validate --strict` and `npm run build` gate merges.
- PDF route must be audited for zero retention (logging, temp files, caches).
- Course demo shows form → preview → PDF download/share without backend state.

## References

- `.scratch/mvp-spec-coherence/map.md` — settled decisions
- `docs/ARCHITECTURE.md` — runtime structure
- `openspec/specs/` — capability specifications
