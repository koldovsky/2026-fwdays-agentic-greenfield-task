## ADDED Requirements

### Requirement: Seniority inference from CV prose
The system SHALL infer the candidate's career stage (`junior` / `mid` /
`senior`) with a short Ukrainian rationale via a pure prompt over the
candidate's own CV prose only. The inference SHALL NOT introduce skills,
numbers, companies, or experience absent from the CV text, and the rationale
SHALL cite only CV-sourced signal. It runs in the analysis phase, tags the
tailoring, and MAY calibrate the tone of generated bullets and the cover letter;
it SHALL NOT add or strengthen any claim beyond what the CV supports. The
inference SHALL NOT be part of the grounding pass's context. Implements
BC-HONESTY-01, BC-HONESTY-03, NFR-I18N-01.

#### Scenario: Stage inferred only from CV signal
- **WHEN** seniority is inferred for a CV
- **THEN** the returned stage is one of `junior`/`mid`/`senior` with a Ukrainian rationale that references only CV-sourced signal

#### Scenario: Weak CV is not inflated
- **WHEN** a CV shows little seniority signal (short tenure, no leadership prose)
- **THEN** the inference does not return an inflated `senior` stage or invent leadership/scope the CV never stated

#### Scenario: Inference stays out of grounding
- **WHEN** the pipeline runs with an inferred career stage
- **THEN** the `infer-seniority` step's recorded context keys are limited to the CV text, and the seniority verdict is never present in the grounding pass's context

#### Scenario: Tone only, never new claims
- **WHEN** the inferred stage is passed to bullet generation
- **THEN** it may change phrasing/tone but introduces no skill, number, or experience the CV did not already contain (BC-HONESTY-01)

### Requirement: Grounded cover-letter generation
The system SHALL generate a cover letter at the end of the flow via a dedicated
grounded prompt that carries the same no-fabrication constraint as bullet
generation: it is grounded only in the candidate's CV sentences and the
confirmed clarifying-question answers, and it SHALL NOT introduce any claim the
tailored, grounded bullets did not already justify. Output is Ukrainian-first
via `shared/lib/i18n` with an English fallback. The cover-letter builder lives in
`features/export-cover-letter` and composes only lower FSD layers. Implements
FR-EXPORT-01, BC-HONESTY-01, BC-HONESTY-02, NFR-I18N-01.

#### Scenario: Letter is grounded, not fabricated
- **WHEN** the cover letter is generated
- **THEN** every claim it makes traces to a CV sentence, a confirmed answer, or a bullet already grounded on those sources — it adds no new skill, number, or experience

#### Scenario: Excluded bullets do not leak into the letter
- **WHEN** an `overclaim-risk` bullet was excluded from the résumé export by default
- **THEN** its unsupported claim does not reappear in the cover letter

#### Scenario: Ukrainian-first output
- **WHEN** the cover letter is produced
- **THEN** its copy is Ukrainian-first with an English fallback, sourced through `shared/lib/i18n`, no hardcoded UI strings

### Requirement: Cover-letter export surface
The system SHALL let the user copy and download the generated cover letter,
extending the format-agnostic `ExportDocument` with an optional `coverLetter`
block and adding a `POST /api/export/cover-letter` route. The route SHALL run on
the Node runtime and enforce the server-side paywall before any render: it
resolves the current user, checks paid access, and returns `402 payment_required`
for anonymous or free callers, mirroring the existing pdf/docx export routes — it
SHALL NOT rely on a client-only gate. Failures SHALL surface a calm coded error,
never a raw 500 or a blank. The free-tier attribution footer rule (`FR-EXPORT-04`)
applies to the cover-letter export the same as to the résumé export. Implements
FR-EXPORT-01, FR-PAYWALL-01, FR-EXPORT-04, NFR-OBS-01.

#### Scenario: Paid caller exports the cover letter
- **WHEN** a paid user requests a cover-letter export
- **THEN** the route renders the letter (with the paid, footer-free output) and returns it

#### Scenario: Anonymous or free caller is gated server-side
- **WHEN** an anonymous or free-tier caller posts directly to `POST /api/export/cover-letter`
- **THEN** the route returns `402 payment_required` before any render, regardless of the request body

#### Scenario: Failure is calm
- **WHEN** cover-letter rendering or entitlement resolution fails
- **THEN** the response is a calm coded error, never a raw 500 or a silent blank (NFR-OBS-01)

#### Scenario: Cyrillic survives export
- **WHEN** a Ukrainian cover letter is exported and re-extracted
- **THEN** the Cyrillic glyphs are preserved and the free-tier footer is present for free output and absent for paid output
