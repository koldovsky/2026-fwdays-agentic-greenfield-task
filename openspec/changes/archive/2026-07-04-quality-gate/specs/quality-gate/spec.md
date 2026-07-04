# quality-gate

## Purpose

Formal verification infrastructure and documentation proving MVP non-functional requirements and demo readiness (BC-DEMO-01). No product feature changes.

## ADDED Requirements

### Requirement: Unified developer check script

The project SHALL expose an npm script that runs lint, TypeScript type-checking, Vitest, and a production build in sequence without manual steps.

#### Scenario: Local quality gate

- **WHEN** a developer runs the unified check script on a clean checkout
- **THEN** ESLint, `tsc --noEmit`, Vitest, and `next build` execute in order
- **THEN** the command exits with a non-zero code if any step fails

#### Scenario: DX time budget

- **WHEN** the unified check script runs on a clean checkout on a typical developer machine
- **THEN** total wall time SHOULD complete within 60 seconds (NFR-DX-01)

### Requirement: Continuous integration workflow

The repository SHALL include a GitHub Actions workflow that runs the unified check script on pull requests and pushes to the default branch.

#### Scenario: PR validation

- **WHEN** a pull request is opened against the repository
- **THEN** CI installs dependencies with `npm ci`
- **THEN** CI runs the unified check script
- **THEN** the workflow fails if any check step fails

### Requirement: Requirement traceability matrix

The project SHALL maintain a test plan document mapping every MVP `FR-*`, `NFR-*`, and `BC-*` requirement ID from `docs/requirements.md` to at least one automated test file path or an explicit manual verification procedure.

#### Scenario: Complete ID coverage

- **WHEN** a reviewer opens the test plan document
- **THEN** each requirement ID listed in the MVP sections of `docs/requirements.md` appears exactly once in the trace matrix
- **THEN** each row specifies verification type (automated or manual) and evidence location

#### Scenario: Demo readiness

- **WHEN** the quality-gate change is archived
- **THEN** BC-DEMO-01 is satisfied by the published trace matrix linked from project documentation

### Requirement: Lighthouse performance verification

The project SHALL document Lighthouse Performance scores ≥ 90 for both mobile and desktop against a production build of the application.

#### Scenario: Documented scores

- **WHEN** the test plan Lighthouse section is complete
- **THEN** it records mobile and desktop Performance category scores
- **THEN** each score is ≥ 90 or lists an accepted exception with mitigation plan (NFR-PERF-01)

#### Scenario: Representative page state

- **WHEN** Lighthouse is run
- **THEN** the measured URL reflects a realistic demo state (empty configuration or submitted route with map and sidebar visible)

### Requirement: Segmentation performance re-verification

The route engine performance test SHALL assert that `segmentRoute` completes in under 50 milliseconds for a representative dense polyline fixture.

#### Scenario: Automated perf guard

- **WHEN** Vitest runs the route-engine performance test
- **THEN** segmentation elapsed time is less than 50 ms (NFR-PERF-02)

### Requirement: Production console silence

The application SHALL produce no application-initiated console output during the documented happy-path workflow in production mode.

#### Scenario: Console audit checklist

- **WHEN** a reviewer follows the console-audit steps in the test plan (load, search, submit route, toggle theme)
- **THEN** no `console.log`, `console.debug`, or unhandled application warnings appear from project source under `app/`, `components/`, or `lib/` (NFR-OBS-01)

#### Scenario: Source grep guard

- **WHEN** the quality-gate implementation is complete
- **THEN** a repository search for debug console calls in application source shows none except documented error handlers

### Requirement: Requirements status alignment

After verification, `docs/requirements.md` SHALL reflect `shipped` status for requirements with recorded evidence in the trace matrix.

#### Scenario: NFR statuses updated

- **WHEN** the quality gate passes
- **THEN** NFR-PERF-01, NFR-PERF-02, NFR-OBS-01, and NFR-DX-01 are marked `shipped` in `docs/requirements.md`
- **THEN** remaining verified FR-SHELL, NFR-A11Y, NFR-COST, NFR-I18N, and BC-BRAND items are marked `shipped` where manual evidence exists
