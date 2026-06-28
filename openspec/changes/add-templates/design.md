# Design — add-templates

Implements `openspec/specs/templates/spec.md` (FR-TPL-01..03). One set of Zod schemas defines the
template/question/anchor shape and validates seed data at the boundary; templates are read-only.

## Schemas (pure, lib/, unit-tested — red-first)

`lib/schemas/template.ts`:
- `anchorSchema` — `{ value: z.number().int() (strict — no coercion, rejects "3", 3.5, "3,5", "03"),
  label: z.string().trim().min(1) }`.
- `questionSchema` — `{ id: z.string().min(1), order: z.number().int().positive(),
  text: z.string().trim().min(1).max(500), type: z.enum(["scale","open"]), required: z.boolean(),
  anchors?: ... }`, refined so `scale` REQUIRES a non-empty anchor list with unique `value`s and
  `open` carries no anchors. (Matches the `anchors Json?` column.)
- `templateSchema` — `{ name: z.string().trim().min(1).max(200), methodology: z.string().trim().min(1),
  questions: z.array(questionSchema).min(1) }` refined so the multiset of `order` values is exactly
  `{1..N}` (unique + contiguous from 1), so read order is unambiguous.
- Types via `z.infer` only (no parallel types, no cast). Framework-free. This is the red-first target;
  tests cover every "rejected at the boundary" scenario in the spec (over-length name/text, unknown
  type, empty/whitespace text, missing anchors on scale, anchor missing value/label, non-canonical
  anchor value incl. `"3"`/`3.5`/`"3,5"`/`"03"`, duplicate anchor values, duplicate/non-contiguous
  order) plus the accepting cases, and that both seed templates parse successfully.

`lib/templates/orderedQuestions.ts` — `orderedQuestions(questions)` returns a copy sorted ascending by
`order`; deterministic. Pure, unit-tested.

## Seed data + script

`lib/templates/seed-data.ts` — two templates (`Probation check-in`, `Peer feedback`) as plain
`TemplateInput` data, each a mix of `scale` (with 1..5-style labelled anchors) and `open` questions,
`order` contiguous from 1. A module-level parse asserts they satisfy `templateSchema`.

`scripts/seed-templates.mts` (node, uses `lib/db`): for each seed template, `templateSchema.parse(...)`,
then upsert by a stable natural key (name) — create the template + its questions, or leave existing
rows. Idempotent and re-runnable; never deletes. Wired as `prisma db seed` (via `prisma.config.ts`)
and/or an npm `db:seed:templates` script. Question `id`s are DB-generated cuids, stable across reads;
downstream cycle snapshots reference them.

## UI (cabinet group, read-only)

- `app/(cabinet)/templates/page.tsx` (server) — list seeded templates (name + methodology tag),
  each linking to its preview. `EmptyState` when none seeded; cabinet `error.tsx` on fetch failure.
- `app/(cabinet)/templates/[id]/page.tsx` (server) — load the template + ordered questions; if absent,
  render a calm not-found state (Ukrainian, tokens) — never a raw 500. Otherwise render the respondent
  preview: name, methodology, each question in order; `scale` → its labelled anchors as a read-only
  option list; `open` → a read-only free-text prompt. Inputs save nothing (preview is read-only).
- No nav entry (cabinet-shell lists only Cycles + Employees). Routes are inside the proxy-guarded
  cabinet group, so an unauthenticated request redirects to sign-in with `next` (NFR-SEC-01). Single
  HR account ⇒ any valid session is HR; no separate forbidden path (spec exclusion).

## Out of scope (spec exclusions)

Template editor/authoring, question types beyond scale|open, per-cycle customisation (cycle-time
snapshot is the cycles slice), runtime localisation of seeded content, and a forbidden/403 path for
preview (single-account MVP).
