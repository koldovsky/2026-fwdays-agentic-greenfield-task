/**
 * Axios instance for the F1 EPUB upload endpoint.
 *
 * Base URL: `process.env.NEXT_PUBLIC_API_BASE` (D-03) — defaults to the
 * uvicorn local dev port. In production the SPA is served by uvicorn itself
 * so the same default is correct (same origin).
 *
 * Browser: `NEXT_PUBLIC_*` env vars are inlined at build time by Next; the
 * value is replaced statically in `frontend/out/_next/static/...`. Setting it
 * at runtime requires rebuilding the static export.
 */
import axios from "axios";

import type {
  OllamaProviderModelsResponse,
  OpenAIProviderModelsResponse,
  ProviderBaseUrlResponse,
  VoicesResponse,
} from "@/lib/api-contract";

const baseURL = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL,
  // Allow 50 MB multipart bodies to land without axios erroring on default
  // 10 MB JSON limit. The chunked read in `routers/epubs.py` enforces the
  // 50 MB server-side cap (Plan 02).
  maxBodyLength: 60 * 1024 * 1024,
  maxContentLength: 60 * 1024 * 1024,
  // Short request timeout; the F1 @smoke scenario requires metadata within
  // 3s and the 120-chapter parse is <1s in practice. Anything beyond this
  // is a real hang.
  timeout: 30_000,
});

/**
 * D-07: `GET /api/v1/voices` — the SPA's voice catalog bootstrap.
 *
 * OpenAI voices are a fixed set; there is no per-language provider
 * endpoint to call. The response is a single flat
 * `{ voices: string[] }` envelope (no `language` query param —
 * per-language matching was retired when the canned provider
 * voices were dropped). The SPA renders the full list in the
 * voice dropdown.
 */
export async function listVoices(): Promise<VoicesResponse> {
  const url = "/voices";
  const response = await api.get<VoicesResponse>(url);
  return response.data;
}

/**
 * Phase 1 plan 04: `POST /api/v1/providers/ollama/models` with body
 * `{base_url}` — fetch the dynamic model catalog for the chosen
 * Ollama instance (BACK-05).
 *
 * The endpoint constructs the Ollama Python SDK client at request
 * time and returns the model catalog from the upstream. A 502 with
 * `error.code = "provider_unreachable"` means the upstream is
 * unreachable; the SDK's error message surfaces in
 * `details.provider_error`.
 */
export async function loadOllamaProviderModels(
  baseUrl: string,
): Promise<OllamaProviderModelsResponse> {
  const response = await api.post<OllamaProviderModelsResponse>("/providers/ollama/models", {
    base_url: baseUrl,
  });
  return response.data;
}

/**
 * Phase 1 plan 04: `POST /api/v1/providers/openai-compatible/models`
 * with body `{base_url, api_key}` — fetch the dynamic model catalog
 * for the chosen OpenAI-compatible endpoint (BACK-03).
 *
 * The endpoint constructs the OpenAI Python SDK client at request
 * time and returns the model catalog from the upstream. A 502 with
 * `error.code = "provider_unreachable"` means the upstream is
 * unreachable or returned an auth failure; the SDK's error message
 * surfaces in `details.provider_error`.
 *
 * The `api_key` is sent in the request body (NOT in a custom
 * `X-Provider-Key` header — that seam is retired with the legacy
 * GET endpoint in plan 01-01). The key is session-only; never
 * persisted; never logged by the backend (PRD §6).
 */
export async function loadOpenAIProviderModels(
  baseUrl: string,
  apiKey: string,
): Promise<OpenAIProviderModelsResponse> {
  const response = await api.post<OpenAIProviderModelsResponse>(
    "/providers/openai-compatible/models",
    { base_url: baseUrl, api_key: apiKey },
  );
  return response.data;
}

/**
 * Quick 260708-t1t: `GET /api/v1/providers/ollama/base-url` — fetch
 * the runtime-configured default Ollama base URL. The endpoint is
 * unauthenticated; the value is a public URL.
 */
export async function fetchOllamaBaseUrl(): Promise<ProviderBaseUrlResponse> {
  const response = await api.get<ProviderBaseUrlResponse>("/providers/ollama/base-url");
  return response.data;
}

/**
 * Quick 260708-t1t: `GET /api/v1/providers/openai-compatible/base-url`
 * — fetch the runtime-configured default OpenAI-compatible base
 * URL. The endpoint is unauthenticated; the value is a public URL.
 */
export async function fetchOpenAIBaseUrl(): Promise<ProviderBaseUrlResponse> {
  const response = await api.get<ProviderBaseUrlResponse>("/providers/openai-compatible/base-url");
  return response.data;
}
