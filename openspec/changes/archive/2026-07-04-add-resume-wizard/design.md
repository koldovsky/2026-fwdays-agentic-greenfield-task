# Design — add-resume-wizard

## Context

`runTailoringLoop` (`src/features/run-tailoring/lib/loop.ts`, shipped by
`add-agent-loop`) is one continuous async generator: `parse-cv →
extract-requirements → generate-bullet → ground-bullet* → score`, streamed
over a single `POST /api/tailor` request as NDJSON until a terminal `result`
or `error` event. There is no pause in it anywhere — the PRD's new `wizard`
capability (`FR-WIZARD-01..05`) requires exactly one: show the checklist +
match score, stop, let the user think, optionally answer clarifying
questions, and only then generate bullets. `BC-HONESTY-03` additionally says
a confirmed clarifying answer is a second, distinctly-tagged evidence source
for grounding, on top of CV sentences. Nothing in the repo does export today
(`FR-EXPORT-01..04`, confirmed by grep — zero PDF/DOCX/clipboard code
exists), so this change also has to originate that capability, and per the
task it becomes the wizard's terminal step since no other change owns it.

## Goals

- A real, resumable pause between analysis and generation (`FR-WIZARD-01`).
- Clarifying questions that cannot fish for a specific answer, by
  construction (`FR-WIZARD-02`).
- Confirmed answers become grounding evidence, visibly distinct from
  CV-sourced evidence, without loosening `BC-HONESTY-01`'s isolation
  guarantee (`FR-WIZARD-04`, `BC-HONESTY-03`).
- A working PDF/DOCX/clipboard export whose Ukrainian rendering does not
  inherit the web UI's Bricolage-Grotesque Cyrillic gap (`FR-EXPORT-01..04`).
- Minimal, mechanical churn to the existing `add-agent-loop` contract — the
  one-shot pipeline keeps working for anything that doesn't want the wizard.

## Decisions

### 1. State machine & protocol

**Decision: split `runTailoringLoop` into two invocable phases, exposed as
two route handlers, with the wizard's paused state held client-side between
requests. `POST /api/tailor` (one-shot) stays, now implemented as both
phases run back-to-back with an empty confirmed-answers pool.**

Concretely:

- **`runAnalysisPhase(deps, input) → AsyncGenerator<AnalysisEvent,
  AnalysisTrace>`** — `parse-cv → extract-requirements → score`. This is a
  **reorder**, not new logic: `score` only ever depended on `requirements` +
  `cvProfile` (`src/shared/lib/scoring/checklist.ts`), never on generated
  bullets, so moving it up two steps is behavior-preserving and pure-function
  safe. Terminal event is a new `{ type: "analysis"; checklist; matchScore;
  cvProfile; requirements }` — `cvProfile` and `requirements` are included
  in the payload (not just the display-ready checklist) because the client
  must hand them back unchanged to the generate phase; both are already
  JSON-serializable, contain no PII beyond what the user already pasted, and
  carry no user ID (`NFR-SEC-02` unaffected).
- **`runGenerationPhase(deps, { cvProfile, requirements, confirmedAnswers })
  → AsyncGenerator<GenerationEvent, GenerationTrace>`** — `generate-bullet →
  ground-bullet*`, unchanged except both skills' context grows to optionally
  include `confirmedAnswers` (see §3). Terminal event is the existing
  `{ type: "result"; result }`.
- **`runTailoringLoop`** (existing export, kept) becomes a thin composition:
  run the analysis phase, then the generation phase with
  `confirmedAnswers: []`, forwarding both phases' events. Every existing
  `add-agent-loop` test (35 files / 192 tests, `docs/current-state.md`)
  keeps passing unchanged because the externally observable event sequence
  and final `result` shape are identical when there's no pause.
