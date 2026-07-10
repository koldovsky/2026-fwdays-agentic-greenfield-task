// upload-cv error contract (add-upload-cv, FR-CV-01, NFR-OBS-01). Codes travel
// the wire from POST /api/cv/parse; localization stays client-side in
// shared/lib/i18n (uploadCv.error.*), matching how TailorErrorCode works.
//   - `rate_limited`  — the per-IP parse throttle tripped (429): a distinct,
//     actionable message ("wait a few minutes") instead of the generic failure.
//   - `server_error`  — the endpoint answered 5xx or a non-JSON body (a crashed
//     or timed-out serverless function): the honest "service unavailable" case,
//     split out from a client-side network `failed` so prod triage can tell
//     them apart from the copy alone.
//   - `failed`        — client-side catch-all: a rejected fetch (offline) or an
//     unmapped 4xx code all degrade to it calmly.

export type UploadCvErrorCode =
  | "unsupported_type"
  | "too_large"
  | "unparseable"
  | "rate_limited"
  | "server_error"
  | "failed";

/** Outcome of one parse request — never throws across this boundary. */
export type ParseCvOutcome =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: UploadCvErrorCode };
