/**
 * Hand-written TypeScript mirror of the F1 API contract.
 *
 * Source of truth on the backend: `backend/src/epubtv/api/schemas.py`.
 * Kept in sync manually (frontend/CONVENTIONS.md — no codegen this sprint).
 * Every field below MUST match the backend Pydantic model shape exactly:
 *  - `epub_id: str` is a uuid4 hex (no dashes) emitted by `LocalFileStore`.
 *  - `title` / `author` are `string | null` (no empty-string normalisation).
 *  - `declared_languages` is a `string[]` of BCP-47 tags; an empty list means
 *    "no languages declared in the OPF".
 *  - `chapter_count` is a non-negative integer; `chapter_ids` is a `string[]`
 *    of length equal to `chapter_count` (canonical rule: spine ITEM_DOCUMENT
 *    with non-empty stripped text — locked in `EpubService._extract_chapters`).
 *
 * The cancel surface (DELETE /api/v1/jobs/{id}) is documented in
 * docs/agents/api-contract.md; the SPA consumes it via the useCancelJob
 * hook (no shared schema type — 204 No-Content has no body).
 */
export interface EpubUploadResponse {
  epub_id: string;
  title: string | null;
  author: string | null;
  declared_languages: string[];
  chapter_count: number;
  chapter_ids: string[];
}

/** Single error payload inside the `{error: {...}}` envelope. */
export interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Top-level error envelope. The backend always wraps errors in this shape. */
export interface ErrorResponse {
  error: ErrorPayload;
}

