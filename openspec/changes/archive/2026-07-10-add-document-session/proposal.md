## Why

Every wizard step and resume path depends on a durable document session keyed by `guid`. Without create/restore/persist for `./docs/{guid}.json` and the `/docs/{guid}` route, later capabilities have nowhere to store state. This is phase 2 after `locale-helpers` and the foundation for the rest of the MVP.

## What Changes

- Establish a configurable data-root and ensure `./docs/` exists for session files
- Create a new document session with a unique `guid`, write `./docs/{guid}.json`, and redirect `/` → `/docs/{guid}`
- Serve `/docs/[guid]` that loads session JSON and resumes: unfinished → last incomplete step; completed → final review placeholder
- Provide read/update API (or server actions) for session JSON so later steps can patch fields without inventing persistence
- Persist session updates so reload restores the same `guid`, step, and fields (NFR-03, NFR-04 / TC-21)
- Support export/download of the session JSON file (FR-19)
- Show a clear error for invalid/missing `guid` without creating a broken file (TC-25)
- Surface save failures to the user (NFR-10 minimum for sessions)
- Stub-only UI for steps is enough; full wizard chrome belongs to `wizard-shell`

## Capabilities

### New Capabilities
- `document-session`: Create, persist, restore, and export document sessions by `guid` on the filesystem and `/docs/{guid}` URL

### Modified Capabilities
- _(none)_

## Impact

- Next.js App Router routes: `/` (create + redirect), `/docs/[guid]` (resume)
- Server-side FS layer under a relative data-root (`docs/{guid}.json`); templates path convention `./templates/` remains for later capabilities (NFR-12)
- Session type aligned with DESIGN.md (`DocumentSession`); kebab-case JSON keys (NFR-13)
- API or server actions: create, get, patch session; optional JSON download
- Downstream: `wizard-shell` and all step capabilities depend on this persistence contract
- Non-goals (BC-02, BC-03, BC-08): no auth, no ЕДО, no legal compliance guarantees; access by knowing `guid` (NFR-11, BC-09)
- Out of scope here: step UI, numbering, contacts, services, templates, PDF, copy-from-guid (FR-04 → `document-type`)
