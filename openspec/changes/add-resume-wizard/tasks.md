## 1. Loop split (analyze / generate phases)

- [ ] 1.1 Extract `runAnalysisPhase(deps, input)` from `loop.ts`: `parse-cv → extract-requirements → score`, reordering `score` earlier (pure, behavior-preserving per `design.md` §1); terminal `{ type: "analysis"; checklist; matchScore; cvProfile; requirements }` event
- [ ] 1.2 Extract `runGenerationPhase(deps, { cvProfile, requirements, confirmedAnswers })`: `generate-bullet → ground-bullet*`, terminal `{ type: "result"; result }` event
- [ ] 1.3 Reimplement `runTailoringLoop` as both phases run back-to-back with `confirmedAnswers: []`; assert the existing `loop.test.ts` suite (35 files / 192 tests baseline) still passes unchanged
- [ ] 1.4 Fix `shared/lib/evals/trajectory.ts`'s `orderOk` rank table for the reordered `score` step (design.md Risks — easy to miss, breaks honesty-eval silently if skipped)
- [ ] 1.5 `POST /api/tailor/analyze` route handler (NDJSON, same streaming/error-handling shape as `src/app/api/tailor/route.ts`)
- [ ] 1.6 `POST /api/tailor/generate` route handler (NDJSON, body `{ cvProfile, requirements, confirmedAnswers }`)
- [ ] 1.7 `views/tailor-workspace` owns the wizard state machine (`analyze | confirm | clarify | generate | export | failed`, FR-WIZARD-05 labels); confirm step is a client-only transition, no server call

## 2. Clarifying-question skill

- [ ] 2.1 Scaffold `entities/clarifying-question` (fsd-scaffold skill): `ClarifyingQuestion`, `ClarifyingAnswer` (`answered | skipped | declined`) types
- [ ] 2.2 `deriveClarifyingQuestions(rows, opts?)` — pure, deterministic, template-based; input narrowed to `{ requirement.text, requirement.keywords, item.status }` for `partial`/`gap` rows only (FR-WIZARD-02); bounded by `MAX_CLARIFYING_QUESTIONS`, prioritized gap-before-partial, must-have-before-nice-to-have
- [ ] 2.3 Unit tests: bound enforcement, priority ordering, no-weak-requirements-means-no-questions, no access to unrelated row data
- [ ] 2.4 Add `derive-clarifying-questions` to `shared/lib/evals`'s `SkillName` union + trace it in the loop the same way `parse-cv`/`score` are traced today (deterministic, no `llmPayload`)
- [ ] 2.5 `features/clarify-tailoring` (new slice): UI for answer / skip / decline per question (FR-WIZARD-03), feeds confirmed answers into the generate-phase request

## 3. Evidence tagging (BC-HONESTY-03)

