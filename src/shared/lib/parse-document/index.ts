// Public API for shared/lib/parse-document — CV upload validation
// (add-upload-cv, FR-CV-01, TC-PARSE-01/02). PURE EXPORTS ONLY (TC-PURE-01):
// the server-only extraction adapter (./extract.ts, wraps pdf-parse/mammoth)
// is imported directly by the route handler, never via this barrel — the same
// rule that keeps `pg` out of client bundles via shared/lib/db/pg.ts.
export {
  DOCX_MIME,
  MAX_ATTACHMENT_BYTES,
  MAX_UPLOAD_BYTES,
  PDF_MIME,
  documentTypeForMime,
  sniffDocumentType,
  validateUpload,
  type DocumentType,
  type UploadValidationError,
  type UploadValidationInput,
  type UploadValidationResult,
} from "./sniff";
