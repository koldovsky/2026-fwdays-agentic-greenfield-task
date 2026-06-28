## 1. Pure logic + tests-first (TC-PURE-01, TC-VALID-01, red before green)

- [ ] 1.1 Write `lib/cycles/link-token.test.ts` FIRST (red), `// @trace FR-CYCLE-02`: `generateCycleToken()`
  returns a URL-safe base64url string of the expected length (charset `[A-Za-z0-9_-]`), a large sample
  is all-distinct (no collisions), and tokens contain no separator / sequential pattern.
- [ ] 1.2 Write `lib/cycles/snapshot.test.ts` FIRST (red), `// @trace FR-CYCLE-03`: `buildTemplateSnapshot`
  yields name+methodology+ordered questions equal to the source at build time; mutating the source
  object afterward does NOT change a previously-built snapshot; the snapshot parses against
  `snapshotSchema`; a malformed snapshot is rejected.
- [ ] 1.3 Write `lib/cycles/status.test.ts` FIRST (red), `// @trace FR-CYCLE-04`: `deriveStatus`
  returns `done` when completedAt set (even past deadline), `expired` when incomplete and now>deadline,
  `collecting` otherwise; `daysRemaining` is positive for a future deadline and ≤0 (overdue) for a past
  one; `isResponseComplete` true only when every required question has a valid answer (scale value
  matches an anchor; open non-empty), ignoring optional questions.
- [ ] 1.4 Write `lib/schemas/cycle.test.ts` FIRST (red), `// @trace FR-CYCLE-01`: `createCycleInputSchema`
  ACCEPTS a strictly-future ISO `YYYY-MM-DD` within 365 days; REJECTS the locale form `28.06.2026`,
  today, a past date, `9999-12-31` (>365d), an oversized id, and a missing template/subject — each
  flagged on the right field. Inject "today" so the test is deterministic.
- [x] 1.5 Implement `lib/cycles/{link-token,snapshot,status}.ts` and `lib/schemas/cycle.ts` (types via
  `z.infer`; snapshot/cycle schemas reuse the `templates` question/anchor schemas) to turn 1.1–1.4
  green. Framework-free; no `Date.now()` inside (inject `now`/`today`); no casts. (TC-PURE-01, TC-VALID-01, TC-TS-01)

## 2. i18n (NFR-I18N-01, BC-BRAND-01)

- [x] 2.1 Extend `lib/i18n/uk.ts` (+ `en.ts`) with a `cycles` namespace: list columns/labels, status
  labels (collecting/done/expired + overdue), create-form labels + the specific deadline/field
  validation messages, days-remaining/overdue phrasing, empty/error copy, detail labels. Sentence case,
  no exclamation marks, no emoji. `Messages` in sync.

## 3. Create action (boundary + transaction, FR-CYCLE-01/02/03, NFR-SEC-01)

- [x] 3.1 Add `app/(cabinet)/cycles/actions.ts` `createCycle` (`"use server"`): assert `getCurrentHrUser()`;
  `createCycleInputSchema.safeParse`; verify template exists and subject exists AND is not archived
  (inline error, no 500); then in a `db.$transaction` build+`snapshotSchema.parse` the snapshot, mint a
  unique `generateCycleToken()` (retry on P2002 token collision, bounded), and create the cycle
  `collecting`. Typed `{ ok:true; id } | { ok:false; fieldErrors }`; never a raw 500. (FR-CYCLE-01/02/03)

## 4. List + create + detail UI (FR-CYCLE-05, FR-SHELL-03)

- [x] 4.1 Add `app/(cabinet)/cycles/queries.ts` — list cycles with subject + parsed snapshot; per-row
  derive status (`deriveStatus`), days remaining, and answered/total (total = required snapshot
  questions; answered = persisted answers).
- [x] 4.2 Replace `app/(cabinet)/cycles/page.tsx` placeholder with the real list (subject, methodology,
  days remaining/overdue, answered/total, TEXT status label), rows link to `/cycles/[id]`; PageHeader
  "Create cycle"; empty/loading/error states. (FR-CYCLE-05, FR-SHELL-03)
- [x] 4.3 Add the create form (client; design-system primitives): choose template + non-archived
  employee + future date (`<input type=date>` ⇒ ISO); validate via `createCycleInputSchema`, render
  `fieldErrors`; on success go to the new cycle. (FR-CYCLE-01)
- [x] 4.4 Add `app/(cabinet)/cycles/[id]/page.tsx` — minimal detail: subject, methodology, deadline,
  status, snapshot questions in order; unknown id ⇒ calm Ukrainian not-found, never a 500. (copy-link
  + respondent flow are later slices.)

## 5. Verify (maker ≠ checker)

- [x] 5.1 `npm run lint && npx tsc --noEmit && npm test && npm run build` all green; no `any`, no casts,
  no `@ts-ignore`; console silent. (NFR-DX-01, NFR-OBS-01, TC-TS-01)
- [ ] 5.2 Static + review verification: create rejects locale/past/out-of-range deadlines and
  archived/unknown subject + unknown template at the Zod/DB boundary (no 500); a created cycle has a
  unique token + frozen snapshot + `collecting`; later template changes don't alter the snapshot;
  status derives correctly; list shows all five columns with a text status label; behind the proxy
  guard. Eyes-on-pixels deferred to Phase 6 vision-verify (no Playwright, TC-TEST-01).
- [ ] 5.3 Independent review pass (review-gate, separate agents; maker ≠ checker) against FR-CYCLE-01..05
  and the typing/validation/privacy rules, plus the create-and-launch atomic design decision, before archive.
