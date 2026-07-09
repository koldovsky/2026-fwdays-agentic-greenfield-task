// upload-cv error contract (add-upload-cv, FR-CV-01, NFR-OBS-01). Codes travel
// the wire from POST /api/cv/parse; localization stays client-side in
// shared/lib/i18n (uploadCv.error.*), matching how TailorErrorCode works.
// `failed` is the client-side catch-all: network failure, malformed response,
// or an unknown server code (e.g. rate_limited) all degrade to it calmly.

export type UploadCvErrorCode = "unsupported_type" | "too_large" | "unparseable" | "failed";

/** Outcome of one parse request — never throws across this boundary. */
export type ParseCvOutcome =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: UploadCvErrorCode };