- **New route handlers**: `POST /api/tailor/analyze` (NDJSON, terminal
  `analysis` event, mirrors today's `/api/tailor` streaming/error handling)
  and `POST /api/tailor/generate` (NDJSON, terminal `result` event, body is
  `{ cvProfile, requirements, confirmedAnswers }` echoed back from the
  analyze response plus the wizard's collected answers). `/api/tailor`
  itself is untouched at the wire level.
- **The pause is a client-side wait, not an open connection.** Both new
  routes are ordinary request/response NDJSON streams that complete and
  close, same as today's `/api/tailor` — nothing is left half-open while the
  user reads the checklist or answers questions. `views/tailor-workspace`
  holds the wizard's state machine (`analyze | confirm | clarify | generate |
  export | failed`, naming taken straight from `FR-WIZARD-05`'s labels) in
  React state between the two POSTs.

**Alternatives considered and rejected:**

- *Keep one continuous stream and pause the server mid-request* (the route
  handler awaits a promise that resolves when a second HTTP call arrives on
  a "resume" endpoint, holding the first connection open). Rejected: the
  confirm/clarify steps have no time bound (a user can read the checklist for
  minutes), and an idling serverless function or long-lived open stream is
  fragile — proxy/browser timeouts, no reconnect-after-refresh, and real
  dollar cost for a function doing nothing. The route already declares
  `maxDuration = 60` for the *active* work; a human-paced pause has no
  business inside that budget.
- *Server-held session, client holds only an opaque id* (analysis result
  cached in Redis or a `tailoring_drafts` Postgres row, keyed by a
  `wizardSessionId`). This is the more conventional shape and avoids
  re-sending `cvProfile`/`requirements` over the wire — but Redis isn't stood
  up yet (`add-docker-dev-env` is spec-only, `docs/current-state.md`
  Blockers) and `add-persistence`'s tables aren't wired to in-progress
  wizard state. Client-held state needs zero new infra and ships this
  increment; it's flagged below as the natural upgrade once either lands.
- **Security note on client-held state:** a tampered `requirements` or
  `cvProfile` payload on the `/generate` call can only change *what the
  model is asked to write toward* — it cannot make a bullet register as
  `grounded` without real CV (or confirmed-answer) evidence, because
  `ground-bullet` re-verifies independently against the CV text server holds
  no matter what the client sends. The honesty guarantee (`BC-HONESTY-01`)
  does not depend on trusting the client's copy of the analysis.
- **`STEP_CAP` (currently 40, `loop.ts`) stays one exported constant reused
  by both phases** rather than being split into two smaller budgets — two
  independently-capped phases is strictly safer than one shared cap (neither
  phase can starve the other's retry budget), and it's a one-line change
  (call `runStep`'s cap check per-phase-generator instead of per-whole-loop).
- **`gradeTrajectory`'s `orderOk` rank table** (`shared/lib/evals/trajectory.ts`)
  encodes today's step order; moving `score` earlier means that table's
  ranking must move too (`tasks.md` §2 calls this out explicitly — it is a
  real, easy-to-miss test-breaking edge, not hand-waved).

### 2. Clarifying-question generation

**Decision: a deterministic, template-based skill — no LLM call.** This is
both the literal reading of `FR-WIZARD-02` ("derived from those
requirements' keywords") and the same structural move `add-agent-loop`
already made for grounding: honesty/safety is enforced by *what data a step
can see*, not by asking a model to behave.

- New pure function `deriveClarifyingQuestions(rows, opts?)` in a new
  `entities/clarifying-question` slice (`lib/derive.ts`, framework-free,
  `TC-PURE-01` — 100% unit-testable with plain fixtures, same house style as
  `checklistItem`).
- **Input is narrow by construction**: only `requirement.text` +
  `requirement.keywords` + `item.status` for rows where `status` is
  `partial` or `gap`. It explicitly does **not** receive the CV profile, the
  raw JD text, the match score, or any other requirement's row — there is
  nothing in scope for the function to "fish" toward, because it has no
  model and no access to what a good answer would look like.
- **Bounded and prioritized** (`FR-WIZARD-02`'s "up to a bounded number"): a
  `MAX_CLARIFYING_QUESTIONS` constant (suggest 5), rows ordered `gap` before
  `partial`, `must-have` before `nice-to-have`, then original extraction
  rank — so the bound always keeps the highest-value gaps first.
- **Template shape** (Ukrainian-first, `NFR-I18N-01`, no exclamation points):
  one question per selected row, e.g. *"Вимога: {requirement.text}. Чи є у
  вас практичний досвід з {keywords.join(', ')}? Розкажіть коротко про
  конкретний випадок"* — phrased as an open, unpresumptive prompt for
  evidence, never as a yes/no confirmation of a specific claim.

**Honesty risk if this ever becomes LLM-authored (documented, not built
now):** an LLM asked to phrase a "more natural" question can smuggle in a
presupposition — *"You led a team of 12 using Kubernetes, right?"* —
fishing for a confirming click rather than eliciting a real answer. If a
future increment adds an LLM phrasing pass, it must follow the same
discipline as `BC-HONESTY-01`: a system prompt that forbids stating any
specific fact, number, technology claim, or outcome as already true, and a
context restricted to **only** `{ requirement.text, requirement.keywords }`
— explicitly never the CV, never the match score, never other bullets —
so there is nothing for the model to presuppose from in the first place. The
deterministic template already satisfies `FR-WIZARD-02` with zero honesty
risk, so this stays a documented option, not a task.

### 3. Evidence tagging (`BC-HONESTY-03`)

Today (`src/entities/bullet/model/types.ts`):

```ts
export type BulletGroundingStatus = "grounded" | "overclaim-risk";
export interface Bullet {
  readonly id: string;
  readonly text: string;
  readonly grounding: BulletGroundingStatus;
  readonly sourceSentence?: string;
  readonly includedInExport: boolean;
}
```

`grounding` itself does **not** need a third value — whether a bullet is
honestly backed is orthogonal to *which* evidence pool backs it. What has to
change is the shape of the evidence reference, from a bare string to a
discriminated union:

```ts
export type EvidenceSource =
  | { readonly kind: "cv"; readonly sentence: string }
  | { readonly kind: "user-confirmed"; readonly question: string; readonly answer: string };

export interface Bullet {
  readonly id: string;
  readonly text: string;
  readonly grounding: BulletGroundingStatus; // unchanged
  readonly source?: EvidenceSource;          // replaces sourceSentence
  readonly includedInExport: boolean;
}
```

`source` stays optional (absent for `overclaim-risk`, same as
`sourceSentence` today). A small pure helper — `sourceLabel(source, locale)`
in `entities/bullet/lib/` — centralizes turning a source into UI copy so
widgets stay presentational and the "which pool" wording lives in one place
(fed by new `shared/lib/i18n` keys, not hardcoded per widget).

**Grounding pass gets the wider evidence pool, and independently re-verifies
it — the isolation guarantee widens, it doesn't loosen:**

- `shared/lib/llm/types.ts`: `GroundingInput` gains an optional
  `confirmedAnswers?: readonly ConfirmedAnswerEvidence[]` field, alongside
  (never instead of) `cvSentences` — still **no** `jd`/`requirements`/
  generation transcript; the isolation `add-agent-loop` built stays intact,
  the evidence pool just has two named lanes instead of one.
  `GenerationInput` gains the same optional field, since `FR-WIZARD-04`
  says confirmed answers feed generation too — pass 1 may *draw on* a
  confirmed answer the same way it draws on a CV sentence, but pass 2 still
  independently checks the resulting bullet against the raw pool; it never
  trusts pass 1's claim about which answer backs it.
- `GroundingVerdict` gains `evidenceKind?: "cv" | "user-confirmed"`,
  tolerantly parsed (absent → treated as `"cv"`, so existing fixtures/tests
  that predate this field keep working — same tolerant-parsing house style
  as `parseGroundingResponse` already uses for malformed output).
- `shared/lib/llm/prompts.ts` (`buildGroundingPrompt`,
  `buildGenerationPrompt`): serialize the confirmed-answers pool as a clearly
  labeled second evidence block, distinct from the CV sentences block, so
  the model (and a human reading the prompt in a trace) can always tell
  which lane a piece of evidence came from.

**Every downstream file that needs to change, and why:**

| File | Change |
|------|--------|
| `src/entities/bullet/model/types.ts` | `sourceSentence?: string` → `source?: EvidenceSource` (the type change itself) |
| `src/entities/bullet/lib/export.ts` | No logic change (`applyExportDefaults`/`exportBullets` only touch `grounding`/`includedInExport` and spread `...bullet`), but its fixtures move off `sourceSentence` |
| `src/entities/bullet/lib/export.test.ts` | Fixtures updated to the new shape |
| `src/entities/bullet/index.ts` | Export `EvidenceSource` (+ `sourceLabel` if added here) from the barrel |
| `src/features/run-tailoring/lib/loop.ts` | The bullet-assembly line (`sourceSentence: grounding === "grounded" ? verdict?.evidence : undefined`) becomes `source: … ? { kind: verdict.evidenceKind ?? "cv", ... } : undefined`; `runGenerationPhase`'s ctx gains `confirmedAnswers` |
| `src/features/run-tailoring/lib/loop.test.ts` | Fixtures/assertions on `sourceSentence` → `source` |
| `src/shared/lib/llm/types.ts` | `GroundingInput`/`GenerationInput` gain `confirmedAnswers?`; `GroundingVerdict` gains `evidenceKind?` |
| `src/shared/lib/llm/prompts.ts` | Both prompt builders serialize the confirmed-answers block |
| `src/shared/lib/llm/prompts.test.ts` | New cases for the confirmed-answers block |
| `src/shared/lib/llm/parse.ts` | `parseGroundingResponse` tolerantly reads `evidenceKind` |
| `src/shared/lib/llm/parse.test.ts` | New cases incl. the absent-field default |
| `src/shared/lib/evals/trajectory.ts` | `orderOk`'s rank table reflects the reordered `score` step (see §1) |
| `src/widgets/bullet-list/ui/BulletList.tsx` | Reads `bullet.source` instead of `bullet.sourceSentence`; renders a distinct label (not a new color, see below) for `kind: "user-confirmed"` |
| `src/widgets/bullet-list/ui/BulletList.test.tsx` | Fixtures + a new case asserting the user-confirmed label renders |
| `src/shared/lib/i18n/{types.ts,ua.ts,en.ts}` | New `bullets.sourceCv` / `bullets.sourceUserConfirmed` keys (identical key sets enforced by `i18n.test.ts`) |
| `src/entities/tailoring/model/types.ts` | `TailoringBullet` (its own re-declared mirror, no cross-entity import) doesn't even carry `sourceSentence` today — lower priority, but should gain the same `source` shape when this aggregate is next touched (persistence), so history doesn't silently drop the distinction |

**Explicitly does NOT need to change:** `src/widgets/checklist-panel/**` —
it operates on requirement-level `ChecklistStatus`, never touches bullet
grounding/evidence at all.

**No new badge color.** `docs/DESIGN.md` fixes the status palette (`met`
green / `partial` yellow / `gap` red / `overclaim` orange) and forbids new
hues. `shared/ui`'s `GroundingBadge` already accepts a `label` override
(`GroundingBadgeProps.label`) independent of its `status` color — both
`kind: "cv"` and `kind: "user-confirmed"` bullets keep `status="met"` (both
are honestly grounded), and the two are distinguished only by the label text
+ the source line beneath, sourced from the new i18n keys. This is a
one-line reuse of an existing prop, not a new component.

### 4. Export (`FR-EXPORT-01..04`)

**One format-agnostic document model first.** A pure `ExportDocument` type
(candidate name/header, tailored bullets in export order, the `FR-EXPORT-04`
footer line) is the single source of truth for "what's in the export" —
built once from a `Tailoring`/`Bullet[]`, then rendered three ways (plain
text, PDF, DOCX). This is what prevents the classic bug where the footer
line is added to one renderer and forgotten in another.

- **Clipboard (`FR-EXPORT-01`)**: client-side only — format the
  `ExportDocument` as plain text, `navigator.clipboard.writeText`. No new
  dependency, no route handler.
- **PDF (`FR-EXPORT-02`)**: **`@react-pdf/renderer`**, not a
  headless-Chromium/Playwright print-to-PDF route.
  - *Why*: it's pure JS with no native binary or browser to bundle — a
    Chromium-based route needs a slimmed build (`@sparticuz/chromium` or
    similar) to fit a Vercel function, adds real cold-start latency (a
    browser process spinning up per request) and deployment complexity, for
    a résumé layout that doesn't need full CSS fidelity. `@react-pdf/renderer`
    composes the document from React components into PDF primitives
    directly in the same Node runtime already used for the Anthropic SDK
    route (`src/app/api/tailor/route.ts`'s `export const runtime = "nodejs"`
    pattern), so there's no new deployment shape.
  - *Font/Cyrillic handling is a genuinely separate concern from the web
    UI's font.* `@react-pdf/renderer` does not inherit `next/font` — fonts
    must be explicitly `Font.register()`-ed from a bundled TTF/OTF file. This
    is exactly the seam that lets the export sidestep the known
    Bricolage-Grotesque-has-no-Cyrillic-subset gap (`docs/current-state.md`
    Blockers): register a **different**, Cyrillic-complete static font for
    the export only (e.g. Inter or PT Sans, both ship full Cyrillic glyph
    sets as static files) — Bricolage Grotesque stays web-display-only and
    this gap never has to be "resolved" for the brand as a whole, only
    avoided for the one surface that actually needs Cyrillic glyphs
    guaranteed to render (a downloaded PDF opened offline, unlike a web page
    that can retry a font fetch).
  - *Trade-off accepted*: `@react-pdf/renderer`'s flexbox-like layout model
    is less expressive than full CSS — fine for a single-column résumé, would
    not be fine for pixel-matching the on-screen two-column result view. If
    visual parity with the web UI ever becomes a hard requirement, revisit
    Playwright/Chromium then; don't build that cost now for a need that
    doesn't exist yet.
- **DOCX (`FR-EXPORT-03`)**: **`docx`** (npm package) — pure JS, no native
  deps, builds a `Paragraph`/`Run` tree from the same `ExportDocument`.
  Cyrillic is not a font-embedding problem in DOCX the way it is in PDF:
  Word/LibreOffice resolve the run's named font at *open* time from the
  reader's own installed fonts, so naming a common cross-platform font
  (e.g. "Calibri") is sufficient — no glyph-embedding step needed, no
  Bricolage question at all for this format.
- **Both are pure-JS, no native binaries** → negligible added cold-start vs.
  the existing Node runtime; bundle size is comparable to the Anthropic SDK
  already shipped in the same route.
- **`FR-EXPORT-04` footer**: gated on a plan/entitlement check that doesn't
  exist yet (`add-payments-emulator` is speced, not built). Until it lands,
  default to **always** showing the free-tier footer — the calmer,
  non-overclaiming failure direction, consistent with how this repo already
  treats every other fail-honest default (`NFR-OBS-01`).

## Non-goals

- Persisting in-progress wizard state server-side (Redis/Postgres) — the
  client-held-state approach in §1 covers this increment; revisit once
  `add-docker-dev-env` or `add-persistence`'s tailoring tables are wired to
  in-flight wizard runs.
- LLM-authored clarifying questions — documented option in §2, not built.
- Pixel-parity PDF export via headless Chromium — see §4 trade-off.
- Re-scoring or re-checking the checklist after generation — the checklist
  is CV+JD-derived only and does not change once bullets exist.
- Wiring the real `FR-EXPORT-04` entitlement check — depends on
  `add-payments-emulator` landing first; this change ships the calmer
  default in the meantime.

## Risks / open questions

- **`gradeTrajectory`'s `orderOk` rank table** must move in lockstep with
  the `score` reorder (§1) or the honesty-eval trajectory grader will
  false-fail every real analyze-phase run — an easy, high-blast-radius
  detail to miss during implementation.
- **Client-held analysis state is a size/trust trade-off** (§1) — acceptable
  now, but if `cvProfile`/`requirements` grow large (very long CVs/JDs) the
  `/generate` request body grows with them; revisit if that becomes an
  actual problem, not preemptively.
- **`entities/clarifying-question` is a new slice** — needs the usual FSD
  scaffold (`fsd-scaffold` skill) and a `SkillName` entry
  (`derive-clarifying-questions`) added to `shared/lib/evals` for trace
  consistency with the other steps, even though it makes no LLM call.
- **Export libraries are new dependencies** (`@react-pdf/renderer`, `docx`)
  — neither has been vetted against this repo's bundle-size/build-time
  budget yet; do that check at implementation time, not in this proposal.

## Open decision for the user

`BC-HONESTY-03` — the rule that a user's self-attested answer to a
clarifying question counts as legitimate grounding evidence, on equal
footing with a sentence from their actual CV, provided the UI always labels
which is which — was written into the PRD by the assistant this session,
without the user's direct confirmation. This is a brand-trust call, not a
purely technical one: Vouch's entire differentiator is that every claim is
*verifiably* grounded, and self-attestation is a materially weaker guarantee
than "this exact sentence exists in the CV you uploaded." The default chosen
here (self-attestation counts, always visibly tagged as distinct from CV
evidence, never silently merged with it) seems like the only way
`FR-WIZARD-02`–`04` can do anything useful at all — but it should be read
and confirmed before any of this design is implemented.
