"use client";

/**
 * ProviderModelSelect — provider (Ollama | OpenAI-compatible) + model
 * dropdown with dynamic backend-driven model loading (Phase 1 plan 04).
 *
 * F2 AC Rule 4:
 *  - "Choosing the Ollama provider lists its available models" — the
 *    model `<select>` is populated from
 *    `POST /api/v1/providers/ollama/models` with body `{base_url}`.
 *    The endpoint returns `{models: [{name, ...}, ...]}` from the
 *    Ollama Python client.
 *  - "Choosing an OpenAI-compatible provider requires an API key" — an
 *    inline key input is shown; the user clicks "Load Model List" and
 *    the SPA POSTs `{base_url, api_key}` to
 *    `POST /api/v1/providers/openai-compatible/models`. A 2xx
 *    response (200 with the model list) is the validation; a 502
 *    `provider_unreachable` renders the SDK's error message in the
 *    inline notice.
 *
 * Phase 1 plan 04 changes (BACK-03 + BACK-05):
 *  - The legacy GET-with-`X-Provider-Key` header shape is replaced
 *    with the new POST endpoints; the body carries `base_url` (and
 *    `api_key` for OpenAI-compatible).
 *  - The "Load Model List" button is disabled when the Base URL is
 *    empty (or the API key is empty for OpenAI-compatible); on click,
 *    it calls the matching POST endpoint and populates the model
 *    dropdown.
 *  - The "Provider API Key" warning chip (the legacy
 *    `notice for openai-compatible: no key entered`) is gone — the
 *    new form makes the key a required input.
 *
 * Phase 1 plan 02 changes (D-02 + D-03, preserved):
 *  - Default provider = "openai-compatible" (was "ollama").
 *  - API key change discards the loaded model list (useEffect + first-
 *    run ref skip).
 *  - Provider-conditional fields render immediately under the
 *    provider dropdown: Ollama → "Ollama Base URL" (text, mandatory);
 *    OpenAI → "OpenAI Base URL" (text, mandatory). The values are
 *    sent on `POST /api/v1/jobs` as `provider_base_url`.
 *
 * Quick 260708-t1t changes: the default base URLs come from the
 * new `useDefaultBaseUrls` react-query hook (which fetches
 * `GET /api/v1/providers/{ollama,openai-compatible}/base-url` at mount
 * time). The literal `"http://localhost:11434/v1"` /
 * `"https://api.openai.com/v1"` strings remain as the
 * initial-state fallback while the API fetch is in flight.
 */

import { useEffect, useId, useRef, useState } from "react";

import { useMutation } from "@tanstack/react-query";

import { useDefaultBaseUrls } from "@/hooks/useDefaultBaseUrls";
import { loadOllamaProviderModels, loadOpenAIProviderModels } from "@/lib/api";

export type ProviderId = "ollama" | "openai-compatible";

export interface ProviderModelSelectProps {
  provider: ProviderId;
  model: string;
  onProviderChange: (provider: ProviderId) => void;
  onModelChange: (model: string) => void;
  /** Pre-populated OpenAI API key (for re-render scenarios). */
  openaiApiKey?: string;
  onOpenaiApiKeyChange?: (key: string) => void;
  /**
   * Phase 1 plan 02: the user-chosen base URL for the provider. The
   * field is mandatory; the default is the buildtime constant
   * (D-06 mock-friendly URL). The parent (`TranslationConfigStep`)
   * reads the value and passes it to the request body.
   */
  ollamaBaseUrl?: string;
  onOllamaBaseUrlChange?: (url: string) => void;
  openaiBaseUrl?: string;
  onOpenaiBaseUrlChange?: (url: string) => void;
}

