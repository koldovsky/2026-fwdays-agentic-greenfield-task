# Design — add-upload-cv

## Context

The PRD's CV intake has two paths: upload a PDF/DOCX file (`FR-CV-01`) or paste plain text
(`FR-CV-02`). Only paste exists today — `TailoringForm` (`features/run-tailoring`) reads an
uncontrolled `cvText` textarea via `FormData`. The upload path is fully constrained by the PRD:
text extraction happens server-side only, the client never receives or parses raw binary
(`TC-PARSE-01` for PDF, `TC-PARSE-02` for DOCX), and both constraints left the library "TBD".
`FR-CV-03` additionally requires the parsed CV to be reviewable before tailoring begins, with a
confirm-or-re-upload step.

Two repo conventions constrain the shape: `shared/lib` is framework-free with no Node/DOM IO
(`TC-PURE-01`), yet file parsing is unavoidably Node IO — the same tension `shared/lib/db`
already resolved. And FSD forbids `features` importing `features`, yet the extracted text must
land in `run-tailoring`'s CV textarea.

## Goals

- A user can drag-and-drop (or browse for) a PDF or DOCX CV and get its plain text into the
  existing CV textarea, ready to edit and tailor (`FR-CV-01`, the confirm half of `FR-CV-03`).
- All binary parsing happens server-side; the client sends the raw file to `POST /api/cv/parse`
  and receives only extracted text (`TC-PARSE-01`, `TC-PARSE-02`).
- Every failure — wrong type, oversized file, corrupt or scanned (image-only) document — surfaces
  as calm, localized ua/en copy, never a raw exception or a blank (`NFR-OBS-01`).
- Uploaded bytes are transient: parsed in memory and discarded, never persisted to disk or blob
  storage, and neither the bytes nor the extracted text are ever logged (`NFR-SEC-01`).
- The server trusts nothing from the client: type, magic bytes, and size are re-validated
  server-side regardless of what the browser claimed (defense-in-depth, `NFR-SEC-04`).

## Decisions

- **Libraries: `pdf-parse` for PDF, `mammoth` for DOCX.** Resolves the "TBD" in
  `TC-PARSE-01`/`TC-PARSE-02`. Both are pure-JS buffer-in/text-out (no native bindings, no
  headless browser), run in the existing Node route-handler runtime, and match the PRD's own
  candidate lists. `pdfjs-dist` (heavier, worker-oriented) and a Cloudflare Worker (new deploy
  target for no benefit at this scale) were the PRD's alternatives — rejected.
- **`shared/lib/parse-document` splits pure core from server-only IO — the `shared/lib/db`
  precedent.** This module is the second `shared/lib` member that genuinely needs Node IO, which
  breaks the `TC-PURE-01` convention the rest of `shared/lib` follows. Resolution mirrors
  `shared/lib/db` exactly: the barrel (`index.ts`) exports only the pure, framework-free part —
  types, the 5 MB size constant, and `sniffDocumentType(bytes)` (magic-byte detection over a
  `Uint8Array`: `%PDF-` prefix → pdf, `PK\x03\x04` zip prefix → docx candidate) plus
  type/size validation, all deterministic and unit-testable with in-memory byte arrays. The
  extraction adapter (`extract.ts`, wrapping `pdf-parse`/`mammoth`) is server-only and imported
  **directly by the route handler, never via the barrel** — the same rule that keeps `pg` out of
  client bundles via `shared/lib/db/pg.ts`. Tests: pure core under plain vitest with byte
  fixtures; the adapter with small real PDF/DOCX fixture files, node environment.
- **One endpoint, multipart, text out: `POST /api/cv/parse`.** The dropzone posts the file as
  `multipart/form-data`; the route reads it with `request.formData()` (the documented route-
  handler pattern in this Next version), re-validates size, declared type, and magic bytes, calls
  the extraction adapter, and returns `{ text }`. The client never holds a parse library and
  never receives binary back (`TC-PARSE-01/02`). No streaming — extraction of a 5 MB document is
  well under interactive latency, and a plain JSON response keeps the error contract simple.
- **Validation is duplicated on purpose — client for UX, server for trust.** The dropzone
  rejects wrong extensions/MIME and files over 5 MB before uploading, giving instant feedback.
  The server re-checks all three (size, MIME, magic bytes) because the browser's claims are
  attacker-controlled: a `.pdf`-named executable or a spoofed `Content-Type` fails the
  magic-byte sniff and gets the calm `unsupported_type` error. Client-side checks are never the
  security boundary (`NFR-SEC-04` defense-in-depth).
- **5 MB max upload size.** Concrete, enforced on both sides. Real-world CVs are well under
  1 MB; 5 MB leaves headroom for photo-heavy exports while capping parse CPU and memory. The
  limit lives once, in the pure core, imported by both the dropzone and the route.
