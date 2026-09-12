# Ticket2MD — E2E Test Cases

Manual end-to-end test cases for the extension, built around the four popup states (FR-05…FR-08) and the export contract from `docs/requirements.md`. Run against the unpacked extension in Chrome (`chrome://extensions` → Load unpacked).

## Test data preconditions

- **T-JIRA** — a Jira ticket open in a tab, containing: a Cyrillic title, description with formatting and a checklist, at least 2 comments from different people, real first/last names in the description and comments, and ≥3 attachments (at least one image), two of which share the same file name.
- **T-BROKEN** — a ticket where at least one attachment URL is unreachable (expired bucket link or blocked via DevTools request blocking).
- A clean `Downloads/` state (no folder named after the test ticket IDs).

Fixtures for parser development are separate (see `examples/`); these cases exercise the real pages.

---

## A. Popup states

### TC-01 — Idle state on a ticket page (FR-05)
**Steps:** Open T-JIRA in the active tab. Click the extension icon.
**Expected:** Popup shows the title "Export ticket to MD", an "Anonymize names" checkbox that is checked, and an enabled Export button. Nothing else. Console is silent (NFR-06).

### TC-02 — Non-ticket page (FR-04)
**Steps:** Open any non-tracker page (e.g. a news site). Click the extension icon.
**Expected:** Same layout, Export button disabled, muted hint "Open a Jira ticket". No errors in the console.

### TC-03 — In-progress state (FR-06)
**Steps:** On T-JIRA (with several attachments so the export takes visible time), click Export.
**Expected:** Controls are replaced by a loader with the label "Exporting…". The checkbox and Export button are not clickable during the run.

### TC-04 — Success state (FR-07)
**Steps:** Let the TC-03 export finish with all downloads succeeding.
**Expected:** Popup shows the green-accented message "Export completed successfully." The popup does not auto-close.

### TC-05 — Error state with details (FR-08)
**Steps:** Block or corrupt the export so the `.md` file cannot be saved (e.g. revoke `downloads` permission temporarily, or use a ticket page the parser cannot read).
**Expected:** Popup shows the red-accented "Export failed" message with an expandable details block explaining what broke. No partial export is presented as success.

### TC-05b — Partial attachment failure stays success-with-caveats (FR-12)
**Steps:** Export T-BROKEN (one unreachable attachment, others fine).
**Expected:** Popup shows the green-accented success message with a caveats `<details>` block naming exactly the attachments that could not be downloaded. The `.md` file and reachable media are still saved.

---

## B. Export result

### TC-06 — Folder structure (FR-15, FR-16, FR-17)
**Steps:** Export T-JIRA. Inspect `Downloads/`.
**Expected:** A folder `Downloads/<TICKET-ID>/` containing `<TICKET-ID>-<title>.md` and a `media/` subfolder with all fetched attachments. Files arrive as individual downloads (no ZIP).

### TC-07 — Cyrillic in the file name (FR-18)
**Steps:** Export T-JIRA (Cyrillic title). Check the `.md` file name.
**Expected:** Cyrillic is preserved as-is, no transliteration; only filesystem-forbidden characters (`/ \ : * ? " < > |`) are stripped.

### TC-08 — Content completeness (FR-10)
**Steps:** Open the exported `.md` next to the live T-JIRA page and compare section by section.
**Expected:** Title, ticket key, visible fields (status, priority, labels), full description, checklist items with their checked state, links, and all comments are present. Nothing visible in the ticket is missing from the Markdown.

### TC-09 — Media ordering and dedup (FR-13)
**Steps:** Export T-JIRA (which has two same-named attachments). List `media/`.
**Expected:** Files are prefixed `01-`, `02-`, … in the order they appear in the ticket; the same-named pair is deduplicated (both files present, distinct names).

### TC-10 — Self-contained Markdown (FR-14)
**Steps:** Move the exported `<TICKET-ID>/` folder to another machine or open the `.md` offline in a Markdown viewer.
**Expected:** Image references resolve to the local `media/01-…` files; no references point back to tracker URLs.

---

## C. Anonymization

### TC-11 — Names replaced by default (FR-19)
**Steps:** Export T-JIRA with the checkbox untouched (checked). Search the `.md` for every real first/last name present in the ticket.
**Expected:** Zero matches; each person appears as `User1`, `User2`, …

### TC-12 — Alias consistency (FR-20)
**Steps:** In the exported `.md`, trace one person who appears in both the description and multiple comments.
**Expected:** The same person is the same `UserN` everywhere in the export; two different people never share an alias.

### TC-13 — Media file names anonymized (FR-21)
**Steps:** Ensure one T-JIRA attachment has a person's name in its file name. Export with anonymization on. List `media/`.
**Expected:** The saved file name contains the alias (e.g. `03-User1-report.pdf`), not the real name.

### TC-14 — Anonymization off (FR-09, FR-19)
**Steps:** Uncheck "Anonymize names", export T-JIRA, inspect the `.md` and `media/`.
**Expected:** Real names are preserved everywhere. The checkbox introduced no other change to the flow or output structure.

---

## D. Failure handling

### TC-15 — Partial media failure does not abort (FR-12)
**Steps:** Export T-BROKEN (one unreachable attachment, others fine).
**Expected:** The `.md` file is created and complete; all reachable media files are saved; the popup error details name only the failed attachment. The export is a visible partial success, not a total failure.

---

## E. Tracker

### TC-16 — Jira export (FR-01, FR-02)
**Steps:** Run TC-06 + TC-08 flow on T-JIRA.
**Expected:** Passes as specified; no requests to Jira REST APIs appear in DevTools beyond what the page itself makes (data comes from the DOM).

---

## F. Privacy

### TC-17 — No third-party traffic (NFR-01)
**Steps:** Open DevTools → Network for the popup/service worker (chrome://extensions → Inspect views) and for the page. Export T-JIRA. Review all requests initiated by the extension.
**Expected:** The extension only fetches attachment URLs from hosts the ticket page already uses. No analytics, telemetry, or any other third-party request; no cookies set by the extension.

---

## Traceability

| Requirement | Covered by |
|-------------|-----------|
| FR-01, FR-02 | TC-16 |
| FR-04…FR-07 | TC-01…TC-04 |
| FR-09 | TC-14 |
| FR-10 | TC-08 |
| FR-08 | TC-05 |
| FR-12 | TC-05b, TC-15 |
| FR-13 | TC-09 |
| FR-14 | TC-10 |
| FR-15…FR-17 | TC-06 |
| FR-18 | TC-07 |
| FR-19…FR-21 | TC-11…TC-14 |
| NFR-01 | TC-17 |
| NFR-06 | TC-01 (console check) |
