# Tasks — add-tailoring-history

## 1. Schema

- [ ] 1.1 Migration `0004_tailoring_history.sql`: `ALTER TABLE tailorings ADD COLUMN job_title text` and `ALTER COLUMN cv_profile_id DROP NOT NULL` (additive, backward compatible; no data migration)
- [ ] 1.2 Extend the pglite persistence integration test to run `0004` and assert a tailoring can be saved with `job_title` set and `cv_profile_id` NULL, then listed + found by id

## 2. Job-title extraction (pure)

- [ ] 2.1 `extractJobTitle(jobDescription: string): string | null` in `shared/lib` — deterministic, framework-free (TC-PURE-01); heuristic over the first meaningful JD line(s); `null` when nothing plausible
- [ ] 2.2 Unit tests: role line extracted, noise/empty → null, length bounded, Ukrainian + English inputs

## 3. Repository

- [ ] 3.1 Extend `tailoring-repo`: `jobTitle` on `SaveTailoringInput` / `TailoringSummary` / `TailoringRecord`; `cvProfileId: string | null`; persist + `SELECT job_title` in `save` / `listByUser` / `findById`
- [ ] 3.2 Minimal `job-description-repo` (`save(userId, rawText) → { id }`) over the `Queryable` port; export from `shared/lib/db`
- [ ] 3.3 Repo integration tests: `save` persists job_title + null cv_profile_id; `listByUser` returns job_title newest-first; `findById` round-trips; cross-user is filtered by the caller, not the repo

## 4. Persist-on-generate (paid, best-effort)

- [ ] 4.1 `persistTailoring` server helper: given the generation result + userId + jdText, insert a `job_descriptions` row + the tailoring (extracted `job_title`, `cv_profile_id` NULL), mapping ChecklistStatus → `met|partial|gap|overclaim-risk` and bullet grounding → `met|partial|overclaim|manual`, `included` from `includedInExport`
- [ ] 4.2 Call it in `/api/tailor/generate` after the terminal `result` event **only when `kind === "paid"`**, wrapped in try/catch — log server-side, never break the stream (NFR-OBS-01, FR-TAILOR-03)
- [ ] 4.3 Route test: paid run persists (fake repo asserts `save` called with mapped inputs); free/anon run does not; a throwing repo still yields the full result stream

## 5. Read routes

- [ ] 5.1 `GET /api/tailoring` — current user's summaries (paid gate; 401 anon, 402/empty free), newest first
- [ ] 5.2 `GET /api/tailoring/[id]` — full record; **IDOR: 404 when `record.userId !== currentUserId`** (existence not disclosed, NFR-SEC-02); 401 anon
- [ ] 5.3 Route tests: owner 200; other-user 404 (not 403); anon 401; malformed id → 404

## 6. `views/history` slice

- [ ] 6.1 Scaffold `views/history` (fsd-scaffold): `ui/`, `api/`, `index.ts`; design-system tokens only (no new hues/emoji/icons — DESIGN.md)
- [ ] 6.2 List UI: job title (fallback label when null) · match score · date, newest first, each a re-open link; empty state when no history
- [ ] 6.3 Detail UI: re-open stored checklist + bullets in `ResultView` (read/edit); back-to-list link
- [ ] 6.4 Thin `/history` + `/history/[id]` App Router leaves delegating to the slice, paid entitlement resolved server-side
- [ ] 6.5 Slice tests: list renders rows + empty state; detail renders stored bullets; re-open link targets `/history/:id`

## 7. Wiring + i18n

- [ ] 7.1 `history` i18n block in `types.ts` + `ua.ts` + `en.ts` (list heading, empty state, re-open, back, neutral title fallback, date/score labels) — Ukrainian-first (NFR-I18N-01)
- [ ] 7.2 AccountMenu: real History link (no `href="#"`)
- [ ] 7.3 AccountMenu test asserts the History link present + targets `/history`

## 8. Verify + archive

- [ ] 8.1 `yarn lint` + `yarn build` + `yarn test` green
- [ ] 8.2 verifier subagent (build/lint/test + FR-HISTORY-01/02, FR-TAILOR-04, NFR-SEC-02 evidence)
- [ ] 8.3 checker subagent (maker≠checker: IDOR, paid gate, honesty, FSD boundaries, DESIGN)
- [ ] 8.4 `openspec validate add-tailoring-history`; archive after review
