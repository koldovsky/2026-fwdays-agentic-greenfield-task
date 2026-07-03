// Pure upload-validation core for CV file intake (add-upload-cv, FR-CV-01,
// TC-PARSE-01/02). Framework-free and IO-free (TC-PURE-01): callers pass raw
// bytes and the declared MIME string; nothing here touches File, Request, or
// the filesystem. The server-only extraction adapter lives in ./extract.ts and
// is deliberately NOT re-exported from the barrel (shared/lib/db precedent).

/** Single source of truth for the upload size cap — 5 MB (design.md). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** The two document formats Vouch accepts (FR-CV-01). */
export type DocumentType = "pdf" | "docx";

export const PDF_MIME = "application/pdf";
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** `%PDF-` — every PDF starts with this ASCII prefix. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
/** `PK\x03\x04` — a zip local-file header; DOCX is a zip container, so this
 * only proves "zip", not "DOCX" (design.md risk: mammoth rejects non-DOCX
 * zips downstream, mapped to `unparseable`). */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((byte, index) => bytes[index] === byte);
}

/**
 * Magic-byte detection over the leading bytes: `%PDF-` → pdf, `PK\x03\x04` →
 * docx candidate, anything else → null. This — not the client-declared MIME —
 * is the trust boundary (NFR-SEC-04).
 */
export function sniffDocumentType(bytes: Uint8Array): DocumentType | null {
  if (hasPrefix(bytes, PDF_MAGIC)) return "pdf";
  if (hasPrefix(bytes, ZIP_MAGIC)) return "docx";
  return null;
}

/** Map a declared MIME type to a document type, or null when unsupported. */
export function documentTypeForMime(mime: string): DocumentType | null {
  if (mime === PDF_MIME) return "pdf";
  if (mime === DOCX_MIME) return "docx";
  return null;
}

export type UploadValidationError = "unsupported_type" | "too_large";

export type UploadValidationResult =
  | { readonly ok: true; readonly type: DocumentType }
  | { readonly ok: false; readonly error: UploadValidationError };

export interface UploadValidationInput {
  /** Total upload size in bytes (checked against {@link MAX_UPLOAD_BYTES}). */
  readonly byteLength: number;
  /** Client-declared MIME type — attacker-controlled, verified against magic bytes. */
  readonly declaredMime: string;
  /** Leading file bytes (the whole file is fine) for magic-byte sniffing. */
  readonly bytes: Uint8Array;
}

/**
 * Full server-side validation (TC-PARSE-01/02, NFR-SEC-04 defense-in-depth):
 * size cap, declared MIME must be a supported type, and the magic bytes must
 * match what was declared — a spoofed `Content-Type` is `unsupported_type`.
 */
export function validateUpload(input: UploadValidationInput): UploadValidationResult {
  if (input.byteLength > MAX_UPLOAD_BYTES) return { ok: false, error: "too_large" };

  const declaredType = documentTypeForMime(input.declaredMime);
  if (declaredType === null) return { ok: false, error: "unsupported_type" };

  const sniffedType = sniffDocumentType(input.bytes);
  if (sniffedType !== declaredType) return { ok: false, error: "unsupported_type" };

  return { ok: true, type: declaredType };
}