- [ ] 3.1 `entities/bullet/model/types.ts`: `EvidenceSource` discriminated union (`cv` | `user-confirmed`), `Bullet.sourceSentence` → `Bullet.source` (design.md §3)
- [ ] 3.2 `sourceLabel(source, locale)` helper in `entities/bullet/lib/`; export from the barrel
- [ ] 3.3 Update `entities/bullet/lib/export.test.ts` fixtures to the new shape
- [ ] 3.4 `shared/lib/llm/types.ts`: `GroundingInput`/`GenerationInput` gain optional `confirmedAnswers?: readonly ConfirmedAnswerEvidence[]`; `GroundingVerdict` gains `evidenceKind?: "cv" | "user-confirmed"`
- [ ] 3.5 `shared/lib/llm/prompts.ts`: both prompt builders serialize the confirmed-answers pool as a distinct, labeled block (never merged with CV sentences or the JD/requirements the isolated pass must not see)
- [ ] 3.6 `shared/lib/llm/parse.ts`: `parseGroundingResponse` tolerantly reads `evidenceKind`, defaulting absent → `"cv"` (backward compat with existing fixtures)
- [ ] 3.7 Update `shared/lib/llm/prompts.test.ts` + `parse.test.ts` with confirmed-answer cases, incl. the absent-field default
- [ ] 3.8 `features/run-tailoring/lib/loop.ts` (`runGenerationPhase`): assemble `bullet.source` from `verdict.evidenceKind`; pass `confirmedAnswers` into both prompt builders' ctx
- [ ] 3.9 Update `features/run-tailoring/lib/loop.test.ts` fixtures/assertions (`sourceSentence` → `source`); add a confirmed-answer-grounds-a-bullet case
- [ ] 3.10 `widgets/bullet-list/ui/BulletList.tsx`: read `bullet.source`; render the user-confirmed label via the existing `GroundingBadge` `label` override — no new status color (design.md §3)
- [ ] 3.11 Update `widgets/bullet-list/ui/BulletList.test.tsx`: fixtures + a case asserting the user-confirmed label renders distinctly from the CV-sourced one
- [ ] 3.12 `shared/lib/i18n/{types.ts,ua.ts,en.ts}`: add `bullets.sourceCv` / `bullets.sourceUserConfirmed` keys (both locales, `i18n.test.ts` enforces identical key sets)
- [ ] 3.13 Author a `specs/bullets/spec.md` MODIFIED delta for the widened grounding-indicator requirement (evidence now has two source kinds) — do not silently redefine the baseline without a delta
- [ ] 3.14 (Lower priority, flag only) `entities/tailoring/model/types.ts`'s `TailoringBullet` mirror gains the same `source` shape when next touched by persistence work

## 4. Export

- [ ] 4.1 `ExportDocument` format-agnostic model (header, exportable bullets in order, footer line) — single source of truth for all three formats (design.md §4)
- [ ] 4.2 `features/export-resume` (new slice): builds `ExportDocument` from a `Tailoring`/`Bullet[]`, applies the free-tier footer default (FR-EXPORT-04) pending real entitlement wiring
- [ ] 4.3 Clipboard copy (FR-EXPORT-01): plain-text renderer of `ExportDocument`, client-side, `navigator.clipboard.writeText`
- [ ] 4.4 Add `@react-pdf/renderer` dependency; `POST /api/export/pdf` route handler; register a Cyrillic-complete static font (e.g. Inter/PT Sans) independent of the web UI's Bricolage Grotesque (design.md §4, resolves the Cyrillic gap for this surface only)
- [ ] 4.5 Add `docx` dependency; `POST /api/export/docx` route handler; named cross-platform font (e.g. Calibri) — no glyph-embedding step needed for this format
- [ ] 4.6 Vet both new dependencies' bundle size / cold-start impact against the existing Node route budget (design.md Risks) before wiring into the UI
- [ ] 4.7 `widgets/wizard-stepper`: the Export step's UI (copy / PDF / DOCX actions), composed into `views/tailor-workspace`

## 5. Evals, verify & review

- [ ] 5.1 honesty-eval: confirmed-answer evidence is independently re-verified by grounding, never trusted from generation's claim alone (BC-HONESTY-03, mirrors the existing CV-evidence guarantee)
- [ ] 5.2 honesty-eval: `deriveClarifyingQuestions` never receives CV text, JD text, or unrelated requirements — assert on the function's input type, not just behavior
- [ ] 5.3 agent-verify: build/tsc/lint/tests; evidence for FR-WIZARD-01..05, FR-EXPORT-01..04, BC-HONESTY-03
- [ ] 5.4 agent-verify: exported PDF/DOCX round-trip check — Ukrainian text renders correctly, footer present/absent matches entitlement default
- [ ] 5.5 Independent checker-review vs PRD + DESIGN.md (no new brand hues, no new icon library) + FSD import rules (new slices import only downward, only through barrels)
- [ ] 5.6 Sync `specs/wizard/spec.md` (new) and the `specs/bullets/spec.md` MODIFIED delta into baseline on archive (`openspec-archive-change`)