- **Calm coded errors, JSON, never a raw 500.** The route answers failures with
  `{ error: "unsupported_type" | "too_large" | "unparseable" }` and an appropriate 4xx status —
  a parse-library throw is caught and mapped to `unparseable`, never propagated (`NFR-OBS-01`).
  A PDF that parses but yields empty/whitespace-only text (a scanned, image-only CV — no OCR in
  MVP) is also `unparseable`; its ua/en copy explicitly points the user at the paste path
  (`FR-CV-02`) as the fallback. Error codes travel the wire; localization stays client-side in
  `shared/lib/i18n` under a new `uploadCv` section (`NFR-I18N-01`), matching how
  `TailorErrorCode` copy works today.
- **Bytes are transient; text is never logged.** The file lives only in request memory for the
  duration of the parse — no blob store, no temp files, no persistence of any kind in this
  change (`FR-CV-04` profile storage is a separate, already-built capability that starts from
  *text*, not files). Neither the buffer nor the extracted text appears in any log or error
  message (`NFR-SEC-01`); error responses carry codes only.
- **The new public endpoint is rate-limited from day one.** Parsing is the most CPU-expensive
  unauthenticated request in the app, so `POST /api/cv/parse` reuses the existing
  `shared/lib/rate-limit` per-IP sliding-window limiter (from `add-security-hardening`) with a
  modest per-IP allowance — over-limit requests get the same calm coded-JSON treatment
  (`NFR-SEC-04`, `NFR-OBS-01`).
- **FSD composition: `onExtracted(text)` prop, state lifted to the view.** `features/upload-cv`
  cannot import `features/run-tailoring` (features never import features), so the dropzone knows
  nothing about the form: it exposes `UploadCvDropzone({ locale, onExtracted })` from its
  barrel. `TailoringForm`'s current props were checked — `{ locale, onResult }` only, with an
  uncontrolled `cvText` textarea — so there is no controlled prop to reuse; the cleanest path is
  to add optional `cvText?: string` / `onCvTextChange?: (text: string) => void` props that make
  the textarea controlled **only when provided** (existing uncontrolled usage and tests are
  untouched). `views/tailor-workspace` lifts a single `cvText` state and wires
  `onExtracted={setCvText}` into the dropzone and `cvText`/`onCvTextChange` into the form —
  upward composition at the view layer, exactly how the view already composes the two result
  widgets. A key-remount + `defaultValue` alternative was rejected: it would wipe manual edits
  and reset in-flight form state on every upload.
- **Upload feeds review, never bypasses it.** Extracted text lands in the editable textarea, not
  directly into a tailoring run — the user reads, edits, or re-uploads before pressing tailor.
  This implements the confirm/re-upload half of `FR-CV-03`; a subsequent upload simply replaces
  the textarea content.

## Non-goals

- The structured summary rendering of `FR-CV-03` (experience items / skills / education via a
  `cv-summary` widget) — this change ships raw-text review; structured parsing of the extracted
  text is its own follow-up capability.
- OCR for scanned/image-only PDFs — out of MVP; such files get the calm `unparseable` error and
  a pointer to paste-as-text (`FR-CV-02`).
- Blob/object storage of uploads (`system-design.md` lists one for later) — bytes are transient
  here; persistence of the *parsed profile* is `FR-CV-04`, already covered by `add-persistence`.
- Wiring upload into the future wizard (`add-resume-wizard` step 1) — the wizard spec composes
  this same feature slice later; nothing wizard-specific is built here.
- Virus scanning of uploads — magic-byte + size validation plus parse-and-discard (bytes are
  never stored or re-served) is the MVP posture; note it as a hardening follow-up if files are
  ever persisted.

## Risks

- **`pdf-parse` quality varies with PDF producers** — multi-column layouts or text-as-curves
  exports can yield garbled or empty text. Mitigated by the honest `unparseable` path with a
  paste fallback, and by the user always reviewing the extracted text before tailoring (a bad
  extraction is visible, not silent).
- **Parse CPU on a serverless runtime** — a pathological (e.g. compression-bomb) document could
  burn the request budget. Mitigated by the 5 MB cap, the per-IP rate limit, and the route's
  bounded runtime; parsing failures surface calmly rather than hanging (`NFR-OBS-01`).
- **DOCX is a zip container** — the `PK` magic bytes only prove "zip", not "DOCX"; a renamed
  `.zip` reaches `mammoth`, which then fails on the missing document parts. Acceptable: the
  failure is caught and mapped to `unparseable`, and `mammoth` does not execute embedded
  content.
- **A second IO module inside `shared/lib` erodes the `TC-PURE-01` line** — mitigated by
  following the `db` precedent strictly (pure barrel, direct-import adapter) so ESLint's
  framework-free rule keeps passing for the barrel path; if a third case appears, consider
  promoting a dedicated `shared/io` convention instead.
