## Context

Three framework-free `lib/` modules are done and archived — `jira-parser` (`parseJiraTicket(root): ParseResult`), `markdown-serializer` (`serializeTicketToMarkdown` + `planAttachmentNames`), and `anonymizer` (`anonymizeTicket`) — but nothing calls them. The popup (`scaffold-extension`) is a static 4-state shell (`data-state` on `<body>`, one `[data-panel]` per state) whose state is driven only by a dev-only switcher mounted under `import.meta.env.DEV`. This change is the glue: it turns a click on Export into a real end-to-end export and drives the popup's state from that flow instead of from manual clicks.

Constraints that shape every decision below come from `AGENTS.md` and `docs/requirements.md`:
- Data comes from the **DOM of the active tab**, never a tracker API or token (FR-02).
- Permissions stay minimal — `activeTab`, `scripting`, `downloads`, **no host permissions** (NFR-04).
- `lib/` stays framework-free and Chrome-API-free (NFR-07); Chrome APIs live only in the popup shell.
- Popup stays vanilla TS + Pico CSS, no framework (NFR-05).
- A failed attachment is reported but never aborts the `.md` or the other downloads (FR-12).

## Goals / Non-Goals

**Goals:**
- Wire Export: click → parse active tab → optional anonymize → serialize → download `.md` + each attachment into `Downloads/<TICKET-ID>/`.
- Implement FR-04 for real: on popup open, detect whether the active tab looks like a Jira ticket and enable/disable Export with a hint.
- Enforce the FR-12 partial-success contract: per-attachment outcomes tracked independently; the `.md` and remaining attachments always proceed.
- Add one new pure, unit-tested `lib/` helper — export path/name building (FR-15, FR-16, FR-18) — and one pure URL-detection helper (FR-04). All Chrome glue stays in the popup shell, untested by unit tests per the architecture invariant.
- Replace the dev-only state switcher with real state transitions.

**Non-Goals:**
- The Playwright E2E harness (separate `playwright-e2e` change). Verification here is manual (load unpacked, export live ROVODEV-36).
- Any new Chrome permission. If the flow turns out to need one, stop and update `docs/requirements.md` first (NFR-04).
- Azure DevOps / non-Jira trackers (out of MVP scope).
- Free-text name detection — anonymization behavior is exactly what `anonymizer` already provides.

## Decisions

### 1. Extraction transport: programmatic injection of a bundled content script, result returned via messaging
`parseJiraTicket` needs the live DOM, so it must run **in the page**, not in the popup. Options considered:
- **(a) Statically-registered content script** (manifest `content_scripts`): rejected — it auto-runs on matching pages and forces broad host-match permissions, violating NFR-04.
- **(b) `executeScript({ func })`** inlining the parser: rejected — the parser is multi-module; a serialized `func` can't reference imported symbols, and inlining the whole parser is unmaintainable.
- **(c, chosen) `executeScript({ files: [...] })`** injecting a bundled script that imports `parseJiraTicket`, runs it against `document`, and returns the `ParseResult`.

Injection happens only on the user's Export gesture, so `activeTab` grants the needed one-off host access without any declared host permission (NFR-04 preserved). The bundled script is authored at `app/src/content-scripts/extract-ticket.ts`; CRXJS's `?script` import (`import extractTicket from '../content-scripts/extract-ticket?script'`) yields the built file's runtime path to pass to `executeScript`, so we never hardcode a hashed filename. The script posts its `ParseResult` back with `chrome.runtime.sendMessage`; the popup awaits a one-shot `chrome.runtime.onMessage` response wrapped in a Promise. Messaging (over relying on `InjectionResult.result` completion-value semantics) is chosen because it is explicit and robust to how the bundler wraps the module.

### 2. Ticket-page detection (FR-04): cheap URL heuristic on open, authoritative DOM parse on export
On popup open we must decide whether Export is enabled. Running a full DOM parse on every open is wasteful and would fire injection without a real user intent to export. Decision: a pure `looksLikeJiraTicketUrl(url): boolean` helper (in `lib/`, unit-tested) matches the active tab's URL against Jira ticket URL shapes (a `/browse/<KEY-123>` path, or an Atlassian host with a ticket-key path segment). If it matches, Export is enabled; otherwise the button is disabled and the muted hint "Open a Jira ticket" is shown under the title (DESIGN.md idle-FR-04 variant). The **authoritative** check is still the real parse at export time: if `parseJiraTicket` returns `{ ok: false }`, the flow shows the error state with the parser's reason. This keeps FR-02 intact (real content always comes from the DOM) while keeping open-time detection cheap and side-effect-free.