/** Stable error codes from the F1 endpoint (api-contract.md). */
export const ErrorCode = {
  InvalidEpub: "invalid_epub",
  FileTooLarge: "file_too_large",
  SourceLanguageRequired: "source_language_required",
  ProviderTimeout: "provider_timeout",
  ProviderUnreachable: "provider_unreachable",
  NotFound: "not_found",
  ValidationError: "validation_error",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/* ────────────────────────────────────────────────────────────────────────────
 * Phase 2 — F2 / F5 contract (plan 02-05)
 *
 * Mirrors the backend Pydantic v2 discriminated union on `POST /api/v1/jobs`
 * (D-05 + F4-AC1). The `job_type` field is the discriminator; TypeScript's
 * structural typing does NOT enforce the variant-field contract the way
 * Pydantic's per-variant `extra="forbid"` does, so the SPA must construct
 * the correct variant from the chooser state at the call site.
 * ────────────────────────────────────────────────────────────────────────── */

export interface TranslationJobBody {
  job_type: "translation";
  epub_id: string;
  provider: string;
  model: string;
  source_language: string | null;
  target_language: string;
  /**
   * Phase 1 plan 02: user-chosen base URL for the translation provider.
   * Optional for the sprint — the in-process `MockTranslationAdapter`
   * ignores it; the consolidated mock service (Plan 04) is the
   * consumer. The backend Pydantic `extra="allow"` (per current
   * `schemas.py` config) ignores unknown fields gracefully.
   */
  provider_base_url?: string | null;
  chapter_ids?: string[] | null;
}

export interface VoiceoverJobBody {
  job_type: "voiceover";
  epub_id: string;
  voice: string;
  /**
   * Phase 1 plan 03: user-chosen base URL for the TTS provider
   * (OpenAI-compatible for the voice-over pipeline). Optional for
   * the sprint — the in-process `MockTTSAdapter` ignores it; the
   * consolidated mock service (Plan 04) is the consumer.
   */
  provider_base_url?: string | null;
  /**
   * Phase 1 plan 03: user-typed OpenAI API key for the TTS
   * provider. Optional for the sprint — same forward-compat note
   * as `provider_base_url`. Session-only (per PRD §6 security
   * model); never persisted.
   */
  provider_api_key?: string | null;
  chapter_ids?: string[] | null;
  // Translation fields are FORBIDDEN here — backend Pydantic v2 per-variant
  // `extra="forbid"` (F4-AC1) rejects them at parse time. The chooser UI
  // never adds translation fields to the voiceover body.
}

export interface CombinedJobBody {
  job_type: "translation+voiceover";
  epub_id: string;
  provider: string;
  model: string;
  source_language: string | null;
  target_language: string;
  voice: string;
  chapter_ids?: string[] | null;
}

export type JobCreateBody = TranslationJobBody | VoiceoverJobBody | CombinedJobBody;

export interface JobView {
  id: string;
  epub_id: string;
  job_type: string;
  status: string;
  source_language: string | null;
  target_language: string | null;
  /** D-06: the TTS voice chosen for voiceover jobs; null for translation jobs. */
  voice: string | null;
  chapter_ids: string[];
  last_chunk_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobListResponse {
  jobs: JobView[];
}

/**
 * 6-field progress event envelope (F5-AC5 + D-03). Emitted verbatim by the
 * backend's `WS /api/v1/jobs/{id}/events` endpoint. The 6 keys are the
 * minimum the frontend needs to render the progress bar + chunk list.
 */
export interface JobProgressEvent {
  job_id: string;
  job_type: string;
  chunk_id: string | null;
  progress_current: number;
  progress_total: number;
  status: "running" | "completed" | "failed";
  error?: string;
}

/**
 * D-09 NLTK health shape. NLTK ships a single ``punkt_tab`` data
 * package (the legacy ``punkt`` package is deprecated); the
 * ``supported_languages`` list is the 19-language closed set
 * NLTK ships. ``fallback_languages`` is the subset of the 19 that
 * are NOT installed on disk (i.e. the user's target language will
 * be tokenized with the regex fallback). When neither
 * ``supported_languages`` nor ``fallback_languages`` contains a
 * code, the language is not supported by NLTK at all (the
 * `<TranslationConfigStep>` banner renders a different message for
 * that case).
 *
 * ``suggest_command`` + ``install_size_mb_estimate`` are nullable:
 * they are populated only when at least one NLTK package is
 * missing on disk.
 */
export interface HealthNltkResponse {
  supported_languages: string[];
  fallback_languages: string[];
  suggest_command: string | null;
  install_size_mb_estimate: number | null;
}

export interface EpubMetadataResponse {
  epub_id: string;
  title: string | null;
  author: string | null;
  declared_languages: string[];
  chapter_count: number;
  chapter_ids: string[];
}

export interface ProviderModelList {
  models: string[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Phase 1 plan 04 — dynamic model loading (POST /providers/{ollama,openai-compatible}/models)
 *
 * Mirrors the backend POST-shaped endpoints (BACK-03 + BACK-05). The
 * SPA sends the chosen `base_url` (and the OpenAI-compatible
 * `api_key`) in the request body; the backend constructs the
 * provider Python client per request and returns the model catalog
 * from the upstream provider. A 502 with `error.code =
 * "provider_unreachable"` means the upstream is unreachable or
 * returned an auth failure; the SDK's error message surfaces in
 * `details.provider_error`.
 * ────────────────────────────────────────────────────────────────────────── */

export type ProviderIdLiteral = "ollama" | "openai-compatible";

/** Wire body for `POST /api/v1/providers/ollama/models` (BACK-05). */
export interface OllamaProviderModelsBody {
  base_url: string;
}

/** Wire body for `POST /api/v1/providers/openai-compatible/models` (BACK-03). */
export interface OpenAIProviderModelsBody {
  base_url: string;
  api_key: string;
}

/** Single Ollama model entry (the SDK's `model` field is mapped to `name` on the wire). */
export interface OllamaModelEntry {
  name: string;
}

/** Successful response from `POST /api/v1/providers/ollama/models`. */
export interface OllamaProviderModelsResponse {
  models: OllamaModelEntry[];
}

/** Single OpenAI-style model entry (the SDK's `Model` shape, mirrored as plain dict). */
export interface OpenAIModelEntry {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

/** Successful response from `POST /api/v1/providers/openai-compatible/models`. */
export interface OpenAIProviderModelsResponse {
  models: OpenAIModelEntry[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Quick 260708-t1t — runtime default base-URL endpoints
 * (``GET /api/v1/providers/{ollama,openai-compatible}/base-url``)
 *
 * The SPA reads the runtime-configured default base URL from the API
 * at mount time (the values are public URLs; the endpoints are
 * unauthenticated).
 * ────────────────────────────────────────────────────────────────────────── */

/** Successful response from the two `GET /api/v1/providers/.../base-url` endpoints. */
export interface ProviderBaseUrlResponse {
  base_url: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Phase 3 — F4 / voices catalog (plan 03-04)
 *
 * D-07: `GET /api/v1/voices` — the SPA's voice catalog bootstrap.
 * OpenAI voices are a fixed set; there is no per-language provider
 * endpoint to call. The response is a single-key envelope with the
 * full voice list; the `<VoiceoverConfigStep>` renders the entire
 * list in the voice dropdown (no per-language matching).
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Successful response from `GET /api/v1/voices`. The OpenAI voice
 * catalog is a fixed set, so the response is a single flat list of
 * voice ids (not a per-language matrix).
 */
export interface VoicesResponse {
  /** Canonical OpenAI voice ids; non-empty. */
  voices: string[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Phase 4 — F6 download surface (plan 04-03)
 *
 * Mirrors `backend/src/epubtv/api/routers/download.py` (DL-01..03). The
 * backend pre-builds both artifacts at job completion (single-writer
 * seam; worker writes `{artifact_dir}/{job_id}/translated.epub` and
 * `{artifact_dir}/{job_id}/audio.zip` on the `completed` transition)
 * and this endpoint streams the prebuilt file in 64KB chunks.
 * The SPA renders an `<a download>` link with the relative API URL
 * (UI-SPEC §3.2) — the browser handles
 * `Content-Disposition: attachment; filename*=UTF-8''...` so no
 * client-side filename sanitization is required (DL-02 invariant).
 * ────────────────────────────────────────────────────────────────────────── */

/** Discriminator for the download endpoint's `?artifact=...` query param. */
export const DownloadArtifactKind = {
  Epub: "epub",
  Zip: "zip",
} as const;

export type DownloadArtifactKindValue =
  (typeof DownloadArtifactKind)[keyof typeof DownloadArtifactKind];

/** Content-Type emitted by the backend for each artifact kind. */
export const DownloadArtifactContentType: Record<DownloadArtifactKindValue, string> = {
  [DownloadArtifactKind.Epub]: "application/epub+zip",
  [DownloadArtifactKind.Zip]: "application/zip",
};

/**
 * Build the relative download URL for a given job id + artifact kind.
 * The browser navigates to `window.location.origin + href`; for the
 * single-origin dev setup the SPA on `:5173` resolves to the
 * uvicorn-served static mount AND the API on the same origin (no
 * CORS).
 */
export function downloadHref(jobId: string, kind: DownloadArtifactKindValue): string {
  return `/api/v1/jobs/${encodeURIComponent(jobId)}/download?artifact=${kind}`;
}
