## Why

Today the only way to get a CV into Vouch is to paste plain text (`FR-CV-02`). The PRD's
primary intake path — upload a PDF or DOCX and have the app extract the text server-side
(`FR-CV-01`, status `proposed` since the beginning) — does not exist: there is no upload UI, no
parse endpoint, and no extraction library in the tree. Most real CVs live as PDF/DOCX files,
so every user currently has to open their CV elsewhere, select-all, and paste — friction on the
very first step of the core loop. The PRD already constrains how this must work: extraction is
server-side only, the client never receives or parses raw binary (`TC-PARSE-01`, `TC-PARSE-02`),
and the libraries were left "TBD" — this change decides them (`pdf-parse` for PDF, `mammoth` for
DOCX) and builds the path.

## What Changes

- Add `pdf-parse` (PDF) and `mammoth` (DOCX) as the text-extraction libraries, resolving the
  "library TBD" in `TC-PARSE-01`/`TC-PARSE-02`.
- Add `shared/lib/parse-document`: a pure validation core (magic-byte sniffing, type + size
  checks, `TC-PURE-01`) plus an isolated server-only extraction adapter, following the
  `shared/lib/db` precedent for server-only IO inside `shared/lib`.
- Add `POST /api/cv/parse`: a multipart route handler that re-validates type, magic bytes, and
  size server-side, extracts plain text in memory, and returns it as JSON. Uploaded bytes are
  transient — parsed and discarded, never persisted, never logged (`NFR-SEC-01`). Failures are
  calm coded JSON errors, never a raw exception (`NFR-OBS-01`). The route reuses the existing
  `shared/lib/rate-limit` per-IP limiter (`NFR-SEC-04`) — parsing is CPU-heavy and the endpoint
  is public.
- Add `features/upload-cv`: a drag-and-drop dropzone (also click-to-browse) with client-side
  type + size validation (max 5 MB) and calm ua/en error copy for wrong type, too large, and
  unparseable-or-scanned files, exposing an `onExtracted(text)` prop.
- Compose it in `views/tailor-workspace`: extracted text lands in the existing CV textarea
  (`features/run-tailoring`'s `TailoringForm`) via state lifted to the view — upload never
  bypasses review; the user sees and can edit the extracted text before tailoring (the
  confirm/re-upload half of `FR-CV-03`).

## Capabilities

### New Capabilities
- `upload-cv`: CV file intake — drag-and-drop/browse upload of PDF or DOCX, server-side text
  extraction, validation, and calm failure handling, feeding the existing tailoring form.
  Serves `FR-CV-01`, `TC-PARSE-01`, `TC-PARSE-02`, and the confirm-before-tailoring half of
  `FR-CV-03`.

### Modified Capabilities
<!-- None. `TailoringForm` gains an optional controlled-value prop but its existing paste
behavior (FR-CV-02) and run contract are unchanged. -->

## Impact

- New: `shared/lib/parse-document` (pure validation core + server-only extraction adapter),
  `src/app/api/cv/parse/route.ts`, `src/features/upload-cv` (ui/model/api segments + barrel).
- Edited: `package.json` (+ `pdf-parse`, `mammoth`),
  `src/features/run-tailoring/ui/TailoringForm.tsx` (optional `cvText`/`onCvTextChange`
  controlled props, backwards-compatible), `src/views/tailor-workspace/ui/TailorWorkspace.tsx`
  (composes the dropzone with the form), `src/shared/lib/i18n/{types,ua,en}.ts` (new `uploadCv`
  copy).
- Depends on: `add-security-hardening`'s `shared/lib/rate-limit` (already in tree) for per-IP
  throttling of the new public endpoint.
- Serves: `FR-CV-01`, `FR-CV-03` (partial — confirm/re-upload), `TC-PARSE-01`, `TC-PARSE-02`,
  `NFR-OBS-01`, `NFR-SEC-01`, `NFR-SEC-04`.