### 3. Export naming (FR-15, FR-16, FR-18): a pure `lib/export-naming/` helper
`buildExportPaths(ticket): { folder, mdFileName, mdPath, mediaDir }` where `folder = <KEY>`, `mdFileName = <KEY>-<sanitized-title>.md`, `mdPath = <KEY>/<KEY>-<title>.md`, `mediaDir = <KEY>/media`. Title sanitization strips only filesystem-forbidden characters (`< > : " / \ | ? *` and control chars) and collapses/trims whitespace, **keeping Cyrillic** (no transliteration, FR-18); over-long titles are capped to a safe length. This mirrors `markdown-serializer`'s existing `sanitizeFileName` rules for consistency and is fully unit-testable with no Chrome dependency (NFR-07). `chrome.downloads` interprets a relative `filename` as a path under the Downloads root and auto-creates subfolders, giving `Downloads/<KEY>/…` (FR-15, FR-16) without any ZIP (FR-17).

### 4. Download orchestration and the FR-12 partial-success contract
Order: (1) build Markdown, (2) download the `.md`, (3) download each attachment independently.
- **`.md` bytes → download**: `URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))`, passed to `chrome.downloads.download({ url, filename: mdPath, conflictAction: 'uniquify', saveAs: false })`; the object URL is revoked after the download settles. (Object URLs are available in the popup document context and avoid the size blow-up of base64 data URLs.)
- **Attachments**: for each `AttachmentPlan` (`{ url, fileName }` from `planAttachmentNames`, already anonymized and `NN-`prefixed), call `chrome.downloads.download({ url, filename: '<KEY>/media/<fileName>', conflictAction: 'uniquify' })`. A per-download Promise resolves via a `chrome.downloads.onChanged` listener keyed by `downloadId` (`state === 'complete'` → success; `'interrupted'` → failure), and also handles the immediate `chrome.runtime.lastError` case (bad URL). Each attachment's outcome is collected as `{ fileName, ok, error? }`.
- **Aggregation → state**:
  - Parse failed, or the `.md` download itself failed → **error** state (nothing usable produced); details carry the reason.
  - `.md` succeeded and all attachments succeeded → **success** state, no caveats.
  - `.md` succeeded but some attachments failed → **success state _with caveats_**: the export is a real, usable result (FR-12: "partial success is a valid, visible outcome"), so we show success but append a details list of the attachments that couldn't be downloaded. This refines DESIGN.md's success state to carry an optional caveats `<details>` block; it is **not** a new popup state (the four states are unchanged, honoring FR-09's "no additional states" spirit). The error state remains reserved for hard failures (`.md`/parse) where there is nothing to celebrate.

This keeps the failure of any one attachment from aborting the `.md` or the other attachments (FR-12), and makes the partial outcome visible rather than silent.

### 5. Replace the dev-only switcher with a real state machine
The `import.meta.env.DEV` block in `popup.ts` is removed. `popup.ts` now: on load, queries the active tab, runs `looksLikeJiraTicketUrl`, and sets idle/enabled-or-disabled; on Export click, transitions idle → progress, runs the flow, then → success (with optional caveats) or → error. `setState` and the `data-state` mechanism are kept as-is. The dev-toggle CSS block is dropped.

## Risks / Trade-offs

- [CRXJS `?script` injection or `executeScript` file wiring behaves differently than expected at runtime — can't be exercised by unit tests] → Mitigation: keep all testable logic (`buildExportPaths`, `looksLikeJiraTicketUrl`) in pure `lib/` with full unit coverage; verify the Chrome glue manually by loading unpacked and exporting live ROVODEV-36 (same manual-verification bar as `scaffold-extension`). If `?script` proves unavailable in this CRXJS version, fall back to an explicit `rollupOptions.input` entry with a known output name.
- [Attachment URLs are expiring bucket links (FR-12) so some downloads will legitimately fail] → Mitigation: this is the designed-for path, surfaced as success-with-caveats, not an error; failure details name each missing file.
- [`chrome.downloads.onChanged` is a global event; concurrent unrelated downloads could confuse matching] → Mitigation: match strictly on the `downloadId` returned by our own `download` call; ignore events for other ids.
- [Showing "success" when attachments are missing could read as over-optimistic] → Mitigation: the caveats details block makes the missing files explicit and visible in the same view; hard failures still use the error state.
- [Success state gaining a details block is a change to DESIGN.md's success description] → Mitigation: DESIGN.md's per-state notes are refinable; update DESIGN.md's success-state entry in this same change (per the "refine proposed items in the same change" rule); no `accepted` FR/NFR is contradicted (FR-07 still shows a success message; FR-12 still surfaces failed media).
