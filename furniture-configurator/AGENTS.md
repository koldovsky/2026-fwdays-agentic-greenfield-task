<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Furniture Configurator & Catalog

Stack: Next.js (App Router) + TypeScript, Prisma ORM + SQLite, Vitest for tests.

Spec-driven: this project follows the OpenSpec change at
`../openspec/changes/` (proposal, design, specs, tasks).
Read `design.md` and `specs/**/spec.md` there before changing behavior.

## Domain logic boundary

All validation, BOM generation, and catalog-matching rules live in
`src/lib/configurator/*` as pure TypeScript functions with **no** dependency
on Next.js or Prisma — they take plain data in, return plain data out. This
is what gets unit-tested. Route handlers and UI call into this layer; they
do not duplicate its rules.

Attribute values (colors, materials, hardware, sizes) are always referenced
by dictionary ID, never by free-text string — this is the whole point of
the project (it's what prevents "кашемір"/"кишемір"-style duplicates).
Never add a free-text input for an attribute that has a dictionary.

## Running things

- `npm run dev` — start the app
- `npm test` — run the Vitest suite
- `npx prisma migrate dev` — apply schema changes
- `npx prisma db seed` — seed dictionaries/product type/catalog data
- `npx prisma studio` — inspect the SQLite DB
