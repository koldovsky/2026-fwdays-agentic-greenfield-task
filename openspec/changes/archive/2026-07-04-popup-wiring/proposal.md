## Why

`jira-parser`, `markdown-serializer`, and `anonymizer` are all archived, but nothing calls them yet — the popup (`scaffold-extension`) is still a static 4-state shell with a dev-only toggle. This change wires the three `lib/` pieces into the real export flow: click Export → parse the active tab → optionally anonymize → serialize → download `.md` + `media/` — and replaces the dev-only state switcher with real state transitions.

## What Changes

- Add a programmatically-injected content script (`app/src/content-scripts/extract-ticket.ts`) that runs `parseJiraTicket(document)` in the active tab (via `chrome.scripting.executeScript` with `activeTab`, not a statically-registered content script — keeps `manifest.json` free of broad host permissions per NFR-04) and messages the `ParseResult` back to the popup via `chrome.runtime.sendMessage`.
- Add ticket-level export naming: a small pure `buildExportPaths(ticket)` that sanitizes the ticket title for the `.md` file name (FR-18: strip only filesystem-forbidden characters, keep Cyrillic — no transliteration) and produces the `Downloads/<TICKET-ID>/` folder layout (FR-15, FR-16).
- Wire the popup's Export button to: detect whether the active tab looks like a Jira ticket page on popup open (FR-04) enabling/disabling the button and showing a hint; on click, run the content script, anonymize the result if the checkbox is checked (FR-09), serialize to Markdown, and download the `.md` file plus each attachment via `chrome.downloads` (FR-11, FR-17) — no ZIP, separate downloads.
- Track each attachment download's outcome individually; a failed attachment is recorded in an error-details list but never aborts the `.md` conversion or the remaining downloads (FR-12). If **all** downloads (including the `.md` itself) succeed, show the success state (FR-07); if the `.md` itself fails, show the error state; if only some attachments failed, still show success-with-caveats per FR-12's "partial success is a valid, visible outcome" — resolved in design.md's state-mapping decision.
- Remove the dev-only state-switcher from `popup.ts` (its purpose — previewing the 4 states before real logic existed — is now obsolete; real state transitions replace it).
- Manual E2E verification (load unpacked, export the live ROVODEV-36 ticket, confirm folder/file/anonymization) — same style as `scaffold-extension`'s verification. Automated E2E is `playwright-e2e`, a separate later change.

Out of scope for this change: the Playwright E2E harness itself (separate change); Azure DevOps (out of MVP scope entirely).

## Capabilities

### New Capabilities
- `export-flow`: the end-to-end orchestration connecting DOM extraction, anonymization, Markdown serialization, and downloads behind the popup's Export button, including the partial-success error contract.

### Modified Capabilities
- `popup-shell`: the popup's state transitions are now driven by real export progress/results instead of the dev-only manual switcher; the FR-04 "not a recognized ticket page" variant of the idle state is implemented for the first time.

## Impact

- New directory `app/src/content-scripts/` (the injected extraction script).
- New pure helper(s) for export path/name building (FR-18), likely `app/src/lib/export-naming/` to keep it framework-free and unit-testable, or colocated with the popup code if it turns out to need no `lib/`-level reuse — decided in design.md.
- `app/vite.config.ts` gains an extra build entry so the content script is bundled into `dist/` as a static file `chrome.scripting.executeScript({ files: [...] })` can reference (it cannot inject un-bundled TS at runtime).
- `app/src/popup/popup.ts` rewritten: dev-only toggle removed, real click handler and message listener added.
- `app/manifest.json` (via `manifest.config.ts`) unchanged in permissions — still just `activeTab`, `scripting`, `downloads`, no host permissions (NFR-04).
- No changes to `docs/requirements.md` — implements existing FR-04 (`proposed`), FR-09, FR-11, FR-12, FR-15, FR-16, FR-17, FR-18 (`accepted` except FR-04/FR-14 already-noted `proposed` status).
