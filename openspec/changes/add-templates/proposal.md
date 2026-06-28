## Why

A cycle is created from a template, so the app must ship with at least two seeded, read-only
templates (e.g. probation check-in, peer feedback), each with a name, a methodology tag, and an
ordered list of typed questions; HR can preview any template as the respondent would see it
(FR-TPL-01, FR-TPL-02, FR-TPL-03). This change implements the `templates` baseline spec (slice 2b in
`docs/mvp-capability-plan.md`).

The `Template` and `Question` models already exist in `prisma/schema.prisma` (Question has
`order Int`, `type QuestionType (scale|open)`, `required Boolean`, `anchors Json?`) from the
foundation slice — no schema change. The question/anchor/template shape is defined once as Zod
schemas in `lib/schemas/` (the canonical home the data-model spec references), with the exact
decidable rules from the spec, types via `z.infer`. Seed data is validated against those schemas at
the seeding boundary before any write (TC-VALID-01, TC-PURE-01). Templates are read-only — no editor,
no create/edit/delete path is exposed (FR-TPL-03).

## What Changes

- Add `lib/schemas/template.ts` — `anchorSchema` (value strict JSON integer, unique within a question;
  label non-empty), `questionSchema` (stable id, order int, text trimmed 1–500, type `scale|open`,
  required bool; `scale` requires a non-empty unique-value anchor list, `open` carries none),
  `templateSchema` (name trimmed 1–200, non-empty methodology, non-empty questions whose `order`
  values are exactly the unique contiguous integers 1..N). Types via `z.infer`. Framework-free.
- Add `lib/templates/orderedQuestions.ts` — a pure helper returning a template's questions sorted
  ascending by `order` (deterministic). Unit-tested.
- Add `lib/templates/seed-data.ts` — the two seeded templates as plain data, each validated by
  `templateSchema`. Question/anchor labels are the seeded template content (not runtime-localised).
- Add `scripts/seed-templates.mts` — parse `seed-data` with `templateSchema` and upsert the templates
  + questions via the shared `lib/db` client; idempotent (re-runnable). Wire `prisma db seed` / an npm
  script. Read-only thereafter.
- Add the cabinet routes `app/(cabinet)/templates/page.tsx` (list seeded templates) and
  `app/(cabinet)/templates/[id]/page.tsx` (read-only preview rendered as the respondent would see it:
  name, methodology tag, each question in order — `scale` anchors as a labelled option list, `open`
  as a free-text prompt; nothing is saved). Empty/loading/error + a calm not-found for an unknown id.
  No nav entry (cabinet-shell intentionally lists only Cycles + Employees; preview is reached by URL
  and, later, from cycle creation).
- Extend `lib/i18n/uk.ts` + `en.ts` with a `templates` namespace (list/preview/not-found copy) —
  sentence case, no exclamation marks, no emoji.

## Impact

- Affected specs: `templates` (implements the existing baseline; no spec change).
- Affected code: `lib/schemas/template.ts` (+test), `lib/templates/**` (+test), `scripts/seed-templates.mts`,
  `app/(cabinet)/templates/**`, `lib/i18n/{uk,en}.ts`, `package.json` (seed script).
- No schema/migration change (Template/Question already exist). No new dependency.
- Travelling standards: NFR-I18N-01, NFR-A11Y-01, NFR-SEC-01 (preview behind the proxy guard), light
  theme only, BC-BRAND-01.
