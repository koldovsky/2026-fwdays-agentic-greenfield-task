# resume-export (delta)

## ADDED Requirements

### Requirement: Sectioned CV document
The system SHALL extend `normalizeCvText` (entity `cv-profile`) to produce a
sectioned `CvDocument` alongside the existing flat `CvProfile`: contact
(name, email, phone, links), summary, experience as roles with title, company,
parsed date ranges, and the role's original bullets, skills, and education.
Parsing SHALL stay pure and deterministic (no `next/*`, no DOM, no IO,
TC-PURE-01) and SHALL degrade gracefully: any section that cannot be detected
is omitted, never guessed or fabricated, and normalization never throws on
messy input. The same `CvDocument` feeds tenure scoring (checklist delta) and
the structured export. Implements FR-EXPORT-02, FR-EXPORT-03, TC-PURE-01,
BC-HONESTY-01.

#### Scenario: Sections parsed from a conventional CV
- **WHEN** a CV with contact lines, a summary, dated roles, a skills line, and education is normalized
- **THEN** the `CvDocument` carries each section with roles holding their titles, companies, and parsed date ranges

#### Scenario: Undetectable sections are omitted, not invented
- **WHEN** a CV has no detectable education section
- **THEN** the `CvDocument` has no education section; nothing is fabricated to fill it (BC-HONESTY-01)

#### Scenario: Normalization is deterministic and total
- **WHEN** `normalizeCvText` runs twice on the same messy input
- **THEN** it returns identical output both times and never throws

### Requirement: Structured export document
The system SHALL extend the format-agnostic `ExportDocument` (entity
`export-document`, framework-free) with optional structured sections: contact,
summary, experience (roles with title, company, dates), skills, education. The
resume builder SHALL merge the tailoring's kept bullets into their source
roles, replacing the original bullets they rewrote; roles and sections the
tailoring did not touch keep the CV's original text and original language,
untranslated. The clipboard, PDF, and DOCX renderers SHALL all render the same
structured document, so every format shows the same sections, roles, and
bullets; the PDF renderer keeps its Cyrillic-complete embedded font. When no
`CvDocument` sections are available, all formats SHALL fall back to the current
flat headline+bullets document rather than failing (NFR-OBS-01). Implements
FR-EXPORT-01, FR-EXPORT-02, FR-EXPORT-03, NFR-I18N-01, NFR-OBS-01.

#### Scenario: Kept bullets land under their source role (best-effort)
- **WHEN** a tailoring's kept bullets are merged and the resume is exported
- **THEN** each kept bullet appears under its source role — derived best-effort from the bullet's grounding evidence (the CV sentence it is grounded in, matched to the role that sentence came from) — with role title, company, and dates intact, and no excluded overclaim bullet appears in any section
- **AND** a kept bullet that cannot be attributed to a role (no CV-sentence evidence — a user-confirmed or opted-in overclaim bullet — or no match) falls back to the most-recent parsed role, so no grounded kept bullet is dropped
- **NOTE** attribution is derived client-side from grounding evidence and is NOT persisted per bullet. Fully persisted per-source-role provenance surviving a history re-export would need a stored CvDocument snapshot (privacy tension) plus a model-emitted role claim (honesty risk); deferred. This best-effort placement never fabricates: it follows real evidence and falls back to the prior honest default.

#### Scenario: Untouched content keeps its original language
- **WHEN** a CV section was not rewritten by the tailoring (e.g. education, an unchanged role)
- **THEN** the export reproduces that section's original text in its original language, untranslated

#### Scenario: All formats render the same structure
- **WHEN** the same tailoring is exported to clipboard, PDF, and DOCX
- **THEN** all three contain the same sections, the same roles, the same kept bullets, and the same footer state (FR-EXPORT-01/02/03)

#### Scenario: Unsectioned CV falls back flat
- **WHEN** the `CvDocument` yielded no usable sections for a tailoring
- **THEN** every export format renders the existing flat bullets document, never a blank or an error page (NFR-OBS-01)

### Requirement: Exports carry only grounded kept content
The system SHALL build the structured export exclusively from: bullets flagged
`includedInExport` (grounded or explicitly acknowledged, FR-BULLETS-02,
BC-HONESTY-02) and the candidate's own original CV section text. No generated
text outside the kept bullets enters the resume export, and `overclaim-risk`
bullets excluded by default SHALL NOT appear in any section. Contact PII is
included in the user's own export, but SHALL NOT be added to any LLM payload
(NFR-SEC-02) and SHALL NOT be logged in plaintext (NFR-SEC-01). The free-tier
attribution footer and server-side paywall gating of the PDF/DOCX routes are
unchanged (FR-EXPORT-04). Implements FR-BULLETS-02, BC-HONESTY-02,
FR-EXPORT-04, NFR-SEC-01, NFR-SEC-02.

#### Scenario: Excluded overclaim bullets appear in no section
- **WHEN** an `overclaim-risk` bullet is excluded from export and the structured resume is generated
- **THEN** the bullet's claim appears in no role, summary, or skills entry of any export format (BC-HONESTY-02)

#### Scenario: Contact PII stays out of LLM payloads
- **WHEN** any LLM call runs for a tailoring whose `CvDocument` carries contact details
- **THEN** the recorded LLM context contains no dedicated contact section payload beyond the raw CV text lanes that already exist, and contact fields are never logged in plaintext (NFR-SEC-01, NFR-SEC-02)

#### Scenario: Footer and paywall behavior unchanged
- **WHEN** a free-tier user exports the structured resume and a non-paid caller posts directly to the PDF or DOCX route
- **THEN** the free export carries the attribution footer and the direct non-paid call is rejected server-side, exactly as before (FR-EXPORT-04)
