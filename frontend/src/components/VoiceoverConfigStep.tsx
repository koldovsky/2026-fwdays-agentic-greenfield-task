"use client";

/**
 * VoiceoverConfigStep — voiceover configuration panel (D-16).
 *
 * Renders ONLY when the chooser state is `voiceover` (the parent
 * page gates the render via the URL `?workflow=...` value, per F2
 * Rule 1: irrelevant panels HIDDEN, not greyed-out).
 *
 * Mirrors the `TranslationConfigStep` shape but with NO translation
 * fields (no `provider`, no `model`, no `source_language` pickers,
 * no `target_language` picker) and NO provider/model select — the
 * backend Pydantic v2 `extra="forbid"` on `VoiceoverJobBody`
 * (F4-AC1 + D-15) rejects translation fields at parse time.
 *
 * Phase 1 plan 03: the voice-over form gains OpenAI Base URL + OpenAI
 * API key fields at the top of the form (same shape as the
 * translation form's provider-conditional fields), the "Source
 * language" label is renamed to "Voice-over Language", and the
 * language dropdown shows the full language name (e.g. "English (en)")
 * instead of just the ISO code. The Start Voice-Over button is
 * disabled until the Zod schema validates the form (mirror of the
 * translation form's gate from Plan 01).
 *
 * Submit: `useCreateJob.mutate({job_type: 'voiceover', epub_id, voice,
 * provider_base_url, provider_api_key})`; on success,
 * `router.push(\`/jobs?id=${jobId}\`)` renders the
 * `JobStatusPanel`. On `source_language_required` 422 (EPUB with
 * zero declared languages and no resolvable first-spine), an inline
 * `<NoticeBanner>` renders below the submit button.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CreateJobServerError, useCreateJob } from "@/hooks/useCreateJob";
import { useDefaultBaseUrls } from "@/hooks/useDefaultBaseUrls";
import { useEpubMetadata } from "@/hooks/useEpubMetadata";
import { useVoices } from "@/hooks/useVoices";
import { findLanguageName } from "@/lib/target_languages";
import { voiceoverConfigSchema } from "@/lib/voiceoverConfigSchema";

import { NoticeBanner } from "./NoticeBanner";

import "./VoiceoverConfigStep.css";

export interface VoiceoverConfigStepProps {
  epubId: string;
  onJobCreated?: (jobId: string) => void;
}

export function VoiceoverConfigStep({ epubId, onJobCreated }: VoiceoverConfigStepProps) {
  const router = useRouter();
  const metadata = useEpubMetadata(epubId);
  // Quick 260708-t1t: read the runtime default OpenAI base URL
  // from the new `useDefaultBaseUrls` react-query hook. The
  // `useState` initial value picks
  // `defaults.openaiBaseUrl ?? "<literal-fallback>"` so the form is
  // rendered with a mock-friendly URL while the fetch is in flight.
  const defaults = useDefaultBaseUrls();

  // D-08: resolve the source language from the EPUB metadata
  // (the backend router preflight does the same, but resolving
  // client-side avoids a 422 round-trip on the common path).
  const declaredLanguages: string[] = metadata.data?.declared_languages ?? [];
  const sourceLanguage = declaredLanguages[0] ?? "en"; // fallback for empty state
  // D-07: OpenAI voices are a fixed set; render the full catalog
  // (no per-language matching — the backend exposes a single flat
  // list via `GET /api/v1/voices`).
  const voicesQuery = useVoices();
  const voices = voicesQuery.data?.voices ?? [];
  const initialVoice = voices[0] ?? "alloy";
  const [voice, setVoice] = useState<string>(initialVoice);
  // Phase 1 plan 03: OpenAI provider config (same shape as the
  // translation form's provider-conditional fields). The base URL
  // default comes from `useDefaultBaseUrls()` (the runtime API
  // source); the user can override per-render. The values are
  // sent on submit (forward-compat with Plan 04's `HttpTTSAdapter`).
  const [providerBaseUrl, setProviderBaseUrl] = useState<string>(
    defaults.openaiBaseUrl ?? "https://api.openai.com/v1",
  );
  const [providerApiKey, setProviderApiKey] = useState<string>("");

  // Re-sync when the metadata loads (declaredLanguages transitions
  // from `[]` to the real list).
  useEffect(() => {
    setVoice(initialVoice);
  }, [initialVoice]);

  // Quick 260708-t1t: sync the local URL state when the runtime
  // default fetch resolves. The guard preserves a user-typed
  // value: the sync only fires when the current local value still
  // matches the literal fallback (i.e. the user has NOT typed a
  // custom value).
  useEffect(() => {
    if (defaults.openaiBaseUrl !== undefined && providerBaseUrl === "https://api.openai.com/v1") {
      setProviderBaseUrl(defaults.openaiBaseUrl);
    }
  }, [defaults.openaiBaseUrl, providerBaseUrl]);

  const { mutate, isPending, error, data } = useCreateJob();

  // Zod-validated form gate (Phase 1 plan 03). The schema enforces
  // non-empty base URL + API key + voiceover language + voice; the
  // gate button is `disabled` until the schema validates.
  const parsed = useMemo(
    () =>
      voiceoverConfigSchema.safeParse({
        provider: "openai-compatible",
        providerBaseUrl,
        providerApiKey,
        voiceoverLanguage: sourceLanguage,
        voice,
      }),
    [providerBaseUrl, providerApiKey, sourceLanguage, voice],
  );
  const noVoices = voices.length === 0;
  const isFormValid = parsed.success;
  const isStartDisabled = isPending || noVoices || !isFormValid;

  const handleSubmit = useCallback(() => {
    if (!isFormValid) {
      return;
    }
    mutate(
      {
        job_type: "voiceover",
        epub_id: epubId,
        voice,
        provider_base_url: providerBaseUrl,
        provider_api_key: providerApiKey,
      },
      {
        onSuccess: (response) => {
          onJobCreated?.(response.id);
          // Static-export friendly: the job id is passed via a query
          // param (not a dynamic segment) so the route is enumerated
          // at build time. See /jobs/page.tsx.
          router.push(`/jobs?id=${encodeURIComponent(response.id)}`);
        },
      },
    );
  }, [isFormValid, mutate, epubId, voice, providerBaseUrl, providerApiKey, onJobCreated, router]);

  // D-15: the backend raises 422 `source_language_required` for
  // voiceover preflight when the EPUB declares 0 languages AND no
  // first-spine chapter carries `xml:lang`. The mutation's `error`
  // is a typed `CreateJobServerError` with `.code`; the banner
  // surfaces the message.
  const errorCode = error instanceof CreateJobServerError ? error.code : null;
  const errorMessage = error instanceof CreateJobServerError ? error.message : null;

  return (
    <section
      id="voiceover-config"
      className="voiceover-config"
      data-testid="voiceover-config-step"
      data-voice={voice}
      aria-label="Voice-Over configuration"
    >
      <h2 className="voiceover-config__title">Voice-Over configuration</h2>

      <div className="voiceover-config__field">
        <label className="voiceover-config__label" htmlFor="voiceover-base-url">
          OpenAI Base URL
        </label>
        <input
          id="voiceover-base-url"
          type="url"
          required
          autoComplete="off"
          spellCheck={false}
          data-testid="voiceover-base-url"
          className="voiceover-config__input"
          value={providerBaseUrl}
          onChange={(e) => setProviderBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
        />
      </div>

      <div className="voiceover-config__field">
        <label className="voiceover-config__label" htmlFor="voiceover-api-key">
          OpenAI API key
        </label>
        <input
          id="voiceover-api-key"
          type="password"
          required
          autoComplete="off"
          spellCheck={false}
          data-testid="voiceover-api-key"
          className="voiceover-config__input"
          value={providerApiKey}
          onChange={(e) => setProviderApiKey(e.target.value)}
          placeholder="sk-…"
        />
      </div>

      <div className="voiceover-config__field" data-testid="voiceover-source-language-display">
        <span className="voiceover-config__label" data-testid="voiceover-language-label">
          Voice-over Language
        </span>
        <select
          className="voiceover-config__select"
          data-testid="voiceover-language-select"
          value={sourceLanguage}
          onChange={() => {
            /* read-only: source language is auto-resolved from EPUB */
          }}
          disabled
        >
          <option value={sourceLanguage}>
            {`${findLanguageName(sourceLanguage)} (${sourceLanguage})`}
          </option>
        </select>
        <p className="voiceover-config__hint">
          {noVoices
            ? `No TTS voices available for ${sourceLanguage}. Choose an EPUB that declares a supported language.`
            : "Auto-resolved from the EPUB's declared language(s)."}
        </p>
      </div>

      <div className="voiceover-config__field">
        <label className="voiceover-config__label" htmlFor="voiceover-voice-select">
          Voice
        </label>
        <select
          id="voiceover-voice-select"
          className="voiceover-config__select"
          data-testid="voiceover-voice-select"
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          disabled={noVoices}
        >
          {voices.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="voiceover-config__actions">
        <button
          type="button"
          className="btn btn--primary"
          data-testid="voiceover-submit-button"
          onClick={handleSubmit}
          disabled={isStartDisabled}
        >
          {isPending ? "Starting…" : "Start voice-over"}
        </button>
      </div>

      {errorCode === "source_language_required" ? (
        <NoticeBanner
          tone="error"
          message="The EPUB doesn't declare a language and no source could be resolved. Please pick an EPUB with a declared source language."
          testId="voiceover-source-language-required"
        />
      ) : null}

      {errorCode && errorCode !== "source_language_required" && errorMessage ? (
        <NoticeBanner tone="error" message={errorMessage} testId="voiceover-error-banner" />
      ) : null}
    </section>
  );
}