export function ProviderModelSelect({
  provider,
  model,
  onProviderChange,
  onModelChange,
  openaiApiKey = "",
  onOpenaiApiKeyChange,
  ollamaBaseUrl,
  onOllamaBaseUrlChange,
  openaiBaseUrl,
  onOpenaiBaseUrlChange,
}: ProviderModelSelectProps) {
  const providerId = useId();
  const modelId = useId();
  const apiKeyId = useId();
  const ollamaBaseUrlId = useId();
  const openaiBaseUrlId = useId();

  // Quick 260708-t1t: read the runtime defaults from the new
  // `useDefaultBaseUrls` react-query hook. The `useState` initial
  // value picks `defaults.X ?? "<literal-fallback>"` so the form is
  // rendered with a mock-friendly URL while the fetch is in flight
  // (and when the backend is unreachable).
  const defaults = useDefaultBaseUrls();
  const [localKey, setLocalKey] = useState(openaiApiKey);
  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  const [ollamaUrl, setOllamaUrl] = useState<string>(
    ollamaBaseUrl ?? defaults.ollamaBaseUrl ?? "http://localhost:11434/",
  );
  const [openaiUrl, setOpenaiUrl] = useState<string>(
    openaiBaseUrl ?? defaults.openaiBaseUrl ?? "https://api.openai.com/v1",
  );

  // Sync local URL state when (a) the parent changes the prop, or
  // (b) the runtime default base URL fetch resolves. The effect
  // guards against clobbering a user-typed value: the prop-sync
  // branch only fires when the prop is defined AND differs from
  // the current local value; the defaults-sync branch only fires
  // when the user has NOT typed a custom value (i.e. the current
  // local value still matches the initial-state default). The
  // dependency list intentionally omits `ollamaUrl` / `openaiUrl`
  // — the conditional inside compares against the current value,
  // so re-running on every local change would cause an infinite
  // loop.
  useEffect(() => {
    if (ollamaBaseUrl !== undefined && ollamaBaseUrl !== ollamaUrl) {
      setOllamaUrl(ollamaBaseUrl);
      return;
    }
    if (defaults.ollamaBaseUrl !== undefined && ollamaUrl === "http://localhost:11434/") {
      setOllamaUrl(defaults.ollamaBaseUrl);
    }
  }, [ollamaBaseUrl, defaults.ollamaBaseUrl, ollamaUrl]);
  useEffect(() => {
    if (openaiBaseUrl !== undefined && openaiBaseUrl !== openaiUrl) {
      setOpenaiUrl(openaiBaseUrl);
      return;
    }
    if (defaults.openaiBaseUrl !== undefined && openaiUrl === "https://api.openai.com/v1") {
      setOpenaiUrl(defaults.openaiBaseUrl);
    }
  }, [openaiBaseUrl, defaults.openaiBaseUrl, openaiUrl]);

  // Phase 1 plan 02: API key change discards the loaded model list
  // and forces a reload. The first render must NOT trigger the
  // discard (the initial state has no loaded models). The ref
  // gates the effect to subsequent renders.
  const isFirstKeyRenderRef = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `onModelChange` is intentionally omitted (stable from parent + would re-fire on every render).
  useEffect(() => {
    if (isFirstKeyRenderRef.current) {
      isFirstKeyRenderRef.current = false;
      return;
    }
    setLoadedModels([]);
    onModelChange("");
  }, [localKey]);

  // Mirror `openaiApiKey` prop changes (parent may re-render with a
  // new value from a saved-state restore path).
  useEffect(() => {
    setLocalKey(openaiApiKey);
  }, [openaiApiKey]);

  const loadModels = useMutation<{ models: Array<{ id?: string; name?: string }> }, Error>({
    mutationFn: async () => {
      // Phase 1 plan 04: the endpoint shape is per-provider. The
      // Ollama POST takes only `base_url`; the OpenAI-compatible
      // POST also takes `api_key`. The provider's `id` / `name`
      // discrimination happens at the model-dropdown level (the
      // SPA's model picker reads the matching field per provider).
      const effectiveBaseUrl = provider === "ollama" ? ollamaUrl : openaiUrl;
      // Normalize the wire shape (Ollama uses `name`, OpenAI uses
      // `id`) into a flat string list for the dropdown. The
      // branch-per-provider shape keeps TypeScript happy with the
      // discriminated union returned by the two `load*` helpers.
      if (provider === "ollama") {
        const response = await loadOllamaProviderModels(effectiveBaseUrl);
        return {
          models: response.models.map((m) => ({ name: m.name })),
        };
      }
      const response = await loadOpenAIProviderModels(effectiveBaseUrl, localKey);
      return {
        models: response.models.map((m) => ({ id: m.id })),
      };
    },
    onSuccess: (data) => {
      const flat = data.models.map((m) => m.id ?? m.name ?? "").filter((s) => s.length > 0);
      setLoadedModels(flat);
      // Auto-pick the first option so the form is one click away
      // from submittable (matches the previous Validate-button
      // behaviour — the user can override the pick).
      if (!model && flat.length > 0) {
        onModelChange(flat[0]);
      }
    },
  });

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as ProviderId;
    onProviderChange(next);
    // Reset the model selection when the provider changes — the
    // model list is provider-scoped and the previous selection is
    // invalid. The loaded list is also cleared (the keys won't
    // apply to the new provider).
    onModelChange("");
    setLoadedModels([]);
  };

  const handleClickLoadModels = () => {
    loadModels.mutate();
  };

  const handleOllamaBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setOllamaUrl(next);
    onOllamaBaseUrlChange?.(next);
  };

  const handleOpenaiBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setOpenaiUrl(next);
    onOpenaiBaseUrlChange?.(next);
  };

  // Surface the key to the parent on every change so the request
  // body can include it (forward-compat with Plan 04's
  // `HttpTranslationAdapter` which carries the key in the
  // `X-Provider-Key` header for the chat-completions call).
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalKey(next);
    onOpenaiApiKeyChange?.(next);
  };

  const ollamaModelOptions = provider === "ollama" ? loadedModels : [];
  const openaiModelOptions = provider === "openai-compatible" ? loadedModels : [];
  const modelOptions = provider === "ollama" ? ollamaModelOptions : openaiModelOptions;

  return (
    <div className="provider-model-select">
      <div className="provider-model-select__field">
        <label htmlFor={providerId} className="provider-model-select__label">
          Provider
        </label>
        <select
          id={providerId}
          data-testid="provider-select"
          className="provider-model-select__select"
          value={provider}
          onChange={handleProviderChange}
        >
          <option value="openai-compatible">OpenAI-compatible</option>
          <option value="ollama">Ollama</option>
        </select>
      </div>

      {provider === "ollama" ? (
        <div className="provider-model-select__field provider-model-select__base-url-field">
          <label htmlFor={ollamaBaseUrlId} className="provider-model-select__label">
            Ollama Base URL
          </label>
          <input
            id={ollamaBaseUrlId}
            type="url"
            required
            data-testid="base-url-input"
            className="provider-model-select__input"
            value={ollamaUrl}
            onChange={handleOllamaBaseUrlChange}
            placeholder="http://localhost:11434/"
          />
        </div>
      ) : (
        <div className="provider-model-select__field provider-model-select__base-url-field">
          <label htmlFor={openaiBaseUrlId} className="provider-model-select__label">
            OpenAI Base URL
          </label>
          <input
            id={openaiBaseUrlId}
            type="url"
            required
            data-testid="base-url-input"
            className="provider-model-select__input"
            value={openaiUrl}
            onChange={handleOpenaiBaseUrlChange}
            placeholder="https://api.openai.com/v1"
          />
        </div>
      )}

      {provider === "openai-compatible" ? (
        <div className="provider-model-select__apikey" data-testid="openai-apikey-form">
          <label htmlFor={apiKeyId} className="provider-model-select__label">
            OpenAI API key
          </label>
          <div className="provider-model-select__apikey-row">
            <input
              id={apiKeyId}
              type="password"
              autoComplete="off"
              spellCheck={false}
              data-testid="openai-apikey-input"
              className="provider-model-select__input"
              value={localKey}
              onChange={handleApiKeyChange}
              placeholder="sk-…"
            />
          </div>
        </div>
      ) : null}

      <div className="provider-model-select__field">
        <label htmlFor={modelId} className="provider-model-select__label">
          Model
        </label>
        <div className="provider-model-select__load-models-row">
          <select
            id={modelId}
            data-testid="model-select"
            className="provider-model-select__select"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={
              (provider === "openai-compatible" && loadedModels.length === 0) ||
              (provider === "ollama" && loadedModels.length === 0)
            }
          >
            <option value="">
              {modelOptions.length === 0 ? "Click 'Load Model List' to fetch" : "Select a model"}
            </option>
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--tertiary"
            data-testid="load-model-list"
            disabled={
              loadModels.isPending || (provider === "openai-compatible" && !localKey.trim())
            }
            onClick={handleClickLoadModels}
          >
            {loadModels.isPending ? "Loading…" : "Load Model List"}
          </button>
          {loadModels.isPending ? (
            <span className="spinner" data-testid="load-models-spinner" />
          ) : null}
        </div>
        {loadModels.isError ? (
          <p className="provider-model-select__error" role="alert" data-testid="load-models-error">
            {loadModels.error.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
