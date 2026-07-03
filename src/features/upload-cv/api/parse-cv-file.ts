// Client for POST /api/cv/parse (add-upload-cv task 3.4, TC-PARSE-01/02).
// Posts the raw file as multipart/form-data and receives extracted plain text
// back — the client never holds a parse library and never receives binary.
// Never throws across this boundary: network failures, malformed responses,
// and unknown server codes all map to a calm coded outcome (NFR-OBS-01).
import type { ParseCvOutcome, UploadCvErrorCode } from "../model/types";
import { resolveCvMime } from "../lib/validate-file";

const KNOWN_CODES: readonly UploadCvErrorCode[] = ["unsupported_type", "too_large", "unparseable"];

function toErrorCode(code: unknown): UploadCvErrorCode {
  return KNOWN_CODES.find((known) => known === code) ?? "failed";
}

export async function parseCvFile(file: File): Promise<ParseCvOutcome> {
  // Normalize the declared MIME from the extension when the drag source left
  // `type` empty, so the server's declared-MIME check sees what the user
  // meant; its magic-byte sniff stays the trust boundary (NFR-SEC-04).
  const mime = resolveCvMime(file);
  const upload =
    mime === null || mime === file.type ? file : new File([file], file.name, { type: mime });

  const body = new FormData();
  body.append("file", upload);

  try {
    const response = await fetch("/api/cv/parse", { method: "POST", body });
    const payload: unknown = await response.json();
    const { text, error } = (payload ?? {}) as { text?: unknown; error?: unknown };
    if (response.ok && typeof text === "string") return { ok: true, text };
    return { ok: false, error: toErrorCode(error) };
  } catch {
    // Rejected fetch or a non-JSON body — same calm outcome as a coded error.
    return { ok: false, error: "failed" };
  }
}
