# Delta: nace-catalog (add-nace-catalog)

## MODIFIED Requirements

### Requirement: FR-NACE-01 NACE 2.1-UA class codes
The catalog SHALL store entries identified by their own stable id (kebab-case slug). Each entry SHALL carry a NACE 2.1-UA class code in `XX.XX` format sourced from `docs/191_2025.pdf`; the class code is a non-unique attribute — multiple entries MAY share one class code. Each entry SHALL also carry the corresponding legacy КВЕД ДК 009:2010 class code as internal data only (the ЄДР runs on КВЕД until NACE 2.1-UA takes force on 2027-01-01).

#### Scenario: Code format
- **WHEN** a catalog entry is loaded
- **THEN** its NACE class code matches the `XX.XX` NACE 2.1-UA pattern and its official UA class name matches `docs/191_2025.pdf`

#### Scenario: Shared class code
- **WHEN** the catalog contains two entries for NACE class 74.12 (graphic design and 3D visualization)
- **THEN** both entries load with distinct ids and distinct bilingual line texts

#### Scenario: Legacy code is data-only
- **WHEN** a catalog entry is loaded
- **THEN** its legacy КВЕД code is available as a data field and appears in no UI-facing line text

### Requirement: FR-NACE-05 Keyword matcher
The system SHALL map user service text (Ukrainian or English) to catalog entries via deterministic keyword scoring and SHALL return an explicit result: `matched` with the single best entry, `ambiguous` with the tied top candidates, or `none`. The matcher SHALL NOT silently pick one entry when the top score is tied. Asking the clarifying question is the consuming UI's responsibility (`form-input`).

#### Scenario: Unambiguous match
- **WHEN** the user enters service text whose keywords match one catalog entry with the single top score
- **THEN** the matcher returns `matched` with that entry and its bilingual line text

#### Scenario: Ambiguous match
- **WHEN** the user enters service text whose keywords tie the top score across multiple entries
- **THEN** the matcher returns `ambiguous` with the tied candidates so the UI can ask the user to choose

#### Scenario: No match
- **WHEN** the user enters service text matching no entry keywords
- **THEN** the matcher returns `none` and no entry is auto-selected

#### Scenario: Case- and language-insensitive
- **WHEN** the same service is described in Ukrainian or English, in any letter case
- **THEN** the matcher resolves to the same catalog entry

### Requirement: BC-NACE-01 Official taxonomy only
The system SHALL use NACE 2.1-UA (State Statistics Service order No. 191, 2025) as the only activity taxonomy in UI and new docs. Legacy КВЕД ДК 009:2010 codes MAY be carried as internal catalog data (per FR-NACE-01) but SHALL NOT be rendered in UI, invoice output, or new documentation.

#### Scenario: No KVED in UI
- **WHEN** the user browses NACE selection in the app
- **THEN** only NACE 2.1-UA labels and codes are shown

#### Scenario: No KVED in line texts
- **WHEN** bilingual invoice line texts are produced from the catalog
- **THEN** they contain no `КВЕД` or `ДК 009` references

## ADDED Requirements

### Requirement: FR-NACE-02 Graphic design seed entry (74.12)
The catalog SHALL contain a seed entry for NACE class 74.12 «Діяльність із графічного та візуального дизайну» with the bilingual line text — EN: "Graphic design services: development of logos, corporate identity, brand book and related graphic design services"; UA: «Послуги графічного дизайну: розробка логотипів, фірмового стилю, брендбуку та інші послуги у сфері графічного дизайну».

#### Scenario: Graphic design entry present
- **WHEN** the catalog is loaded
- **THEN** an entry with NACE class 74.12 carries the graphic-design EN and UA line texts above

### Requirement: FR-NACE-03 3D visualization seed entries (74.12 / 74.14)
The catalog SHALL contain a seed entry for NACE class 74.12 with 3D-visualization line text — EN: "Graphic 3D design services (visualization): creation of an interactive 360° point for virtual tour"; UA: «Послуги графічного 3Д дизайну (візуалізації): створення інтерактивної точки 360° для віртуального туру» — and a seed entry for NACE class 74.14 «Інша спеціалізована діяльність із дизайну» — EN: "Specialized design services (3D / interactive visualization) as per agreed scope"; UA: «Спеціалізовані послуги з дизайну (3D / інтерактивна візуалізація) згідно узгодженого обсягу».

#### Scenario: 3D visualization entries present
- **WHEN** the catalog is loaded
- **THEN** the 74.12 3D-visualization entry and the 74.14 specialized-design entry both carry their bilingual line texts above

### Requirement: FR-NACE-04 Video post-production seed entry (59.12)
The catalog SHALL contain a seed entry for NACE class 59.12 «Компонування кіно- та відеофільмів, телевізійних програм» with the bilingual line text — EN: "Video editing services: editing, special effects, color correction and related post-production"; UA: «Послуги з відеомонтажу: редагування відеоматеріалів, створення спецефектів, кольорокорекція та інші послуги з обробки відео».

#### Scenario: Post-production entry present
- **WHEN** the catalog is loaded
- **THEN** an entry with NACE class 59.12 carries the video-editing EN and UA line texts above
