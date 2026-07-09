## 1. Dependencies + parse-document core

- [x] 1.1 Add `pdf-parse` and `mammoth` dependencies (resolves the "library TBD" in
      TC-PARSE-01/TC-PARSE-02); verify both load in the Node route-handler runtime
- [x] 1.2 `shared/lib/parse-document` pure core: `sniffDocumentType(bytes)` magic-byte
      detection (`%PDF-` → pdf, `PK\x03\x04` → docx candidate), declared-MIME check, and the
      single 5 MB `MAX_UPLOAD_BYTES` constant; barrel exports pure parts only (TC-PURE-01);
      unit tests with in-memory byte arrays (valid pdf/docx prefixes, spoofed extension,
      oversize)
- [x] 1.3 `shared/lib/parse-document/extract.ts` server-only adapter wrapping
      `pdf-parse`/`mammoth` — buffer in, plain text out; imported directly, never via the
      barrel (`shared/lib/db/pg.ts` precedent); tests with small real PDF/DOCX fixtures,
      including an empty-text (scanned-style) PDF mapping to `unparseable`

## 2. `POST /api/cv/parse` route

- [x] 2.1 Multipart route handler: `request.formData()`, re-validate size + declared MIME +
      magic bytes server-side regardless of client claims (TC-PARSE-01/02, NFR-SEC-04
      defense-in-depth), call the extraction adapter, respond `{ text }`
- [x] 2.2 Calm failure contract: coded JSON errors
      (`unsupported_type` / `too_large` / `unparseable`) with 4xx status — parse-library throws
      caught and mapped, never a raw exception or 500 (NFR-OBS-01); no byte content or
      extracted text in any log or error body (NFR-SEC-01); bytes transient — no temp files, no
      blob writes
- [x] 2.3 Per-IP rate limiting via the existing `shared/lib/rate-limit` in-memory adapter;
      over-limit → same calm coded-JSON rejection (NFR-SEC-04)
- [x] 2.4 Route tests: happy path pdf + docx, each error code, spoofed `Content-Type` with
      wrong magic bytes rejected, over-limit rejected

## 3. `features/upload-cv` slice

- [x] 3.1 Scaffold the slice (fsd-scaffold): `ui`/`model`/`api` segments + `index.ts` barrel
      exporting only `UploadCvDropzone` and its types; model defines the
      `UploadCvErrorCode = "unsupported_type" | "too_large" | "unparseable" | "failed"` union
- [x] 3.2 i18n copy: new `uploadCv` section in `shared/lib/i18n/{types,ua,en}.ts` — dropzone
      label/hint, browse action, pending state, and calm error copy per code; the
      `unparseable` copy points to the paste path as fallback (FR-CV-02); Ukrainian-first
      (NFR-I18N-01), no emoji, no exclamation points
- [x] 3.3 `UploadCvDropzone({ locale, onExtracted })`: drag-and-drop zone that is also
      click-to-browse (keyboard reachable, `input type="file"` with `accept` for pdf/docx);
      client-side type + 5 MB size validation before upload (UX only — server re-validates);
      pending and error states styled with design tokens; component tests for drop, browse,
      reject-wrong-type, reject-too-large, server-error surfaced calmly (FR-CV-01, NFR-OBS-01)
- [x] 3.4 `api` segment: `parseCvFile(file)` client posting `multipart/form-data` to
      `/api/cv/parse`, mapping non-OK/coded responses to `UploadCvErrorCode` (network failure →
      `failed`), returning extracted text — client never touches a parse library (TC-PARSE-01/02)

## 4. View composition

- [x] 4.1 `TailoringForm`: optional `cvText?: string` + `onCvTextChange?: (text) => void`
      props — textarea becomes controlled only when provided; existing uncontrolled usage,
      paste path (FR-CV-02), and current tests unchanged
- [x] 4.2 `views/tailor-workspace`: lift `cvText` state, render `UploadCvDropzone` with
      `onExtracted={setCvText}` above the form and pass `cvText`/`onCvTextChange` down —
      extracted text lands in the editable textarea for review/edit/re-upload before tailoring
      (FR-CV-01, FR-CV-03 confirm half); view test: simulated extraction populates the textarea
      and a subsequent upload replaces it

## 5. Verify & review

- [ ] 5.1 agent-verify: lint/build/test green; evidence for FR-CV-01 (file → text → textarea),
      TC-PARSE-01/02 (server-side only, client bundle free of parse libs), NFR-OBS-01 (every
      failure path calm), NFR-SEC-01 (no text in logs), NFR-SEC-04 (spoofed type rejected,
      rate limit)
- [ ] 5.2 Independent checker-review vs PRD + FSD import rules (no feature→feature import;
      barrel-only imports) + the TC-PURE-01 boundary of `shared/lib/parse-document`
