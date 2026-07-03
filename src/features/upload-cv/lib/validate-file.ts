// Client-side pre-upload validation (add-upload-cv task 3.3). UX only — it
// gives instant feedback before any network call; the server re-validates
// size, MIME, and magic bytes as the real trust boundary (NFR-SEC-04,
// design.md "validation is duplicated on purpose"). Pure: operates on plain
// name/type/size fields so it unit-tests without File or DOM.
import {
  DOCX_MIME,
  MAX_UPLOAD_BYTES,
  PDF_MIME,
  documentTypeForMime,
} from "@/shared/lib/parse-document";

import type { UploadCvErrorCode } from "../model/types";

/** The `accept` attribute for the hidden file input (extensions + MIMEs). */
export const CV_FILE_ACCEPT = `.pdf,.docx,${PDF_MIME},${DOCX_MIME}`;

export interface CandidateFile {
  readonly name: string;
  /** Browser-declared MIME type; may be empty for some drag sources. */
  readonly type: string;
  readonly size: number;
}

/**
 * The MIME type to declare when uploading, or null when the file is not a
 * PDF/DOCX. The browser's `type` wins when it is a supported MIME; otherwise
 * the extension decides — some drag sources omit `type` entirely. Purely a
 * client-side normalization: the server's magic-byte sniff has the final word
 * (NFR-SEC-04).
 */
export function resolveCvMime(file: CandidateFile): string | null {
  if (documentTypeForMime(file.type) !== null) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return PDF_MIME;
  if (lower.endsWith(".docx")) return DOCX_MIME;
  return null;
}

/**
 * Returns the error to show without uploading, or null when the file looks
 * uploadable.
 */
export function validateCvFile(file: CandidateFile): UploadCvErrorCode | null {
  if (resolveCvMime(file) === null) return "unsupported_type";
  if (file.size > MAX_UPLOAD_BYTES) return "too_large";
  return null;
}
