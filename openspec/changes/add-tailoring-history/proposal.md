# Tailoring history for paid users

## Why

The PRD promises tailoring history (`FR-TAILOR-04`, `FR-HISTORY-01/02`): a
logged-in **paid** user should see a list of their past tailorings (date, job
title extracted from the JD, match score) and be able to re-open any one in the
result view. Free users see the current-session result only.

Today this is **entirely unbuilt in the write path**. `tailoring-repo.ts`
already exposes `save` / `listByUser` / `findById` (and cites these FR IDs), but
**nothing in the live flow ever calls `save`** — the repo is exercised only by
the GDPR export/delete routes and integration tests. No `cv_profiles`,
`job_descriptions`, or `tailorings` row is written at upload, analyze, or
generate. So a paid user's tailorings vanish on refresh, and the AccountMenu has
no history destination. This change wires the persistence + read + UI seams.

A schema fact shapes the design: `tailorings.cv_profile_id` is `NOT NULL`, but
the generation route holds only the *structured* `cvProfile` (skills/sentences),
never the raw CV text needed to persist an encrypted `cv_profiles` row. History
needs the job title, score, checklist, and bullets — **not** the CV blob (the
bullets already embed the grounded evidence). Rather than push CV-at-rest
encryption onto the hot generation path, this change makes `cv_profile_id`
nullable and defers CV linkage to its own future concern.

## What Changes

- **Migration `0004`** on `tailorings`: add `job_title text` (nullable) and
  `ALTER COLUMN cv_profile_id DROP NOT NULL`.
- **`extractJobTitle(jobDescription)`** — a pure `shared/lib` helper (TC-PURE-01)
  that heuristically extracts a role title from JD text, or `null`.
- **Persist-on-generate (paid only, best-effort).** After `/api/tailor/generate`
  emits its terminal `result` event for a **paid** signed-in user, persist a
  `job_descriptions` row + a `tailorings` row (with the extracted `job_title`,
  `cv_profile_id` NULL) and its checklist + bullets. The save is
  **best-effort/non-fatal**: it runs after the result has already streamed, and
  any failure is logged server-side only and never breaks the stream or charges
  differently (NFR-OBS-01, FR-TAILOR-03). Free/anonymous runs persist nothing
  (`FR-TAILOR-04`).
- **Read routes.** `GET /api/tailoring` returns the current user's tailoring
  summaries (paid gate). `GET /api/tailoring/:id` returns one full tailoring,
  **IDOR-gated**: a record owned by another user returns `404` (not `403`) so
  existence is not disclosed (NFR-SEC-02, info-disclosure).
- **`views/history` slice.** A list view (job title · match score · date, newest
  first, with a re-open link) and a detail view that re-opens the stored
  checklist + bullets in the existing `ResultView` (read/edit). Thin `/history`
  and `/history/:id` App Router leaves delegate to the slice.
- **AccountMenu.** Add a real History link for signed-in users (honest state:
  paid users navigate; the entry is a plain link — the paid gate lives on the
  route/view, which surfaces the paywall for a free user rather than a dead link).
- **i18n** `history` block, Ukrainian-first with English fallback (NFR-I18N-01).

## Impact

- **Specs:** new `history` capability (this change's delta).
- **Schema:** additive migration `0004` (nullable column + relaxed constraint —
  no data migration, backward compatible with existing rows).
- **Hot path:** the generation route gains a best-effort post-result save behind
  the existing paid branch; a failure there cannot affect the user's result.
- **Privacy:** persisted data is already covered by the GDPR export/delete
  service (it reads `tailorings` via the same repo) — history rows flow into a
  user's JSON export and are removed on account delete via FK cascade
  (NFR-GDPR-01/02). No new PII category; CV text is *not* persisted by this path.
- **Out of scope:** persisting the CV profile / raw text at run time (CV-at-rest
  linkage), and re-running a stored tailoring against a fresh model pass.
