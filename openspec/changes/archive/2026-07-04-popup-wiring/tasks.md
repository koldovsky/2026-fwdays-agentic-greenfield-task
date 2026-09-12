## 1. Pure `lib/` helpers (framework-free, unit-tested)

- [x] 1.1 Create `app/src/lib/export-naming/` with `buildExportPaths(ticket): { folder; mdFileName; mdPath; mediaDir }` — folder `<KEY>`, `<KEY>-<title>.md`, media dir `<KEY>/media`; sanitize title (strip only filesystem-forbidden chars + control chars, collapse/trim whitespace, cap length), keep Cyrillic, no transliteration (FR-15, FR-16, FR-18)
- [x] 1.2 Add `looksLikeJiraTicketUrl(url): boolean` (in `lib/`, e.g. `lib/ticket-url/`) matching Jira ticket URL shapes (`/browse/<KEY-123>`, Atlassian host + key path) (FR-04)
- [x] 1.3 Confirm no Chrome API import exists anywhere under the new `lib/` dirs

## 2. Content-script extraction

- [x] 2.1 Create `app/src/content-scripts/extract-ticket.ts` that runs `parseJiraTicket(document)` and sends the `ParseResult` back via `chrome.runtime.sendMessage`
- [x] 2.2 Wire the content script into the build so it is emitted as a static injectable file (CRXJS `?script&iife` import in the popup); keep `manifest.json` permissions unchanged (`activeTab`, `scripting`, `downloads`) (NFR-04)

## 3. Popup wiring (Chrome glue)

- [x] 3.1 Remove the dev-only state switcher block from `popup.ts` and its `#dev-toggle` CSS
- [x] 3.2 On popup open, query the active tab and use `looksLikeJiraTicketUrl` to enable/disable Export and show/hide the "Open a Jira ticket" hint (FR-04)
- [x] 3.3 Add the FR-04 hint element and a success-state caveats details block to `popup/index.html`; update `popup.css` (drop `#dev-toggle`, style the hint/caveats via Pico variables only)
- [x] 3.4 On Export click: idle → progress; inject the extraction script via `chrome.scripting.executeScript` and await the `ParseResult` (FR-02)
- [x] 3.5 If `ParseResult.ok === false`, show error state with the reason; otherwise optionally `anonymizeTicket` per checkbox (FR-09, FR-19), then `planAttachmentNames` + `serializeTicketToMarkdown` (FR-10, FR-13)
- [x] 3.6 Download the `.md` via `chrome.downloads` using `buildExportPaths` (Blob + object URL, revoke after settle) (FR-14, FR-15, FR-16, FR-17)
- [x] 3.7 Download each attachment into `media/` independently; resolve each via a `chrome.downloads.onChanged` listener keyed by `downloadId`, collecting `{ fileName, ok, error? }` (FR-11, FR-12, FR-17)
- [x] 3.8 Map results to state: parse/`.md` failure → error (with details); all ok → success; `.md` ok but some attachments failed → success with caveats list (FR-07, FR-08, FR-12)

## 4. Docs

- [x] 4.1 Update `docs/DESIGN.md` success-state entry to note the optional caveats details block for partial success (refinement in the same change)

## 5. Tests

- [x] 5.1 Unit tests for `buildExportPaths`: key/title paths, Cyrillic preserved, forbidden chars stripped, media dir, long-title cap
- [x] 5.2 Unit tests for `looksLikeJiraTicketUrl`: matches `/browse/KEY-123` and Atlassian hosts, rejects unrelated URLs
- [x] 5.3 Confirm the extraction path uses the real ROVODEV-36 fixture at the parser layer (already covered by `jira-parser` tests) — no Chrome APIs unit-tested

## 6. Verification

- [x] 6.1 `npm run typecheck && npm run lint && npm run test && npm run build` all pass, combined under 60s (NFR-06) — verified ~3.8s combined
- [ ] 6.2 Manual: load `app/dist/` unpacked, open the live ROVODEV-36 ticket, Export; confirm `Downloads/ROVODEV-36/` folder, `.md`, `media/` with `NN-` prefixes, anonymized names, and that a failed attachment yields success-with-caveats (not an abort) (FR-11…FR-17, FR-12) — **human step: needs a real Chrome + the live ticket; not runnable in this environment**
- [x] 6.3 Confirm production build contains no dev-only state switcher and console stays silent in normal operation (NFR-06) — verified: no `dev-toggle`/`import.meta.env` in `dist/`, no `console` calls in shipped code
- [x] 6.4 Run `openspec validate popup-wiring --strict` and confirm apply-clean
