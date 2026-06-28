## 1. Schemas + tests-first (TC-VALID-01, TC-PURE-01, red before green)

- [x] 1.1 Write `lib/schemas/template.test.ts` FIRST (red), `// @trace FR-TPL-01, FR-TPL-02`: assert
  `templateSchema`/`questionSchema`/`anchorSchema` ACCEPT a well-formed template (mixed scale+open,
  contiguous orders, unique integer anchors) and REJECT, per the spec: over-length name (>200);
  question text empty/whitespace-only and >500; unknown type (`multiple-choice`); `scale` with
  empty/missing anchors; anchor missing value or label; non-canonical anchor value (`"3"`, `3.5`,
  `"3,5"`, `"03"`); duplicate anchor values; `open` carrying anchors; duplicate or non-contiguous
  question `order` (gap, or not starting at 1); empty question list; missing name/methodology.
  (TC-VALID-01, TC-PURE-01)
- [x] 1.2 Write `lib/templates/orderedQuestions.test.ts` FIRST (red), `// @trace FR-TPL-01`: questions
  returned sorted ascending by `order`, deterministic, input not mutated.
- [x] 1.3 Implement `lib/schemas/template.ts` (`anchorSchema`, `questionSchema`, `templateSchema`,
  types via `z.infer`) — strict integer anchor value (no coercion), refinements for scale/open anchors,
  unique+contiguous order — and `lib/templates/orderedQuestions.ts`, to turn the tests green. No
  parallel types, no casts; framework-free. (FR-TPL-01, FR-TPL-02, TC-VALID-01, TC-TS-01)

## 2. Seed data + seed script (FR-TPL-01)

- [x] 2.1 Add `lib/templates/seed-data.ts` — two templates (`Probation check-in`, `Peer feedback`),
  distinct methodologies, each a mix of `scale` (labelled integer anchors) and `open` questions,
  `order` contiguous from 1. Add a test (`lib/templates/seed-data.test.ts`, `@trace FR-TPL-01`)
  asserting both parse cleanly via `templateSchema` and have ≥1 question and distinct names.
- [x] 2.2 Add `scripts/seed-templates.mts` — `templateSchema.parse` each seed template, then upsert
  (by name) the template + questions via `lib/db`; idempotent, re-runnable, never deletes. Wire it as
  `prisma db seed` (in `prisma.config.ts`) and/or an npm script. (FR-TPL-01, FR-TPL-03)

## 3. i18n (NFR-I18N-01, BC-BRAND-01)

- [x] 3.1 Extend `lib/i18n/uk.ts` (+ `en.ts`) with a `templates` namespace: list title, preview
  labels (methodology, "preview" affordance), the read-only/preview note, and the not-found copy.
  Sentence case, no exclamation marks, no emoji. `Messages` in sync.

## 4. Read-only routes (FR-TPL-03, FR-SHELL-03, NFR-SEC-01)

- [x] 4.1 Add `app/(cabinet)/templates/page.tsx` (server) — list seeded templates (name + methodology),
  each linking to its preview; `EmptyState` when none; cabinet `error.tsx` on fetch failure. No nav
  entry. (FR-TPL-01, FR-SHELL-03)
- [x] 4.2 Add `app/(cabinet)/templates/[id]/page.tsx` (server) — load template + ordered questions;
  unknown id → a calm Ukrainian not-found state (tokens), never a raw 500. Render the respondent
  preview: name, methodology, each question in order; `scale` → labelled anchors as a read-only option
  list; `open` → read-only free-text prompt; saves nothing. (FR-TPL-03, NFR-A11Y-01)

## 5. Verify (maker ≠ checker)

- [x] 5.1 `npm run lint && npx tsc --noEmit && npm test && npm run build` all green; no `any`, no casts,
  no `@ts-ignore`; console silent. (NFR-DX-01, NFR-OBS-01, TC-TS-01)
- [x] 5.2 Static + review verification: schemas reject every spec "rejected at the boundary" case; both
  seed templates parse and seed idempotently; preview renders questions in order (scale anchors / open
  prompt) and saves nothing; unknown id → not-found, not 500; preview behind the proxy guard. Eyes-on-
  pixels deferred to Phase 6 vision-verify (no Playwright, TC-TEST-01).
- [x] 5.3 Independent review pass (review-gate, separate agents; maker ≠ checker) against FR-TPL-01..03
  and the typing/validation rules before archive.
